import { useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayer, useSnap, useTime } from '../../engine/context';
import type { BuiltLine } from '../../engine/timeline';
import { splitDirection } from '../../script/script';

const NAMES = { callum: 'Callum', agent: 'Claude' } as const;
const PAD_X = 18;
const PAD_Y = 10;
const MAX_LINES = 2;

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
 * Live captions, as a call app shows them. Nothing is known ahead: words are added as they are said,
 * and once there are more than two lines the older ones roll up out of view.
 * The bar fits a short answer while it is still on one line; once a turn wraps, the bar is at full
 * width and holds still while lines roll up inside it.
 */
function CaptionBox({ line, t }: { line: BuiltLine; t: number }) {
  const text = useRef<HTMLParagraphElement>(null);
  const [size, setSize] = useState<{ w: number; h: number; lh: number } | null>(null);

  const local = t - line.start;
  const { direction } = splitDirection(line.line.text);
  const said = line.words.filter((w) => local >= w.start);

  useLayoutEffect(() => {
    const el = text.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 23;
    if (!size || size.w !== w || size.h !== h || size.lh !== lh) setSize({ w, h, lh });
  });

  const lines = size ? Math.max(1, Math.round(size.h / size.lh)) : 1;
  const viewH = size ? Math.min(lines, MAX_LINES) * size.lh : undefined;
  const roll = size && viewH ? Math.max(0, size.h - viewH) : 0;

  return (
    <motion.div
      className={`captions ${line.line.speaker}`}
      aria-live="off"
      style={size && viewH ? { width: size.w + PAD_X * 2, height: viewH + PAD_Y * 2 } : undefined}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
    >
      <div className="captions-view" style={size && viewH ? { width: size.w, height: viewH } : undefined}>
        {/* Keyed by line, so a new speaker starts a fresh block rather than rolling the old one away. */}
        <p key={line.line.id} ref={text} style={{ transform: `translateY(${-roll}px)` }}>
          <span className="caption-name">{NAMES[line.line.speaker]}</span>
          {direction && <em>({direction}) </em>}
          {said.map((w, i) => (
            <span key={i} className="word">
              {w.word}{' '}
            </span>
          ))}
        </p>
      </div>
    </motion.div>
  );
}
