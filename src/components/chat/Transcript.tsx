import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { formatTime, usePlayer, useTime } from '../../engine/context';
import type { BuiltLine, Timeline } from '../../engine/timeline';
import { splitDirection } from '../../script/script';

const NAMES = { callum: 'Callum', agent: 'Claude' } as const;

type Item =
  | { kind: 'scene'; t: number; name: string }
  | { kind: 'line'; t: number; bl: BuiltLine }
  | { kind: 'note'; t: number; label: string; text: string }
  | { kind: 'activity'; t: number; text: string };

/** Everything worth reading back, in order: what was said, what Claude noted, and what it went off and did. */
function buildItems(tl: Timeline): { items: Item[]; origin: number } {
  const origin = tl.starts['s1-open'] ?? 0;
  const end = tl.starts['s5-record'] ?? tl.total;
  const items: Item[] = [];
  for (const s of tl.scenes) if (s.start >= origin - 1e-6 && s.start < end) items.push({ kind: 'scene', t: s.start, name: s.name });
  for (const bl of tl.lines) items.push({ kind: 'line', t: bl.start, bl });
  for (const { t, prim } of tl.prims) {
    if (prim.type === 'brief') items.push({ kind: 'note', t, label: prim.label, text: prim.text });
    else if (prim.type === 'chipShow') items.push({ kind: 'activity', t, text: prim.label });
    else if (prim.type === 'share' && prim.what === 'research') items.push({ kind: 'activity', t, text: 'Shared 6 examples on screen' });
  }
  // Scene headings first when they share a moment with what follows them.
  const order = { scene: 0, line: 1, note: 2, activity: 3 };
  items.sort((a, b) => a.t - b.t || order[a.kind] - order[b.kind]);
  return { items: items.filter((i) => i.t >= origin - 1e-6 && i.t < end), origin };
}

const Line = memo(function Line({ bl, origin, upTo, onJump }: { bl: BuiltLine; origin: number; upTo: number; onJump: (t: number) => void }) {
  const { direction } = splitDirection(bl.line.text);
  // While a line is being spoken, show it word by word, as live transcription does.
  const words = upTo >= Infinity ? bl.words : bl.words.filter((w) => w.start <= upTo);
  const live = upTo < Infinity;
  return (
    <button className="tx-line" data-who={bl.line.speaker} data-live={live || undefined} onClick={() => onJump(bl.start)} title="Jump to this moment">
      <span className="tx-who">
        <span className="tx-avatar">{bl.line.speaker === 'agent' ? '✦' : 'C'}</span>
        {NAMES[bl.line.speaker]}
        <time>{formatTime(bl.start - origin)}</time>
      </span>
      <span className="tx-text">
        {direction && <em>({direction}) </em>}
        {words.map((w) => w.word).join(' ')}
        {live && <span className="tx-caret" />}
      </span>
    </button>
  );
});

/**
 * The session's transcript, written as it happens. With `all`, shows the whole session at once
 * (for reading back afterwards). Clicking a line jumps the session to that moment.
 */
export function Transcript({ all = false }: { all?: boolean }) {
  const player = usePlayer();
  const t = useTime();
  const { items, origin } = useMemo(() => buildItems(player.timeline), [player.timeline]);
  const now = all ? Infinity : t;
  const visible = items.filter((i) => i.t <= now);
  const ref = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  // Follow the conversation unless the reader has scrolled up to look at something.
  const last = visible[visible.length - 1];
  const lastWords = last?.kind === 'line' ? last.bl.words.filter((w) => w.start <= now - last.bl.start).length : 0;
  useEffect(() => {
    const el = ref.current;
    if (!el || all || !pinned.current) return;
    el.scrollTop = el.scrollHeight;
  }, [visible.length, lastWords, all]);

  const jump = useCallback((at: number) => player.seek(Math.max(0, at - 0.05)), [player]);

  return (
    <div
      className="tx"
      ref={ref}
      data-all={all || undefined}
      onScroll={(e) => {
        const el = e.currentTarget;
        pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
      }}
    >
      {visible.length === 0 && <p className="tx-empty">The conversation is written down here as it happens, so anyone can read back what was said and decided.</p>}
      {visible.map((item, i) => {
        if (item.kind === 'scene')
          return (
            <div key={i} className="tx-scene">
              <span>{item.name}</span>
              <time>{formatTime(item.t - origin)}</time>
            </div>
          );
        if (item.kind === 'note')
          return (
            <div key={i} className="tx-note">
              <span>Noted · {item.label}</span>
              {item.text}
            </div>
          );
        if (item.kind === 'activity')
          return (
            <div key={i} className="tx-activity">
              <span className="tx-activity-dot" />
              {item.text}
            </div>
          );
        const local = now - item.bl.start;
        const speaking = !all && local < item.bl.end - item.bl.start;
        return <Line key={i} bl={item.bl} origin={origin} upTo={speaking ? local : Infinity} onJump={jump} />;
      })}
    </div>
  );
}
