// Audio queue, analyser and alignment lookups.
// One <audio> element is reused for every line so a single user gesture unlocks it in every browser.

import audioIndex from 'virtual:audio-index';
import { spokenWords, type Line } from '../script/script';
import { estimateTiming, type BuiltLine, type ClockSource, type LineTiming, type WordTiming } from './timeline';

const BASE = `${import.meta.env.BASE_URL}audio/`;
const SILENCE =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

async function fetchAudio(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || type.includes('text/html')) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

async function fetchWords(url: string): Promise<{ duration?: number; words: WordTiming[] } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return null;
    const data = await res.json();
    return Array.isArray(data.words) ? data : null;
  } catch {
    return null;
  }
}

export class AudioEngine implements ClockSource {
  private ctx: AudioContext | null = null;
  private el: HTMLAudioElement | null = null;
  private analyser: AnalyserNode | null = null;
  private samples = new Uint8Array(512);
  private urls: Record<string, string> = {};
  private currentId: string | null = null;
  private tone: GainNode | null = null;
  private unlocked = false;
  /** 'none' | 'partial' | 'full' once load() has run. */
  coverage: 'none' | 'partial' | 'full' = 'none';

  /** Finds audio and alignment for each line. Missing files simply fall back to estimated timing. */
  async load(lines: Line[]): Promise<Record<string, LineTiming>> {
    const decoder = typeof OfflineAudioContext !== 'undefined' ? new OfflineAudioContext(1, 1, 44100) : null;
    const timings: Record<string, LineTiming> = {};
    await Promise.all(
      lines.map(async (line) => {
        const override = audioIndex.overrides.includes(line.id);
        const generated = audioIndex.generated.includes(line.id);
        if ((!override && !generated) || !decoder) return;
        const dir = override ? `${BASE}override/` : BASE;
        const bytes = await fetchAudio(`${dir}${line.id}.mp3`);
        if (!bytes) return;
        let duration: number;
        try {
          duration = (await decoder.decodeAudioData(bytes.slice(0))).duration;
        } catch {
          return;
        }
        this.urls[line.id] = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
        const hasJson = (override ? audioIndex.overrideAligned : audioIndex.aligned).includes(line.id);
        const aligned = hasJson ? await fetchWords(`${dir}${line.id}.json`) : null;
        // Alignment must match the script's words one for one, or word anchors would drift.
        const usable = aligned && aligned.words.length === spokenWords(line.text).length;
        timings[line.id] = usable
          ? { duration, words: aligned.words, hasAudio: true }
          : { ...estimateTiming(line.text, duration), hasAudio: true };
      }),
    );
    const have = Object.keys(timings).length;
    this.coverage = have === 0 ? 'none' : have === lines.length ? 'full' : 'partial';
    return timings;
  }

  /** Must be called from a user gesture. Safe to call repeatedly. */
  unlock() {
    try {
      if (!this.ctx) {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new Ctx();
        this.el = new Audio();
        this.el.preload = 'auto';
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 512;
        this.ctx.createMediaElementSource(this.el).connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
        this.startRoomTone(this.ctx);
      }
      if (this.ctx.state !== 'running') void this.ctx.resume().then(() => (this.unlocked = true)).catch(() => {});
      else this.unlocked = true;
      if (this.el && !this.currentId) {
        this.el.src = SILENCE;
        this.el.play().catch(() => {});
      }
    } catch {
      // No audio support: the performance runs on estimated timing.
    }
  }

  /** A very quiet bed of filtered noise so silences in the session do not feel dead. */
  private startRoomTone(ctx: AudioContext) {
    const seconds = 4;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; // brown-ish noise
      data[i] = last * 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 520;
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 70;
    this.tone = ctx.createGain();
    this.tone.gain.value = 0;
    src.connect(low).connect(high).connect(this.tone).connect(ctx.destination);
    src.start();
  }

  sync(line: BuiltLine | null, t: number, playing: boolean, speed: number, inSession: boolean): number | null {
    const { el, ctx } = this;
    if (this.tone && ctx) this.tone.gain.setTargetAtTime(playing && inSession ? 0.05 : 0, ctx.currentTime, 0.4);
    if (!el) return null;
    const url = line ? this.urls[line.line.id] : undefined;
    if (!playing || !line || !url || !this.unlocked) {
      if (!el.paused) el.pause();
      if (!line || !url) this.currentId = null;
      return null;
    }
    const local = t - line.start;
    if (this.currentId !== line.line.id) {
      this.currentId = line.line.id;
      el.src = url;
      el.currentTime = local;
      el.playbackRate = speed;
      el.play().catch(() => {});
      return null;
    }
    if (el.playbackRate !== speed) el.playbackRate = speed;
    if (el.ended) return null;
    if (el.paused) {
      el.currentTime = local;
      el.play().catch(() => {});
      return null;
    }
    if (Math.abs(el.currentTime - local) > 0.3) {
      el.currentTime = local; // the timeline was scrubbed
      return null;
    }
    return el.readyState >= 3 ? line.start + el.currentTime : null;
  }

  /** Current loudness of the playing line, 0 to 1, or null when no real audio is sounding. */
  level(): number | null {
    if (!this.analyser || !this.el || this.el.paused || !this.currentId) return null;
    this.analyser.getByteTimeDomainData(this.samples);
    let sum = 0;
    for (const v of this.samples) sum += ((v - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / this.samples.length) * 5);
  }
}

/** Stand-in loudness when there is no audio: a syllable-ish wobble while a word is being "spoken". */
export function syntheticLevel(line: BuiltLine, t: number): number {
  const local = t - line.start;
  const word = line.words.find((w) => local >= w.start && local < w.end);
  if (!word) return 0;
  const p = (local - word.start) / Math.max(0.05, word.end - word.start);
  return Math.max(0, Math.sin(p * Math.PI)) * (0.45 + 0.4 * Math.abs(Math.sin(local * 9.3)));
}
