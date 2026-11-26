// Canvas state as a pure function of the primitive events that have fired.

import { CARD_H, CARD_W, NOTE_W, groupLayouts, isSlot, slotPos, zoneOf, type Rect } from '../script/layouts';
import type { Action, Speaker } from '../script/script';

export type CardS = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  kind: 'card' | 'switcher';
  zone: string;
  by?: Speaker; // who made it
  heldBy?: Speaker;
  mover?: Speaker; // whose hand the last move was in (sets the easing)
  dur: number; // duration of the last move
  from?: { x: number; y: number }; // where it was copied from
  linked?: boolean;
};
export type GroupS = { id: string; title: string; subtitle?: string; x: number; y: number; zone: string };
export type NoteS = { id: string; kicker: string; text: string; x: number; y: number; pulse: boolean };
export type RingS = { id: string; who: Speaker; rects: Rect[] };
export type CursorS = { x: number; y: number; visible: boolean; dur: number };
export type ChipS = { id: string; label: string; done: boolean };
export type TagS = { target: string; text: string; x: number; y: number };

export type CanvasState = {
  view: 'chat' | 'session' | 'record';
  camera: { zone: string; dur: number };
  zones: string[];
  cards: Record<string, CardS>;
  groups: Record<string, GroupS>;
  notes: Record<string, NoteS>;
  rings: RingS[];
  cursors: Record<Speaker, CursorS>;
  chips: ChipS[];
  links: { from: string; to: string }[];
  tags: TagS[];
  dim: string[];
  highlight: string | null;
  brief: { label: string; text: string }[];
};

/** Primitive, instantaneous state changes. Actions with a duration compile to several. */
export type Prim =
  | Action
  | { type: 'ringOff'; id: string }
  | { type: 'ringOn'; id: string; who: Speaker; cards: string[]; includeTitle?: boolean }
  | { type: 'pulseOff'; target: string }
  | { type: 'chipShow'; id: string; label: string }
  | { type: 'chipResolve'; id: string; note?: { id: string; kicker: string; text: string; slot: string } }
  | { type: 'chipHide'; id: string };

export type TimedPrim = { t: number; seq: number; prim: Prim };

/** Where a cursor points when it is "on" a card: lower right of the label. */
const HOT = { x: 112, y: 24 };

export function expand(action: Action, t: number, key: string): { t: number; prim: Prim }[] {
  switch (action.type) {
    case 'drag':
      return action.who
        ? [{ t, prim: action }, { t: t + (action.duration ?? 0.6), prim: { type: 'release', card: action.card } }]
        : [{ t, prim: action }];
    case 'createCard':
      return action.from
        ? [{ t, prim: action }, { t: t + (action.duration ?? 0.6), prim: { type: 'release', card: action.card } }]
        : [{ t, prim: action }];
    case 'ring':
      return [
        { t, prim: { type: 'ringOn', id: key, who: action.who, cards: action.cards, includeTitle: action.includeTitle } },
        { t: t + (action.duration ?? 3), prim: { type: 'ringOff', id: key } },
      ];
    case 'pulse':
      return [{ t, prim: action }, { t: t + (action.duration ?? 2.4), prim: { type: 'pulseOff', target: action.target } }];
    case 'chip':
      return [
        { t, prim: { type: 'chipShow', id: action.id, label: action.label } },
        { t: t + action.resolveAfter, prim: { type: 'chipResolve', id: action.id, note: action.note } },
        { t: t + action.resolveAfter + 1.8, prim: { type: 'chipHide', id: action.id } },
      ];
    default:
      return [{ t, prim: action }];
  }
}

export function initialState(): CanvasState {
  return {
    view: 'session',
    camera: { zone: 'today', dur: 0 },
    zones: ['today'],
    cards: {},
    groups: {},
    notes: {},
    rings: [],
    cursors: {
      agent: { x: 440, y: 150, visible: false, dur: 0 },
      callum: { x: -70, y: 330, visible: false, dur: 0 },
    },
    chips: [],
    links: [],
    tags: [],
    dim: [],
    highlight: null,
    brief: [],
  };
}


function resolvePoint(s: CanvasState, to: string | { x: number; y: number }): { x: number; y: number } {
  if (typeof to !== 'string') return to;
  const card = s.cards[to];
  if (card) return { x: card.x + HOT.x, y: card.y + HOT.y };
  const note = s.notes[to];
  if (note) return { x: note.x + NOTE_W - 40, y: note.y + 70 };
  const group = groupLayouts[to];
  if (group) return { x: group.x + 70, y: group.y + 14 };
  if (isSlot(to)) {
    const p = slotPos(to);
    return { x: p.x + HOT.x, y: p.y + HOT.y };
  }
  throw new Error(`cursorMove: unknown target "${to}"`);
}

function ringRects(s: CanvasState, ids: string[], includeTitle?: boolean): Rect[] {
  // One rounded outline per run of vertically adjacent cards in the same column.
  const cards = ids.map((id) => s.cards[id]).filter(Boolean);
  const byCol = new Map<number, CardS[]>();
  cards.forEach((c) => byCol.set(c.x, [...(byCol.get(c.x) ?? []), c]));
  const rects: Rect[] = [];
  const pad = 7;
  byCol.forEach((col) => {
    col.sort((a, b) => a.y - b.y);
    let start = col[0];
    let prev = col[0];
    const flush = () => {
      const top = includeTitle ? start.y - 30 : start.y;
      rects.push({ x: start.x - pad, y: top - pad, w: start.w + pad * 2, h: prev.y + CARD_H - top + pad * 2 });
    };
    for (const c of col.slice(1)) {
      if (c.y - prev.y > 50) {
        flush();
        start = c;
      }
      prev = c;
    }
    flush();
  });
  return rects;
}

/** Applies one primitive. Returns a new state; never mutates the old one. */
export function apply(s: CanvasState, p: Prim): CanvasState {
  switch (p.type) {
    case 'view':
      return { ...s, view: p.to };
    case 'camera':
      return { ...s, camera: { zone: p.zone, dur: p.duration ?? 1.2 } };
    case 'zone':
      return s.zones.includes(p.zone) ? s : { ...s, zones: [...s.zones, p.zone] };
    case 'cursorMove': {
      const pt = resolvePoint(s, p.to);
      return { ...s, cursors: { ...s.cursors, [p.who]: { ...pt, visible: true, dur: p.duration ?? 0.6 } } };
    }
    case 'createCard': {
      const pos = slotPos(p.slot);
      const src = p.from ? s.cards[p.from] : undefined;
      const dur = p.duration ?? 0.6;
      const card: CardS = {
        id: p.card,
        label: p.label,
        x: pos.x,
        y: pos.y,
        w: pos.w,
        kind: p.kind ?? 'card',
        zone: zoneOf(p.slot),
        by: zoneOf(p.slot) === 'today' ? undefined : p.who, // today's navs belong to nobody
        heldBy: src ? p.who : undefined,
        mover: p.who,
        dur: src ? dur : 0,
        from: src ? { x: src.x, y: src.y } : undefined,
      };
      const next = { ...s, cards: { ...s.cards, [p.card]: card } };
      // The first card of a multi-card drag carries the cursor with it.
      const cur = s.cursors[p.who];
      const onSource = src && Math.abs(cur.x - (src.x + HOT.x)) < 2 && Math.abs(cur.y - (src.y + HOT.y)) < 2;
      if (!src || onSource)
        next.cursors = { ...s.cursors, [p.who]: { x: pos.x + HOT.x, y: pos.y + HOT.y, visible: true, dur: src ? dur : 0.3 } };
      return next;
    }
    case 'drag': {
      const c = s.cards[p.card];
      if (!c) return s;
      const pos = slotPos(p.to);
      const dur = p.duration ?? 0.6;
      const next = {
        ...s,
        cards: { ...s.cards, [p.card]: { ...c, x: pos.x, y: pos.y, zone: zoneOf(p.to), heldBy: p.who, mover: p.who, dur } },
      };
      if (p.who) {
        const cur = s.cursors[p.who];
        if (Math.abs(cur.x - (c.x + HOT.x)) < 2 && Math.abs(cur.y - (c.y + HOT.y)) < 2)
          next.cursors = { ...s.cursors, [p.who]: { x: pos.x + HOT.x, y: pos.y + HOT.y, visible: true, dur } };
      }
      return next;
    }
    case 'hold': {
      const c = s.cards[p.card];
      return c ? { ...s, cards: { ...s.cards, [p.card]: { ...c, heldBy: p.who } } } : s;
    }
    case 'release': {
      const c = s.cards[p.card];
      return c ? { ...s, cards: { ...s.cards, [p.card]: { ...c, heldBy: undefined } } } : s;
    }
    case 'removeCard': {
      const { [p.card]: _gone, ...cards } = s.cards;
      return { ...s, cards };
    }
    case 'createGroup': {
      const g = groupLayouts[p.group];
      return { ...s, groups: { ...s.groups, [p.group]: { id: p.group, title: p.title, subtitle: p.subtitle, x: g.x, y: g.y, zone: zoneOf(p.group) } } };
    }
    case 'removeGroup': {
      const { [p.group]: _gone, ...groups } = s.groups;
      return { ...s, groups };
    }
    case 'ringOn':
      return { ...s, rings: [...s.rings, { id: p.id, who: p.who, rects: ringRects(s, p.cards, p.includeTitle) }] };
    case 'ringOff':
      return { ...s, rings: s.rings.filter((r) => r.id !== p.id) };
    case 'pulse':
    case 'pulseOff': {
      const n = s.notes[p.target];
      return n ? { ...s, notes: { ...s.notes, [p.target]: { ...n, pulse: p.type === 'pulse' } } } : s;
    }
    case 'chipShow':
      return { ...s, chips: [...s.chips, { id: p.id, label: p.label, done: false }] };
    case 'chipResolve': {
      const chips = s.chips.map((c) => (c.id === p.id ? { ...c, done: true } : c));
      if (!p.note) return { ...s, chips };
      const pos = slotPos(p.note.slot);
      return { ...s, chips, notes: { ...s.notes, [p.note.id]: { id: p.note.id, kicker: p.note.kicker, text: p.note.text, x: pos.x, y: pos.y, pulse: false } } };
    }
    case 'chipHide':
      return { ...s, chips: s.chips.filter((c) => c.id !== p.id) };
    case 'link': {
      const cards = { ...s.cards };
      for (const id of [p.from, p.to]) if (cards[id]) cards[id] = { ...cards[id], linked: true };
      return { ...s, cards, links: [...s.links, { from: p.from, to: p.to }] };
    }
    case 'tag': {
      const g = groupLayouts[p.target];
      const count = Object.values(s.cards).filter((c) => c.x === g.x && c.zone === zoneOf(p.target)).length;
      return { ...s, tags: [...s.tags, { target: p.target, text: p.text, x: g.x, y: g.y + g.titleH + count * 44 + 4 }] };
    }
    case 'dim':
      return { ...s, dim: p.zones };
    case 'highlight':
      return { ...s, highlight: p.zone };
    case 'brief':
      return { ...s, brief: [...s.brief, { label: p.label, text: p.text }] };
    case 'ring':
    case 'chip':
      return s; // compiled away by expand()
  }
}

export { CARD_W };
