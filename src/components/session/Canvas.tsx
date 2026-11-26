import { memo, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSnap } from '../../engine/context';
import type { CardS, CursorS, GroupS, NoteS } from '../../engine/state';
import { CARD_H, cameraRects, suites, zones, type ZoneId } from '../../script/layouts';
import type { Speaker } from '../../script/script';

type Bezier = [number, number, number, number];
// Different hands: Callum is quicker and less direct, the agent is steady.
const EASE: Record<Speaker | 'none', { x: Bezier; y: Bezier }> = {
  agent: { x: [0.42, 0, 0.2, 1], y: [0.5, 0, 0.32, 1] },
  callum: { x: [0.18, 0.72, 0.2, 1], y: [0.62, 0.04, 0.3, 1] },
  none: { x: [0.3, 0, 0.2, 1], y: [0.3, 0, 0.2, 1] },
};
const SOFT: Bezier = [0.2, 0.7, 0.2, 1];
const NAMES: Record<Speaker, string> = { callum: 'Callum', agent: 'Claude' };

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** Timing helpers shared by everything on the board. */
type Motion = { instant: boolean; reduced: boolean; d: (seconds: number) => number; move: (seconds: number) => number };

export function Canvas() {
  const { state, instant, speed } = useSnap();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1140, h: 856 });
  useEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const m: Motion = {
    instant,
    reduced,
    d: (s) => (instant ? 0 : s / speed),
    move: (s) => (instant || reduced ? 0 : s / speed), // movement becomes a fade under reduced motion
  };

  // Fit the requested framing into the space left by the captions and call bar.
  const rect = cameraRects[state.camera.zone] ?? cameraRects.wide;
  const inset = { top: 24, side: 28, bottom: 158 };
  const availW = size.w - inset.side * 2;
  const availH = size.h - inset.top - inset.bottom;
  const pad = 34;
  const scale = Math.min(1.15, availW / (rect.w + pad * 2), availH / (rect.h + pad * 2));
  const camX = inset.side + availW / 2 - (rect.x + rect.w / 2) * scale;
  const camY = inset.top + availH / 2 - (rect.y + rect.h / 2) * scale;
  const camT = { duration: m.move(state.camera.dur), ease: [0.45, 0, 0.2, 1] as Bezier };

  const cards = Object.values(state.cards);
  const dimmed = (zone: string) => state.dim.includes(zone);

  return (
    <div className="canvas" ref={ref}>
      <motion.div className="world" initial={false} animate={{ x: camX, y: camY, scale }} transition={camT}>
        <div className="dots" />
        <AnimatePresence initial={false}>
          {state.zones.map((id) => {
            const z = zones[id as ZoneId];
            return (
              <motion.div
                key={id}
                className="zone"
                data-highlight={state.highlight === id}
                style={{ left: z.x, top: z.y, width: z.w, height: z.h }}
                initial={instant ? false : { opacity: 0 }}
                animate={{ opacity: dimmed(id) ? 0.45 : 1 }}
                transition={{ duration: m.d(0.5) }}
              >
                <div className="zone-head">
                  <span className="zone-title">{z.title}</span>
                  <span className="zone-sub">{z.subtitle}</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {Object.values(state.groups).map((g) => (
            <GroupTitle key={g.id} g={g} dim={dimmed(g.zone)} m={m} />
          ))}
        </AnimatePresence>

        <svg className="overlay" width="1" height="1">
          {state.links.map((l) => {
            const a = state.cards[l.from];
            const b = state.cards[l.to];
            if (!a || !b) return null;
            const y1 = a.y + CARD_H / 2;
            const y2 = b.y + CARD_H / 2;
            return (
              <g key={l.from + l.to} className="link">
                <motion.line
                  x1={a.x + a.w}
                  y1={y1}
                  x2={b.x}
                  y2={y2}
                  initial={instant ? false : { pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: m.d(0.5) }}
                />
                <circle cx={a.x + a.w} cy={y1} r="3.5" />
                <circle cx={b.x} cy={y2} r="3.5" />
              </g>
            );
          })}
        </svg>

        <AnimatePresence initial={false}>
          {cards.map((c) => (
            <Card key={reduced ? `${c.id}@${c.x},${c.y}` : c.id} c={c} dim={dimmed(c.zone)} m={m} />
          ))}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {state.tags.map((tag) => (
            <motion.div
              key={tag.target}
              className="tag"
              style={{ left: tag.x, top: tag.y }}
              initial={instant ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: m.d(0.35), ease: SOFT }}
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M2.5 11V1.5M2.5 2h6.2l-1.4 2.3L8.7 6.6H2.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              {tag.text}
            </motion.div>
          ))}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {Object.values(state.notes).map((n, i) => (
            <Note key={n.id} n={n} tilt={i % 2 ? 1.1 : -1.4} m={m} />
          ))}
        </AnimatePresence>

        <svg className="overlay" width="1" height="1">
          <AnimatePresence initial={false}>
            {state.rings.flatMap((ring) =>
              ring.rects.map((r, i) => (
                <motion.rect
                  key={`${ring.id}-${i}`}
                  className={`ring ${ring.who}`}
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  rx="14"
                  initial={instant || reduced ? { opacity: 0, pathLength: 1 } : { pathLength: 0, opacity: 1 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: m.d(0.6), delay: m.move(i * 0.25), ease: 'easeOut' }}
                />
              )),
            )}
          </AnimatePresence>
        </svg>

        {(['callum', 'agent'] as const).map((who) => (
          <Cursor key={who} who={who} c={state.cursors[who]} scale={scale} camT={camT} m={m} />
        ))}
      </motion.div>
    </div>
  );
}

const GroupTitle = memo(function GroupTitle({ g, dim, m }: { g: GroupS; dim: boolean; m: Motion }) {
  return (
    <motion.div
      className="group-title"
      style={{ left: g.x, top: g.y }}
      initial={m.instant ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: dim ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: m.d(0.6) } }}
      transition={{ duration: m.d(0.3), ease: SOFT }}
    >
      <span>{g.title}</span>
      {g.subtitle && <small>{g.subtitle}</small>}
    </motion.div>
  );
}, same);

const Card = memo(function Card({ c, dim, m }: { c: CardS; dim: boolean; m: Motion }) {
  const ease = EASE[c.mover ?? 'none'];
  const copied = c.from && !m.reduced;
  return (
    <motion.div
      className={`card ${c.kind}`}
      data-held={c.heldBy}
      data-by={c.by}
      style={{ width: c.w, zIndex: c.heldBy ? 5 : 1 }}
      initial={m.instant ? false : copied ? { x: c.from!.x, y: c.from!.y, opacity: 0.4, scale: 1 } : { x: c.x, y: c.y, opacity: 0, scale: 0.9 }}
      animate={{ x: c.x, y: c.y, opacity: dim ? 0.35 : 1, scale: c.heldBy ? 1.05 : 1 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: m.d(0.25) } }}
      transition={{
        x: { duration: m.move(c.dur), ease: ease.x },
        y: { duration: m.move(c.dur), ease: ease.y },
        opacity: { duration: m.d(m.reduced ? 0.35 : 0.2) },
        scale: { duration: m.d(0.2) },
      }}
    >
      {c.kind === 'switcher' ? (
        <>
          <span className="switcher-option active">Harbor</span>
          <span className="switcher-option">Relay</span>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          </svg>
        </>
      ) : (
        <>
          <span>{c.label}</span>
          {c.linked && (
            <svg className="card-link" width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M6.5 9.5l3-3M7 4.5l1-1a2.8 2.8 0 014 4l-1 1M9 11.500l-1 1a2.8 2.8 0 01-4-4l1-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </>
      )}
    </motion.div>
  );
}, same);

const Note = memo(function Note({ n, tilt, m }: { n: NoteS; tilt: number; m: Motion }) {
  const research = n.kind === 'research';
  return (
    <motion.div
      className={research ? 'note research' : 'note'}
      data-pulse={n.pulse}
      style={{ left: n.x, top: n.y, width: n.w }}
      initial={m.instant ? false : m.reduced ? { opacity: 0 } : { opacity: 0, y: -46, scale: 0.86, rotate: 0 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: research ? 0 : tilt }}
      transition={{ duration: m.d(0.45), ease: SOFT }}
    >
      <div className="note-kicker">
        <span className="note-dot" /> {n.kicker}
        {!research && ' · Claude'}
      </div>
      {research && (
        <div className="suites">
          {suites.map((s) => (
            <div key={s.name} className="suite">
              <div className="suite-name">{s.name}</div>
              <div className="suite-top" data-merged={s.products === 1}>
                {Array.from({ length: s.products }, (_, i) => (
                  <i key={i} />
                ))}
              </div>
              <div className="suite-lines">
                <i />
                <i />
                <i />
              </div>
              <div className="suite-account">Account</div>
            </div>
          ))}
        </div>
      )}
      {n.text}
    </motion.div>
  );
}, same);

function Cursor({ who, c, scale, camT, m }: { who: Speaker; c: CursorS; scale: number; camT: object; m: Motion }) {
  const ease = EASE[who];
  return (
    <motion.div
      key={m.reduced ? `${c.x},${c.y}` : 'cursor'}
      className={`cursor ${who}`}
      initial={m.reduced && !m.instant ? { x: c.x, y: c.y, opacity: 0 } : false}
      animate={{ x: c.x, y: c.y, opacity: c.visible ? 1 : 0 }}
      transition={{
        x: { duration: m.move(c.dur), ease: ease.x },
        y: { duration: m.move(c.dur), ease: ease.y },
        opacity: { duration: m.d(0.4) },
      }}
    >
      {/* Counter-scale so the pointer stays the same size on screen as the camera zooms. */}
      <motion.div className="cursor-inner" initial={false} animate={{ scale: 1 / scale }} transition={camT}>
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
          <path d="M3 2l13.5 6.2-5.9 1.9-2.2 5.9L3 2z" fill="currentColor" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
        <span className="cursor-tag">{NAMES[who]}</span>
      </motion.div>
    </motion.div>
  );
}

function same<T extends { m: Motion }>(a: T, b: T) {
  for (const k in a) {
    if (k === 'm') {
      if (a.m.instant !== b.m.instant || a.m.reduced !== b.m.reduced) return false;
    } else if (a[k] !== b[k]) return false;
  }
  return true;
}
