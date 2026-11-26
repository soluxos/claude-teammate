import { useMemo } from 'react';
import { usePlayer, useSnap, useTime } from '../../engine/context';
import type { WordTiming } from '../../engine/timeline';
import { splitDirection } from '../../script/script';

const NAMES = { callum: 'Callum', agent: 'Claude' } as const;
const MAX_WORDS = 9;

/**
 * Splits a line into short phrases, the way live captions do, so only a few words are on screen at once.
 * Sentences stay whole when they fit; longer ones are cut into even pieces, at a comma where there is one nearby.
 * Very short sentences ("Honestly?") join their neighbour so nothing flashes up on its own.
 */
function phrases(words: WordTiming[]): number[][] {
  const sentences: number[][] = [];
  let cur: number[] = [];
  words.forEach((w, i) => {
    cur.push(i);
    if (/[.?!…—]$/.test(w.word)) {
      sentences.push(cur);
      cur = [];
    }
  });
  if (cur.length) sentences.push(cur);

  const merged: number[][] = [];
  for (const sentence of sentences) {
    const prev = merged[merged.length - 1];
    if (prev && (prev.length < 3 || (prev.length + sentence.length <= MAX_WORDS && (prev.length < 4 || sentence.length < 3)))) prev.push(...sentence);
    else merged.push([...sentence]);
  }

  const out: number[][] = [];
  for (const chunk of merged) {
    let rest = chunk;
    while (rest.length > MAX_WORDS) {
      const pieces = Math.ceil(rest.length / MAX_WORDS);
      const target = Math.ceil(rest.length / pieces);
      let cut = target;
      for (const d of [0, 1, -1, 2, -2, 3, -3]) {
        const k = target + d;
        if (k >= 3 && k <= MAX_WORDS && k < rest.length - 2 && /[,;:]$/.test(words[rest[k - 1]].word)) {
          cut = k;
          break;
        }
      }
      out.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    out.push(rest);
  }
  return out;
}

export function Captions() {
  const player = usePlayer();
  const t = useTime();
  const { captions } = useSnap();
  // Hold the caption briefly after the line ends so it does not flicker between lines.
  // During an interruption the newer line takes over.
  const line = player.linesAt(t, 0.35).pop();
  const chunks = useMemo(() => (line ? phrases(line.words) : []), [line]);
  if (!captions || !line) return null;
  const local = t - line.start;
  const { direction } = splitDirection(line.line.text);
  let current = -1;
  line.words.forEach((w, i) => {
    if (local >= w.start) current = i;
  });
  const chunk = chunks.find((c) => c.includes(current)) ?? chunks[0] ?? [];
  return (
    <div className={`captions ${line.line.speaker}`} aria-live="off">
      <span className="caption-name">{NAMES[line.line.speaker]}</span>
      <p>
        {direction && chunk === chunks[0] && <em>({direction}) </em>}
        {chunk.map((i) => (
          <span key={i} className={i === current ? 'now' : i < current ? 'said' : undefined}>
            {line.words[i].word}{' '}
          </span>
        ))}
      </p>
    </div>
  );
}
