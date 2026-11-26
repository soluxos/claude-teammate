import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayer, useSnap, useTime } from '../../engine/context';
import type { BuiltLine, WordTiming } from '../../engine/timeline';
import { splitDirection } from '../../script/script';

const NAMES = { callum: 'Callum', agent: 'Claude' } as const;
// About two lines at caption size. Chunks are built to fit, so the two-line clamp never hides a word.
const MAX_WORDS = 20;
const PAD_X = 18;
const PAD_Y = 10;

/**
 * Splits a line into caption-sized chunks of at most two lines. Words fill a chunk as they are said;
 * when it is full, the next chunk starts on a clean box, so the caption never grows past two lines.
 * Whole sentences are grouped while they fit; a longer one is cut into even pieces, at a comma where there is one nearby.
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
    if (prev && prev.length + sentence.length <= MAX_WORDS) prev.push(...sentence);
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
  return (
    <div className="captions-dock">
      <AnimatePresence>{captions && line && <CaptionBox key="captions" line={line} t={t} />}</AnimatePresence>
    </div>
  );
}

/**
 * One box for the whole call: it stays up between lines and changes speaker in place.
 * The text is laid out at its natural width, then the box eases to that size, so a new word or a
 * new line grows the bar smoothly instead of snapping it.
 */
function CaptionBox({ line, t }: { line: BuiltLine; t: number }) {
  const chunks = useMemo(() => phrases(line.words), [line]);
  const text = useRef<HTMLParagraphElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  const local = t - line.start;
  const { direction } = splitDirection(line.line.text);
  let current = -1;
  line.words.forEach((w, i) => {
    if (local >= w.start) current = i;
  });
  const chunk = chunks.find((c) => c.includes(current)) ?? chunks[0] ?? [];
  const shown = chunk.filter((i) => i <= current);

  useLayoutEffect(() => {
    const el = text.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (!size || size.w !== w || size.h !== h) setSize({ w, h });
  });

  return (
    <motion.div
      className={`captions ${line.line.speaker}`}
      aria-live="off"
      style={size ? { width: size.w + PAD_X * 2, height: size.h + PAD_Y * 2 } : undefined}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
    >
      <p ref={text}>
        <span className="caption-name">{NAMES[line.line.speaker]}</span>
        {direction && chunk === chunks[0] && <em>({direction}) </em>}
        {/* Live captions: a word appears once it has been said, never before. */}
        {shown.map((i) => (
          <span key={`${line.line.id}-${i}`} className={i === current ? 'word now' : 'word'}>
            {line.words[i].word}{' '}
          </span>
        ))}
      </p>
    </motion.div>
  );
}
