// Audio queue, analyser and alignment lookups.
// Every line has its own preloaded <audio> element, so speakers hand over without a gap or a jump.

import audioIndex from 'virtual:audio-index';
import { spokenWords, type Line, type Speaker } from '../script/script';
import { estimateTiming, type BuiltLine, type ClockSource, type LineTiming, type WordTiming } from './timeline';

const BASE = `${import.meta.env.BASE_URL}audio/`;
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

/** One line of speech: its own preloaded element, so it can start instantly and overlap its neighbours. */
type Voice = {
  el: HTMLAudioElement;
  speaker: Speaker;
  length: number; // seconds of audio in the file
  start: number; // where the line sits on the timeline
  gain: number; // brings the line to the shared loudness, measured at build time
  primed: boolean;
  priming: boolean;
  startedAt: number;
  done: boolean;
};

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
  private voices: Record<string, Voice> = {};
  private analysers: Partial<Record<Speaker, AnalyserNode>> = {};
  private samples = new Uint8Array(512);
  private master: GainNode | null = null;
  private unlocked = false;
  private lastT = 0;
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
        const el = new Audio(URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' })));
        el.preload = 'auto';
        this.voices[line.id] = { el, speaker: line.speaker, length: duration, start: 0, gain: 1, primed: false, priming: false, startedAt: 0, done: false };
        const hasJson = (override ? audioIndex.overrideAligned : audioIndex.aligned).includes(line.id);
        const aligned = hasJson ? await fetchWords(`${dir}${line.id}.json`) : null;
        // Alignment must match the script's words one for one, or word anchors would drift.
        const usable = aligned && aligned.words.length === spokenWords(line.text).length;
        if (aligned?.gainDb) this.voices[line.id].gain = 10 ** (aligned.gainDb / 20);
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

  /** Tells each voice where its line sits on the timeline. */
  prepare(lines: BuiltLine[]) {
    for (const line of lines) {
      const v = this.voices[line.line.id];
      if (v) v.start = line.start;
    }
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
        // One analyser per speaker, before the volume control, so the voice rings ignore the volume.
        for (const who of ['callum', 'agent'] as const) {
          const analyser = (this.analysers[who] = ctx.createAnalyser());
          analyser.fftSize = 512;
          analyser.connect(limiter);
        }
        for (const v of Object.values(this.voices)) {
          const gain = ctx.createGain();
          gain.gain.value = v.gain;
          ctx.createMediaElementSource(v.el).connect(gain).connect(this.analysers[v.speaker]!);
        }
      }
      if (this.ctx.state !== 'running') void this.ctx.resume().then(() => (this.unlocked = true)).catch(() => {});
      else this.unlocked = true;
      // Playing each element once, muted, inside the gesture lets it start later without one (Safari).
      for (const v of Object.values(this.voices)) {
        if (v.primed || v.priming || !v.el.paused) continue;
        v.priming = true;
        v.el.muted = true;
        v.el
          .play()
          .then(() => {
            v.el.pause();
            v.el.currentTime = 0;
            v.primed = true;
          })
          .catch(() => {})
          .finally(() => {
            v.el.muted = false;
            v.priming = false;
          });
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

  /**
   * Starts and stops voices so each one sounds for the whole length of its file from its line's start.
   * A line's tail is never cut when the next speaker begins: it simply plays out underneath.
   */
  sync(lines: BuiltLine[], t: number, playing: boolean, speed: number): number | null {
    const newest = lines[lines.length - 1]?.line.id;
    const now = performance.now();
    // A jump in time means the viewer scrubbed or skipped: every line may need to sound again from a new point.
    const jumped = Math.abs(t - this.lastT) > 0.4;
    this.lastT = t;
    let master: number | null = null;
    for (const [id, v] of Object.entries(this.voices)) {
      const { el } = v;
      const local = t - v.start;
      if (jumped) v.done = false;
      if (!playing || !this.unlocked || local < 0 || local >= v.length) {
        if (!el.paused && !v.priming) el.pause();
        v.done = false;
        continue;
      }
      if (v.priming || v.done) continue;
      if (el.paused || el.ended) {
        // Finished on its own just before the timeline reached its end: nothing left to play.
        if (el.ended && !jumped && local > v.length - 0.3) {
          v.done = true;
          continue;
        }
        // Already preloaded, so this starts within a few milliseconds. Only seek when the position is off,
        // which is always the case after a scrub (an ended element sits at its end).
        if (Math.abs(el.currentTime - local) > 0.04) el.currentTime = local;
        el.playbackRate = speed;
        el.play().catch(() => {});
        v.startedAt = now;
        continue;
      }
      if (el.playbackRate !== speed) el.playbackRate = speed;
      // Only a scrub moves the audio. In normal play the timeline follows the audio instead.
      if (jumped || (now - v.startedAt > 600 && Math.abs(el.currentTime - local) > 0.3)) el.currentTime = local;
      else if (id === newest && el.readyState >= 3 && el.currentTime > 0) master = v.start + el.currentTime;
    }
    return master;
  }

  /** Current loudness of a line, 0 to 1, or null when its audio is not actually sounding. */
  level(line: BuiltLine): number | null {
    const v = this.voices[line.line.id];
    const analyser = this.analysers[line.line.speaker];
    if (!v || !analyser || v.el.paused) return null;
    analyser.getByteTimeDomainData(this.samples);
    let sum = 0;
    for (const x of this.samples) sum += ((x - 128) / 128) ** 2;
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
