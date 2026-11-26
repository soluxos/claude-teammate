// Sanity check: every word anchor resolves, every event applies, and the runtime is in range.
import { script } from '../src/script/script';
import { buildTimeline, stateAt } from '../src/engine/timeline';

const warnings: string[] = [];
console.warn = (...a: unknown[]) => void warnings.push(a.join(' '));
const tl = buildTimeline(script);
const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
for (const s of tl.scenes) console.log(`scene ${s.index}  ${fmt(s.start)}  ${s.name}`);
console.log(`total ${fmt(tl.total)} (${tl.total.toFixed(1)}s), ${tl.lines.length} lines, ${tl.prims.length} primitive events`);
const end = stateAt(tl, tl.total).state;
const col = (x: number, zone: string) =>
  Object.values(end.cards).filter((c) => c.zone === zone && c.x === x).sort((a, b) => a.y - b.y).map((c) => c.label).join(', ');
console.log('Option C  Build:', col(771, 'C'), '| Engage:', col(945, 'C'), '| Account:', col(1119, 'C'));
console.log('Option B left:', Object.values(end.cards).filter((c) => c.zone === 'B').map((c) => c.label).join(', '));
console.log('links', end.links.length, 'tags', end.tags.map((t) => t.text), 'notes', Object.keys(end.notes), 'groups', Object.keys(end.groups).join(' '));
const s304 = tl.starts['s3-04'];
console.log('notes present before s3-04:', Object.keys(stateAt(tl, s304).state.notes).length === 2);
if (warnings.length) { console.log(warnings.join('\n')); process.exit(1); }
if (tl.total < 150 || tl.total > 240) { console.log('Runtime outside 2.5 to 4 minutes'); process.exit(1); }
