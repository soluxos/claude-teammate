// Named positions for everything on the canvas, in world coordinates.

export const CARD_W = 150;
export const CARD_H = 36;
export const ROW = 44;
export const COL = 174;

export type Rect = { x: number; y: number; w: number; h: number };
export type ZoneId = 'today' | 'A' | 'B' | 'C';

export const zones: Record<ZoneId, Rect & { title: string; subtitle: string }> = {
  today: { x: 0, y: 0, w: 372, h: 550, title: 'Today', subtitle: 'Two products, two navigations' },
  A: { x: 440, y: 0, w: 372, h: 550, title: 'Option A', subtitle: 'Callum · product switcher' },
  B: { x: 880, y: 0, w: 720, h: 550, title: 'Option B', subtitle: 'Claude · by job' },
  C: { x: 747, y: 610, w: 546, h: 380, title: 'Option C', subtitle: 'Together · workspaces by role' },
};

type GroupLayout = { x: number; y: number; titleH: number };

/** Group id -> position of its title. Cards stack beneath. */
export const groupLayouts: Record<string, GroupLayout> = {
  'today.harbor': { x: 24, y: 52, titleH: 28 },
  'today.relay': { x: 198, y: 52, titleH: 28 },
  'A.harbor': { x: 464, y: 104, titleH: 28 },
  'A.relay': { x: 638, y: 104, titleH: 28 },
  'B.build': { x: 904, y: 52, titleH: 28 },
  'B.engage': { x: 1078, y: 52, titleH: 28 },
  'B.measure': { x: 1252, y: 52, titleH: 28 },
  'B.account': { x: 1426, y: 52, titleH: 28 },
  'C.build': { x: 771, y: 662, titleH: 44 },
  'C.engage': { x: 945, y: 662, titleH: 44 },
  'C.account': { x: 1119, y: 662, titleH: 44 },
};

const special: Record<string, { x: number; y: number; w?: number }> = {
  'A.switcher': { x: 464, y: 54, w: 324 },
  research: { x: 904, y: 312 },
  'note.2': { x: 1368, y: 336 },
};

export const NOTE_W = 216;
export const RESEARCH_W = 440;

/** Fictional suites the agent looked at. `products` is how many they keep apart at the top (1 = merged). */
export const suites = [
  { name: 'Corvane', products: 3 },
  { name: 'Plentia', products: 2 },
  { name: 'Tandril', products: 1 },
  { name: 'Mereo', products: 4 },
  { name: 'Ubiqo', products: 2 },
  { name: 'Novaro', products: 1 },
];

/** A slot is `${groupId}.${rowIndex}` or one of the special names above. */
export function slotPos(slot: string): { x: number; y: number; w: number } {
  const s = special[slot];
  if (s) return { x: s.x, y: s.y, w: s.w ?? CARD_W };
  const i = slot.lastIndexOf('.');
  const g = groupLayouts[slot.slice(0, i)];
  const row = Number(slot.slice(i + 1));
  if (!g || Number.isNaN(row)) throw new Error(`Unknown slot: ${slot}`);
  return { x: g.x, y: g.y + g.titleH + row * ROW, w: CARD_W };
}

export function isSlot(slot: string): boolean {
  try {
    slotPos(slot);
    return true;
  } catch {
    return false;
  }
}

export const zoneOf = (slot: string) => slot.split('.')[0] as ZoneId;

const union = (...rs: Rect[]): Rect => {
  const x = Math.min(...rs.map((r) => r.x));
  const y = Math.min(...rs.map((r) => r.y));
  return {
    x,
    y,
    w: Math.max(...rs.map((r) => r.x + r.w)) - x,
    h: Math.max(...rs.map((r) => r.y + r.h)) - y,
  };
};

/** Camera framings the script can ask for. */
export const cameraRects: Record<string, Rect> = {
  today: zones.today,
  wide: union(zones.today, zones.A, zones.B),
  AB: union(zones.A, zones.B),
  all: union(zones.A, zones.B, zones.C),
  C: { x: zones.C.x - 60, y: zones.C.y - 20, w: zones.C.w + 120, h: zones.C.h + 30 },
  research: { x: 880, y: 250, w: 720, h: 300 },
};

export const harborNav = ['Sites', 'Environments', 'Deployments', 'Domains', 'Logs', 'Team', 'Billing', 'Settings'];
export const relayNav = ['Audiences', 'Campaigns', 'Journeys', 'Content', 'Analytics', 'Integrations', 'Users', 'Billing', 'Settings'];

/** Option C as specified, used for the decision-record thumbnail. */
export const optionC = [
  { title: 'Build', subtitle: 'Developers', items: ['Sites', 'Environments', 'Deployments', 'Domains', 'Logs'] },
  { title: 'Engage', subtitle: 'Marketers', items: ['Sites', 'Audiences', 'Campaigns', 'Journeys', 'Content', 'Analytics'] },
  { title: 'Account', subtitle: 'Appears once', items: ['People', 'Billing', 'Settings', 'Integrations'] },
];
