// Single source of truth for the performance: every line, beat and timeline event.
// Wording follows section 6 of the spec exactly. Do not edit line text casually:
// audio files are keyed by line id and regenerated when the text hash changes.

import { harborNav, relayNav } from './layouts';

export type Speaker = 'callum' | 'agent';

export type At =
  | { word: string; occurrence?: number; plus?: number } // nth occurrence of a word in the line, plus seconds
  | { offset: number }; // seconds from segment start

export type Action =
  | { type: 'view'; to: 'chat' | 'session' | 'record' }
  | { type: 'camera'; zone: string; duration?: number }
  | { type: 'zone'; zone: string } // reveal a zone frame
  | { type: 'cursorMove'; who: Speaker; to: string | { x: number; y: number }; duration?: number } // card, note, group, slot or point
  | { type: 'drag'; who?: Speaker; card: string; to: string; duration?: number } // 'to' is a layout slot
  | { type: 'hold'; who: Speaker; card: string }
  | { type: 'release'; card: string }
  | { type: 'createCard'; who: Speaker; card: string; label: string; slot: string; from?: string; duration?: number; kind?: 'card' | 'switcher' }
  | { type: 'removeCard'; card: string }
  | { type: 'createGroup'; group: string; title: string; subtitle?: string }
  | { type: 'removeGroup'; group: string }
  | { type: 'ring'; who: Speaker; cards: string[]; duration?: number; includeTitle?: boolean }
  | { type: 'pulse'; target: string; duration?: number }
  | { type: 'chip'; id: string; label: string; resolveAfter: number; note?: { id: string; kicker: string; text: string; slot: string } }
  | { type: 'link'; from: string; to: string }
  | { type: 'tag'; target: string; text: string }
  | { type: 'dim'; zones: string[] }
  | { type: 'highlight'; zone: string };

export type TimedEvent = { at: At; action: Action };

export type VoiceSettings = { stability?: number; similarity_boost?: number; style?: number; speed?: number };

export type Line = {
  kind: 'line';
  id: string; // e.g. 's3-03', also the audio file name
  scene: number;
  speaker: Speaker;
  text: string; // exactly as in the spec, without bracketed stage directions
  gapBefore?: number; // seconds of silence before the line, default 0.4
  events?: TimedEvent[];
  voice?: VoiceSettings; // per-line delivery tweaks for audio generation
};

export type Beat = {
  kind: 'beat';
  id: string;
  scene: number;
  duration: number;
  events?: TimedEvent[]; // offsets may run past the beat, over the lines that follow
};

export type Segment = Line | Beat;

export const DEFAULT_GAP = 0.4;
export const WORDS_PER_MINUTE = 165;

export const sceneNames = ['Chat', 'Framing', 'Working in parallel', 'Disagreement', 'Building the third option', 'Decision record'];

/** Leading "(pause)" style parentheticals are direction, not speech. */
export function splitDirection(text: string): { direction: string | null; spoken: string } {
  const m = text.match(/^\(([^)]+)\)\s*/);
  return m ? { direction: m[1], spoken: text.slice(m[0].length) } : { direction: null, spoken: text };
}

export const spokenWords = (text: string) => splitDirection(text).spoken.split(/\s+/).filter(Boolean);

// ── Text-only scenes ─────────────────────────────────────────────────────────

export const chat = {
  title: 'Harbor and Relay navigation',
  callum:
    "We're bringing Harbor and Relay under one navigation. I'm thinking a product switcher at the top, and we leave both navs as they are. Can you tidy that into a proposal?",
  agent:
    "I can, but I don't agree with it yet, and I'd rather say so now than polish something I'd argue against. A switcher keeps every duplicate we have today: two Billing pages, two Settings pages, and Team and Users, which are the same thing under different names. I think there's a better structure, but I'm not sure of it, and this is the kind of problem that's easier to work through side by side than in messages. Want to do it as a working session? I've already put both navigations on a board.",
  button: 'Start working session',
  // seconds from the start of scene 0
  timing: { typeStart: 0.5, typeEnd: 3.3, send: 3.7, replyStart: 4.4, replyEnd: 9.0, button: 9.3, duration: 9.8 },
};

export const record = {
  title: 'Decision record: Harbor and Relay navigation',
  sections: [
    {
      label: 'Decided.',
      text: 'Two workspaces named for the people who use them (Build, Engage), one shared Account area, and Sites visible in both. The navigation opens on the workspace matching your role.',
    },
    {
      label: 'Why.',
      text: 'Developers and marketers are different people (Callum, customer calls last week), so grouping by job mixed two audiences. Account, billing and people are one system already and are the main complaint from customers with both products (decision log, March; 6 suites checked).',
    },
    {
      label: 'What changed.',
      text: 'I dropped grouping by job after hearing how customers are staffed. Callum brought Account into scope after seeing it is the most common complaint and the cheapest fix.',
    },
    { label: 'Still open.', text: 'Does opening by role hide things from people who do both jobs?' },
    {
      label: 'Next.',
      text: 'Me: a tree test with 8 tasks, drafted for tomorrow. Callum: talk to the Account team about the dependency.',
    },
  ],
  saved: 'Saved to project memory',
  // seconds from the start of scene 5
  timing: { streamStart: 1.0, streamEnd: 8.5, saved: 9.2, replay: 9.8, duration: 11 },
};

// ── Authoring helpers ────────────────────────────────────────────────────────

const slug = (label: string) => label.toLowerCase();
const at = (offset: number, action: Action): TimedEvent => ({ at: { offset }, action });
const on = (word: string, action: Action, plus = 0, occurrence = 1): TimedEvent => ({ at: { word, occurrence, plus }, action });

/** Move to a source card, then drag a copy of it into a slot. */
function copyAt(
  who: Speaker,
  t: number,
  src: string,
  card: string,
  label: string,
  slot: string,
  move: number,
  drag: number,
): TimedEvent[] {
  return [
    at(t, { type: 'cursorMove', who, to: src, duration: move }),
    at(t + move, { type: 'createCard', who, card, label, slot, from: src, duration: drag }),
  ];
}

// Scene 2: Callum lays out Option A, quickly, while the agent builds Option B.
const CALLUM_STEP = 0.72;
const callumBuildsA: TimedEvent[] = [
  at(1.0, { type: 'cursorMove', who: 'callum', to: 'A.switcher', duration: 0.5 }),
  at(1.5, { type: 'createCard', who: 'callum', card: 'a-switcher', label: 'Harbor · Relay', slot: 'A.switcher', kind: 'switcher' }),
  at(2.0, { type: 'createGroup', group: 'A.harbor', title: 'Harbor' }),
  at(2.2, { type: 'createGroup', group: 'A.relay', title: 'Relay' }),
  ...harborNav.flatMap((label, i) =>
    copyAt('callum', 2.6 + i * CALLUM_STEP, `t-h-${slug(label)}`, `a-h-${slug(label)}`, label, `A.harbor.${i}`, 0.27, 0.42),
  ),
  // The last two (Billing, Settings) are placed on his line, s2-01.
  ...relayNav
    .slice(0, 7)
    .flatMap((label, i) =>
      copyAt('callum', 8.5 + i * CALLUM_STEP, `t-r-${slug(label)}`, `a-r-${slug(label)}`, label, `A.relay.${i}`, 0.27, 0.42),
    ),
];

const AGENT_STEP = 1.1;
const agentCopies: [src: string, card: string, label: string, slot: string][] = [
  ['t-h-sites', 'b-sites', 'Sites', 'B.build.0'],
  ['t-h-environments', 'b-environments', 'Environments', 'B.build.1'],
  ['t-h-deployments', 'b-deployments', 'Deployments', 'B.build.2'],
  ['t-h-domains', 'b-domains', 'Domains', 'B.build.3'],
  ['t-r-audiences', 'b-audiences', 'Audiences', 'B.engage.0'],
  ['t-r-campaigns', 'b-campaigns', 'Campaigns', 'B.engage.1'],
  ['t-r-journeys', 'b-journeys', 'Journeys', 'B.engage.2'],
  ['t-r-content', 'b-content', 'Content', 'B.engage.3'],
  ['t-r-analytics', 'b-analytics', 'Analytics', 'B.measure.0'],
  ['t-h-logs', 'b-logs', 'Logs', 'B.measure.1'],
  ['t-h-team', 'b-team', 'Team', 'B.account.0'],
  ['t-r-users', 'b-users', 'Users', 'B.account.0'],
];
const agentAccountRest: [string, string, string, string][] = [
  ['t-h-billing', 'b-billing', 'Billing', 'B.account.1'],
  ['t-h-settings', 'b-settings', 'Settings', 'B.account.2'],
  ['t-r-integrations', 'b-integrations', 'Integrations', 'B.account.3'],
];
const MERGE_AT = 3.8 + agentCopies.length * AGENT_STEP; // Team and Users become People
const agentBuildsB: TimedEvent[] = [
  ...(['build', 'engage', 'measure', 'account'] as const).flatMap((g, i) => [
    at(0.8 + i * 0.7, { type: 'cursorMove', who: 'agent', to: `B.${g}`, duration: 0.45 } as Action),
    at(1.25 + i * 0.7, { type: 'createGroup', group: `B.${g}`, title: g[0].toUpperCase() + g.slice(1) } as Action),
  ]),
  ...agentCopies.flatMap(([src, card, label, slot], i) => copyAt('agent', 3.8 + i * AGENT_STEP, src, card, label, slot, 0.45, 0.6)),
  at(MERGE_AT, { type: 'createCard', who: 'agent', card: 'b-people', label: 'People', slot: 'B.account.0' }),
  at(MERGE_AT, { type: 'removeCard', card: 'b-team' }),
  at(MERGE_AT, { type: 'removeCard', card: 'b-users' }),
  ...agentAccountRest.flatMap(([src, card, label, slot], i) =>
    copyAt('agent', MERGE_AT + 0.4 + i * AGENT_STEP, src, card, label, slot, 0.45, 0.6),
  ),
];

const cBuild = ['sites', 'environments', 'deployments', 'domains', 'logs'];
const cEngage = ['audiences', 'campaigns', 'journeys', 'content', 'analytics'];
const cAccount = ['people', 'billing', 'settings', 'integrations'];
const title = (s: string) => s[0].toUpperCase() + s.slice(1);

// ── The script ───────────────────────────────────────────────────────────────

export const script: Segment[] = [
  // Scene 0: Chat (text only). Content and timing live in `chat` above.
  { kind: 'beat', id: 's0-chat', scene: 0, duration: chat.timing.duration, events: [at(0, { type: 'view', to: 'chat' })] },

  // Scene 1: Framing
  {
    kind: 'beat',
    id: 's1-open',
    scene: 1,
    duration: 1.8,
    events: [
      at(0, { type: 'view', to: 'session' }),
      at(0, { type: 'camera', zone: 'today', duration: 0 }),
      at(0.7, { type: 'cursorMove', who: 'agent', to: { x: 440, y: 150 }, duration: 0.01 }),
      at(1.0, { type: 'cursorMove', who: 'callum', to: { x: -70, y: 330 }, duration: 0.01 }),
    ],
  },
  {
    kind: 'line',
    id: 's1-01',
    scene: 1,
    speaker: 'agent',
    text: 'Okay, both navs are on the board as they are today. Before we move anything, who is this for? Customers who have both products, or everyone?',
    events: [
      on('both', { type: 'cursorMove', who: 'agent', to: 't-h-deployments', duration: 0.8 }),
      on('board', { type: 'cursorMove', who: 'agent', to: 't-r-journeys', duration: 0.8 }),
      on('who', { type: 'cursorMove', who: 'agent', to: { x: 430, y: 250 }, duration: 0.9 }),
    ],
  },
  {
    kind: 'line',
    id: 's1-02',
    scene: 1,
    speaker: 'callum',
    text: "Everyone eventually. But about a third of customers have both today, and they're the ones complaining.",
    events: [
      on('third', { type: 'cursorMove', who: 'callum', to: { x: -40, y: 210 }, duration: 0.5 }),
      on('complaining', { type: 'cursorMove', who: 'callum', to: { x: -30, y: 400 }, duration: 0.6 }),
    ],
  },
  {
    kind: 'line',
    id: 's1-03',
    scene: 1,
    speaker: 'agent',
    text: "Then here's my worry with the switcher. These six cards are three things. A switcher keeps all six. I'd organise by what people are doing instead of by product.",
    events: [
      on('worry', { type: 'cursorMove', who: 'agent', to: 't-h-team', duration: 0.8 }),
      on('These', {
        type: 'ring',
        who: 'agent',
        cards: ['t-h-team', 't-h-billing', 't-h-settings', 't-r-users', 't-r-billing', 't-r-settings'],
        duration: 7,
      }),
      on('six', { type: 'cursorMove', who: 'agent', to: 't-r-billing', duration: 0.7 }),
      on('three', { type: 'cursorMove', who: 'agent', to: 't-h-billing', duration: 0.7 }),
      on('organise', { type: 'cursorMove', who: 'agent', to: { x: 430, y: 240 }, duration: 0.9 }),
    ],
  },
  {
    kind: 'line',
    id: 's1-04',
    scene: 1,
    speaker: 'callum',
    text: "I'm not convinced. Tell you what, I'll lay out the switcher version properly, you do yours, and we compare.",
    events: [on('lay', { type: 'cursorMove', who: 'callum', to: { x: 400, y: 120 }, duration: 0.6 })],
  },
  {
    kind: 'line',
    id: 's1-05',
    scene: 1,
    speaker: 'agent',
    text: "Good. I'll take the right side. Give me a minute.",
    events: [on('right', { type: 'cursorMove', who: 'agent', to: { x: 470, y: 60 }, duration: 0.8 })],
  },

  // Scene 2: Working in parallel
  {
    kind: 'beat',
    id: 's2-work',
    scene: 2,
    duration: 13.5,
    events: [
      at(0, { type: 'camera', zone: 'wide', duration: 1.4 }),
      at(0.2, { type: 'zone', zone: 'A' }),
      at(0.35, { type: 'zone', zone: 'B' }),
      ...callumBuildsA,
      ...agentBuildsB,
      at(2.0, {
        type: 'chip',
        id: 'chip-suites',
        label: 'Checking how 6 multi-product suites handle this',
        resolveAfter: 8,
        note: {
          id: 'note.1',
          kicker: 'Research',
          text: '6 suites checked. 4 keep products separate at the top level. All 6 have a single account, billing and people area.',
          slot: 'note.1',
        },
      }),
      at(10.8, {
        type: 'chip',
        id: 'chip-log',
        label: 'Reading the decision log',
        resolveAfter: 5,
        note: {
          id: 'note.2',
          kicker: 'Decision log',
          text: 'Decision log, March: one invoice per customer. Billing is already one system behind two menus.',
          slot: 'note.2',
        },
      }),
    ],
  },
  {
    kind: 'line',
    id: 's2-01',
    scene: 2,
    speaker: 'callum',
    text: '(half to himself) Billing twice. Settings twice. Yeah, okay, it does look a bit silly written down.',
    voice: { stability: 0.4, speed: 0.97 },
    events: [
      on('Billing', { type: 'cursorMove', who: 'callum', to: 't-r-billing', duration: 0.3 }),
      on('Billing', { type: 'createCard', who: 'callum', card: 'a-r-billing', label: 'Billing', slot: 'A.relay.7', from: 't-r-billing', duration: 0.45 }, 0.3),
      on('Settings', { type: 'cursorMove', who: 'callum', to: 't-r-settings', duration: 0.3 }),
      on('Settings', { type: 'createCard', who: 'callum', card: 'a-r-settings', label: 'Settings', slot: 'A.relay.8', from: 't-r-settings', duration: 0.45 }, 0.3),
      on('silly', { type: 'cursorMove', who: 'callum', to: { x: 830, y: 420 }, duration: 0.7 }),
    ],
  },
  {
    kind: 'line',
    id: 's2-02',
    scene: 2,
    speaker: 'agent',
    text: "I'm leaving that one alone until you've finished.",
  },
  { kind: 'beat', id: 's2-settle', scene: 2, duration: 0.8 },

  // Scene 3: Disagreement
  {
    kind: 'line',
    id: 's3-01',
    scene: 3,
    speaker: 'agent',
    text: "Mine's up. Four groups by job: Build, Engage, Measure, Account. No duplicates.",
    events: [
      at(0, { type: 'camera', zone: 'AB', duration: 1.3 }),
      at(0.3, { type: 'cursorMove', who: 'callum', to: { x: 840, y: 330 }, duration: 0.6 }),
      on('Build', { type: 'cursorMove', who: 'agent', to: 'B.build', duration: 0.35 }),
      on('Engage', { type: 'cursorMove', who: 'agent', to: 'B.engage', duration: 0.35 }),
      on('Measure', { type: 'cursorMove', who: 'agent', to: 'B.measure', duration: 0.35 }),
      on('Account', { type: 'cursorMove', who: 'agent', to: 'B.account', duration: 0.35 }),
    ],
  },
  {
    kind: 'line',
    id: 's3-02',
    scene: 3,
    speaker: 'callum',
    text: "It's tidy, but I don't think it survives real customers. I was on calls last week. Developers live in Harbor, marketers live in Relay, and they're different people. Your Measure group puts server logs next to campaign analytics. No marketer wants that.",
    events: [
      on('Developers', { type: 'cursorMove', who: 'callum', to: 'a-h-deployments', duration: 0.5 }),
      on('marketers', { type: 'cursorMove', who: 'callum', to: 'a-r-campaigns', duration: 0.5 }),
      on('Your', { type: 'cursorMove', who: 'callum', to: 'b-logs', duration: 0.55 }),
      on('Measure', { type: 'ring', who: 'callum', cards: ['b-analytics', 'b-logs'], duration: 5.5, includeTitle: true }),
    ],
  },
  {
    kind: 'line',
    id: 's3-03',
    scene: 3,
    speaker: 'agent',
    text: "I didn't have that, and it changes my view. If they're different people, grouping by job puts two audiences in one menu. I'll drop Measure.",
    events: [
      on('two', { type: 'cursorMove', who: 'agent', to: 'b-logs', duration: 0.6 }),
      on('menu', { type: 'drag', who: 'agent', card: 'b-logs', to: 'B.build.4', duration: 0.7 }),
      on('menu', { type: 'cursorMove', who: 'agent', to: 'b-analytics', duration: 0.4 }, 0.75),
      on('menu', { type: 'drag', who: 'agent', card: 'b-analytics', to: 'B.engage.4', duration: 0.75 }, 1.2),
      on('menu', { type: 'removeGroup', group: 'B.measure' }, 2.0),
    ],
  },
  {
    kind: 'line',
    id: 's3-04',
    scene: 3,
    speaker: 'agent',
    text: "But I'm keeping one part. Every suite I looked at has one account area, even the four that keep their products apart. And our own decision log says Billing is already one system.",
    events: [
      on('keeping', { type: 'cursorMove', who: 'agent', to: 'note.1', duration: 0.8 }),
      on('Every', { type: 'pulse', target: 'note.1', duration: 3 }),
      on('our', { type: 'cursorMove', who: 'agent', to: 'note.2', duration: 0.5 }),
      on('our', { type: 'pulse', target: 'note.2', duration: 3 }, 0.2),
    ],
  },
  {
    kind: 'line',
    id: 's3-05',
    scene: 3,
    speaker: 'callum',
    text: "Account is owned by another team. It's out of scope for us.",
    events: [on('Account', { type: 'cursorMove', who: 'callum', to: 'B.account', duration: 0.5 })],
  },
  {
    kind: 'line',
    id: 's3-06',
    scene: 3,
    speaker: 'agent',
    text: "I'd push back on that. It's what customers with both products complain about most, and it's the cheapest part to fix. If we leave it out, we ship a switcher and the complaints stay. I'd rather we draw it in and mark who owns it. It's your call, though.",
    events: [
      on('customers', { type: 'cursorMove', who: 'agent', to: 'b-billing', duration: 0.8 }),
      on('ship', { type: 'cursorMove', who: 'agent', to: 'a-switcher', duration: 0.9 }),
      on('rather', { type: 'cursorMove', who: 'agent', to: 'b-people', duration: 0.9 }),
      on('draw', { type: 'ring', who: 'agent', cards: ['b-people', 'b-billing', 'b-settings', 'b-integrations'], duration: 4.5, includeTitle: true }),
    ],
  },
  {
    kind: 'line',
    id: 's3-07',
    scene: 3,
    speaker: 'callum',
    text: "(pause) No, that's fair. Put it in and flag it as a dependency.",
    gapBefore: 1.5,
    events: [on('Put', { type: 'cursorMove', who: 'callum', to: { x: 1000, y: 590 }, duration: 0.7 })],
  },

  // Scene 4: Building the third option
  {
    kind: 'line',
    id: 's4-01',
    scene: 4,
    speaker: 'callum',
    text: 'So, keep the two apart, but name them for the people, not the products. And one Account area.',
    gapBefore: 0.9,
    events: [
      at(-0.8, { type: 'camera', zone: 'all', duration: 1.4 }),
      at(-0.5, { type: 'zone', zone: 'C' }),
      at(0, { type: 'cursorMove', who: 'callum', to: 'C.build', duration: 0.6 }),
      on('two', { type: 'createGroup', group: 'C.build', title: 'Build', subtitle: 'Workspace · developers' }),
      on('apart', { type: 'cursorMove', who: 'callum', to: 'C.engage', duration: 0.35 }),
      on('name', { type: 'createGroup', group: 'C.engage', title: 'Engage', subtitle: 'Workspace · marketers' }),
      // He drags the Harbor items in from his own option, then the Engage group from the agent's.
      on('people', { type: 'cursorMove', who: 'callum', to: 'a-h-sites', duration: 0.45 }),
      ...cBuild.map((s, i) =>
        on('people', { type: 'createCard', who: 'callum', card: `c-${s}`, label: title(s), slot: `C.build.${i}`, from: `a-h-${s}`, duration: 0.85 }, 0.5),
      ),
      on('people', { type: 'cursorMove', who: 'callum', to: 'b-audiences', duration: 0.45 }, 1.45),
      ...cEngage.map((s, i) =>
        on('people', { type: 'createCard', who: 'callum', card: `c-${s}`, label: title(s), slot: `C.engage.${i}`, from: `b-${s}`, duration: 0.85 }, 1.95),
      ),
      // The agent brings its Account group across.
      on('products', { type: 'cursorMove', who: 'agent', to: 'b-people', duration: 0.8 }),
      on('And', { type: 'createGroup', group: 'C.account', title: 'Account', subtitle: 'Appears once' }),
      ...cAccount.map((s, i) => on('Account', { type: 'drag', who: 'agent', card: `b-${s}`, to: `C.account.${i}`, duration: 1.0 })),
      on('Account', { type: 'removeGroup', group: 'B.account' }, 0.2),
      on('Account', { type: 'tag', target: 'C.account', text: 'Dependency: Account team' }, 1.3),
    ],
  },
  {
    kind: 'line',
    id: 's4-02',
    scene: 4,
    speaker: 'agent',
    text: "Yes. And there's one thing both groups touch. Marketers publish to sites, developers run them. What if Sites is the one item that shows in both?",
    events: [
      at(0.2, { type: 'camera', zone: 'C', duration: 1.5 }),
      at(0.3, { type: 'cursorMove', who: 'callum', to: { x: 1010, y: 960 }, duration: 0.8 }),
      on('thing', { type: 'cursorMove', who: 'agent', to: 'c-sites', duration: 0.8 }),
      on('touch', { type: 'hold', who: 'agent', card: 'c-sites' }),
      on('What', { type: 'release', card: 'c-sites' }),
      // Engage makes room at the top, then the linked copy goes in.
      ...cEngage.map((s, i) => on('Sites', { type: 'drag', card: `c-${s}`, to: `C.engage.${i + 1}`, duration: 0.4 }, 0, 2)),
      on('shows', { type: 'createCard', who: 'agent', card: 'c-sites-link', label: 'Sites', slot: 'C.engage.0', from: 'c-sites', duration: 0.8 }),
      on('shows', { type: 'link', from: 'c-sites', to: 'c-sites-link' }, 0.9),
    ],
  },
  {
    kind: 'line',
    id: 's4-03',
    scene: 4,
    speaker: 'callum',
    text: 'As the join between the two. I like that. Then the nav opens on whichever workspace matches your role.',
    events: [
      on('join', { type: 'cursorMove', who: 'callum', to: { x: 928, y: 742 }, duration: 0.5 }),
      on('opens', { type: 'cursorMove', who: 'callum', to: 'C.build', duration: 0.5 }),
      on('whichever', { type: 'ring', who: 'callum', cards: cBuild.map((s) => `c-${s}`), duration: 2.6, includeTitle: true }),
      on('opens', { type: 'cursorMove', who: 'agent', to: { x: 1150, y: 950 }, duration: 0.9 }),
    ],
  },
  {
    kind: 'line',
    id: 's4-04',
    scene: 4,
    speaker: 'agent',
    text: "That's better than either of the two we drew. One thing I'm unsure about: opening by role could hide things from people who do both jobs. I'd want to test it before we commit.",
    events: [
      at(0.1, { type: 'camera', zone: 'all', duration: 1.6 }),
      on('either', { type: 'cursorMove', who: 'agent', to: { x: 1020, y: 575 }, duration: 0.9 }),
      on('hide', { type: 'cursorMove', who: 'agent', to: 'c-content', duration: 0.9 }),
      on('either', { type: 'cursorMove', who: 'callum', to: { x: 700, y: 760 }, duration: 0.7 }),
    ],
  },
  { kind: 'line', id: 's4-05', scene: 4, speaker: 'callum', text: 'Agreed. Can you write it up?' },
  {
    kind: 'line',
    id: 's4-06',
    scene: 4,
    speaker: 'agent',
    text: "Doing it now. I'll include where we disagreed and what changed, so it's there next time.",
    events: [on('include', { type: 'cursorMove', who: 'agent', to: { x: 1330, y: 800 }, duration: 0.9 })],
  },
  {
    kind: 'beat',
    id: 's4-hold',
    scene: 4,
    duration: 3.0,
    events: [at(0.4, { type: 'dim', zones: ['today', 'A', 'B'] }), at(0.4, { type: 'highlight', zone: 'C' })],
  },

  // Scene 5: Decision record (text only). Content and timing live in `record` above.
  { kind: 'beat', id: 's5-record', scene: 5, duration: record.timing.duration, events: [at(0, { type: 'view', to: 'record' })] },
];

export const lines = script.filter((s): s is Line => s.kind === 'line');
