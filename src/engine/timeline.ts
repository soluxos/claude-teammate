// Builds the flat, absolute timeline from the script and plays it against a clock.

import {
  DEFAULT_GAP,
  WORDS_PER_MINUTE,
  sceneNames,
  spokenWords,
  type At,
  type Line,
  type Segment,
} from '../script/script';
import { apply, expand, initialState, type CanvasState, type TimedPrim } from './state';

export type WordTiming = { word: string; start: number; end: number }; // seconds from line start
export type LineTiming = { duration: number; words: WordTiming[]; hasAudio: boolean };

export type BuiltSegment = { seg: Segment; start: number; end: number };
export type BuiltLine = { line: Line; start: number; end: number; words: WordTiming[]; hasAudio: boolean };

export type Timeline = {
  segments: BuiltSegment[];
  lines: BuiltLine[];
  prims: TimedPrim[];
  scenes: { index: number; name: string; start: number }[];
  starts: Record<string, number>; // segment id -> absolute start
  gate: number; // start of scene 1: playback waits here for "Start working session"
  total: number;
};

const norm = (w: string) => w.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9']/g, '');

/** Reading-pace timing, used when a line has no audio or no alignment. */
export function estimateTiming(text: string, duration?: number): LineTiming {
  const words = spokenWords(text);
  const total = duration ?? Math.max(1.2, (words.length / WORDS_PER_MINUTE) * 60);
  // Longer words and sentence ends take a little longer.
  const weights = words.map((w) => w.length + 2 + (/[.?!:]$/.test(w) ? 5 : /,$/.test(w) ? 2 : 0));
  const sum = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  const timings = words.map((word, i) => {
    const start = (acc / sum) * total;
    acc += weights[i];
    return { word, start, end: (acc / sum) * total };
  });
  return { duration: total, words: timings, hasAudio: false };
}

function resolveAt(at: At, words: WordTiming[], id: string): number {
  if ('offset' in at) return at.offset;
  const target = norm(at.word);
  let seen = 0;
  for (const w of words) {
    if (norm(w.word) === target && ++seen === (at.occurrence ?? 1)) return w.start + (at.plus ?? 0);
  }
  console.warn(`[script] ${id}: word "${at.word}" (occurrence ${at.occurrence ?? 1}) not found`);
  return at.plus ?? 0;
}

export function buildTimeline(script: Segment[], timings: Record<string, LineTiming> = {}): Timeline {
  const segments: BuiltSegment[] = [];
  const lines: BuiltLine[] = [];
  const prims: TimedPrim[] = [];
  const scenes: Timeline['scenes'] = [];
  const starts: Record<string, number> = {};
  let clock = 0;
  let seq = 0;

  for (const seg of script) {
    let words: WordTiming[] = [];
    let start: number;
    let end: number;
    const sceneStart = clock;
    if (seg.kind === 'line') {
      const timing = timings[seg.id] ?? estimateTiming(seg.text);
      start = clock + (seg.gapBefore ?? DEFAULT_GAP);
      end = start + timing.duration;
      words = timing.words;
      lines.push({ line: seg, start, end, words, hasAudio: timing.hasAudio });
    } else {
      start = clock;
      end = start + seg.duration;
    }
    if (!scenes.some((s) => s.index === seg.scene)) scenes.push({ index: seg.scene, name: sceneNames[seg.scene], start: sceneStart });
    segments.push({ seg, start, end });
    starts[seg.id] = start;
    (seg.events ?? []).forEach((ev, i) => {
      const t = start + resolveAt(ev.at, words, seg.id);
      for (const e of expand(ev.action, t, `${seg.id}#${i}`)) prims.push({ t: e.t, seq: seq++, prim: e.prim });
    });
    clock = end;
  }
  prims.sort((a, b) => a.t - b.t || a.seq - b.seq);
  return { segments, lines, prims, scenes, starts, gate: scenes[1]?.start ?? 0, total: clock };
}

/** Canvas state at time t: reset, then replay every primitive up to t. */
export function stateAt(tl: Timeline, t: number): { state: CanvasState; index: number } {
  let state = initialState();
  let index = 0;
  while (index < tl.prims.length && tl.prims[index].t <= t) state = apply(state, tl.prims[index++].prim);
  return { state, index };
}

export type Snapshot = {
  state: CanvasState;
  playing: boolean;
  speed: number;
  instant: boolean; // true right after a seek: render without animating
  captions: boolean;
  atGate: boolean;
  ended: boolean;
};

export interface ClockSource {
  /** Called every frame. Returns the audio's idea of "now" for the line, if it is actually playing. */
  sync(line: BuiltLine | null, t: number, playing: boolean, speed: number): number | null;
  unlock(): void;
}

const GATE_EPS = 0.02;

export class Player {
  t = 0;
  private index = 0;
  private last = 0;
  private raf = 0;
  private timeSubs = new Set<() => void>();
  private snapSubs = new Set<() => void>();
  snapshot: Snapshot;

  constructor(
    public timeline: Timeline,
    private audio: ClockSource,
  ) {
    this.snapshot = { state: initialState(), playing: false, speed: 1, instant: true, captions: true, atGate: false, ended: false };
    this.seek(0);
  }

  start() {
    this.last = performance.now();
    const loop = (now: number) => {
      this.tick(now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() {
    cancelAnimationFrame(this.raf);
    this.audio.sync(null, this.t, false, 1);
  }

  subscribeTime = (fn: () => void) => (this.timeSubs.add(fn), () => void this.timeSubs.delete(fn));
  subscribeSnap = (fn: () => void) => (this.snapSubs.add(fn), () => void this.snapSubs.delete(fn));
  getTime = () => this.t;
  getSnap = () => this.snapshot;

  private set(patch: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.snapSubs.forEach((fn) => fn());
  }
  private flags() {
    const gate = this.timeline.gate;
    return { atGate: Math.abs(this.t - (gate - GATE_EPS)) < 1e-6, ended: this.t >= this.timeline.total };
  }

  lineAt(t: number): BuiltLine | null {
    return this.timeline.lines.find((l) => t >= l.start && t < l.end) ?? null;
  }
  sceneAt(t: number) {
    const scenes = this.timeline.scenes;
    let current = scenes[0];
    for (const s of scenes) if (t >= s.start - 1e-6) current = s;
    return current;
  }

  private tick(now: number) {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const { playing, speed, state } = this.snapshot;
    const line = this.lineAt(this.t);
    const audioNow = this.audio.sync(line, this.t, playing, speed);
    if (!playing) return;

    let next = this.t + dt * speed;
    // Audio is the master clock while a line is sounding: lean towards it.
    if (audioNow !== null && Math.abs(audioNow - next) < 0.3) next += (audioNow - next) * 0.2;

    const gate = this.timeline.gate - GATE_EPS;
    let stop = false;
    if (this.t < gate && next >= gate) {
      next = gate; // wait for "Start working session"
      stop = true;
    }
    if (next >= this.timeline.total) {
      next = this.timeline.total;
      stop = true;
    }
    this.t = next;

    let s = state;
    const prims = this.timeline.prims;
    while (this.index < prims.length && prims[this.index].t <= next) s = apply(s, prims[this.index++].prim);
    if (s !== state || stop) this.set({ state: s, instant: false, playing: !stop, ...this.flags() });
    this.timeSubs.forEach((fn) => fn());
  }

  seek(t: number) {
    this.t = Math.max(0, Math.min(this.timeline.total, t));
    const { state, index } = stateAt(this.timeline, this.t);
    this.index = index;
    this.set({ state, instant: true, ...this.flags() });
    this.timeSubs.forEach((fn) => fn());
  }

  play() {
    this.audio.unlock();
    if (this.t >= this.timeline.total) this.seek(0);
    this.last = performance.now();
    this.set({ playing: true, ...this.flags() });
  }
  pause() {
    this.set({ playing: false });
  }
  toggle() {
    this.snapshot.playing ? this.pause() : this.play();
  }
  restart() {
    this.seek(0);
    this.play();
  }
  /** The "Start working session" button: the gesture that unlocks audio. */
  startSession() {
    this.audio.unlock();
    this.seek(this.timeline.gate);
    this.play();
  }
  setSpeed(speed: number) {
    this.set({ speed });
  }
  setCaptions(captions: boolean) {
    this.set({ captions });
  }
  jumpScene(dir: 1 | -1) {
    const scenes = this.timeline.scenes;
    const i = scenes.indexOf(this.sceneAt(this.t));
    if (dir === 1) {
      if (i < scenes.length - 1) this.seek(scenes[i + 1].start);
    } else {
      this.seek(this.t - scenes[i].start > 1.5 || i === 0 ? scenes[i].start : scenes[i - 1].start);
    }
  }
}
