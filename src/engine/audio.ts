// Audio queue, analyser and alignment lookups.
// Two <audio> elements are reused for every line, so a single user gesture unlocks sound in every browser.

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

async function fetchWords(url: string): Promise<{ duration?: number; words: WordTiming[]; gainDb?: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return null;
    const data = await res.json();
    return Array.isArray(data.words) ? data : null;
  } catch {
    return null;
  }
}

type Channel = { el: HTMLAudioElement; analyser: AnalyserNode; gain: GainNode; samples: Uint8Array<ArrayBuffer>; id: string | null };

const VOLUME_KEY = 'working-session-volume';
function storedVolume(): number {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY) ?? '1');
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1;
  } catch {
    return 1;
  }
}

export class AudioEngine implements ClockSource {
  private ctx: AudioContext | null = null;
  // Two channels, used by alternate lines, so an interrupting line can sound over the one it cuts off.
  private channels: Channel[] = [];
  private urls: Record<string, string> = {};
  // Per-line gain that brings every line to the same loudness, measured at build time.
  private lineGain: Record<string, number> = {};
  private master: GainNode | null = null;
  private unlocked = false;
  /** Playback volume, 0 to 1. Remembered between visits. */
  volume = storedVolume();
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
        if (aligned?.gainDb) this.lineGain[line.id] = 10 ** (aligned.gainDb / 20);
        // A line ends shortly after its last word, so trailing silence in the file costs no time
        // and an interruption lands on speech.
        if (usable) duration = Math.min(duration, aligned.words[aligned.words.length - 1].end + 0.2);
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
        const ctx = (this.ctx = new Ctx());
        const master = (this.master = ctx.createGain());
        master.gain.value = this.volume;
        // A limiter, so lines boosted to match the other voice cannot clip on their loudest peaks.
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -2;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.002;
        limiter.release.value = 0.08;
        limiter.connect(master);
        master.connect(ctx.destination);
        this.channels = [0, 1].map(() => {
          const el = new Audio();
          el.preload = 'auto';
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          // The analyser sits before the gains, so the voice rings do not shrink when the volume is turned down.
          const gain = ctx.createGain();
          ctx.createMediaElementSource(el).connect(analyser);
          analyser.connect(gain).connect(limiter);
          return { el, analyser, gain, samples: new Uint8Array(512), id: null };
        });
      }
      if (this.ctx.state !== 'running') void this.ctx.resume().then(() => (this.unlocked = true)).catch(() => {});
      else this.unlocked = true;
      // Playing each element once inside the gesture lets it play later without one.
      for (const ch of this.channels) {
        if (ch.id) continue;
        ch.el.src = SILENCE;
        ch.el.play().catch(() => {});
      }
    } catch {
      // No audio support: the performance runs on estimated timing.
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    try {
      localStorage.setItem(VOLUME_KEY, String(this.volume));
    } catch {
      // Private browsing: the setting just lasts for this visit.
    }
  }

  sync(lines: BuiltLine[], t: number, playing: boolean, speed: number): number | null {
    let master: number | null = null;
    this.channels.forEach((ch, i) => {
      const line = lines.filter((l) => l.index % 2 === i).pop() ?? null;
      const now = this.syncChannel(ch, line, t, playing, speed);
      if (line && line === lines[lines.length - 1]) master = now;
    });
    return master;
  }

  private syncChannel(ch: Channel, line: BuiltLine | null, t: number, playing: boolean, speed: number): number | null {
    const { el } = ch;
    const url = line ? this.urls[line.line.id] : undefined;
    if (!playing || !line || !url || !this.unlocked) {
      if (!el.paused) el.pause();
      if (!line || !url) ch.id = null;
      return null;
    }
    const local = t - line.start;
    if (ch.id !== line.line.id) {
      ch.id = line.line.id;
      ch.gain.gain.value = this.lineGain[line.line.id] ?? 1;
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

  /** Current loudness of a line, 0 to 1, or null when its audio is not actually sounding. */
  level(line: BuiltLine): number | null {
    const ch = this.channels[line.index % 2];
    if (!ch || ch.id !== line.line.id || ch.el.paused) return null;
    ch.analyser.getByteTimeDomainData(ch.samples);
    let sum = 0;
    for (const v of ch.samples) sum += ((v - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / ch.samples.length) * 5);
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
