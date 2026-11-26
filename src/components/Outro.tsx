import { AnimatePresence, motion } from 'framer-motion';
import { usePlayer, useSnap } from '../engine/context';
import { record } from '../script/script';

// What happened in the session, in the brief's own terms.
const split = [
  { label: 'Claude did on its own', text: 'Researched six suites, read the decision log, built its own option, and wrote up the decision.' },
  { label: 'Claude checked first', text: 'Said it disagreed before writing anything up, and asked before pulling Account into scope.' },
  { label: 'You still decided', text: 'What was in scope, which structure to go with, and to test it before committing.' },
];

// Everything people do with Claude alone in chat today could be a session instead.
const uses = [
  { title: 'Designing a UI', text: 'Mocks up a rival layout beside yours, and says which one it would ship.' },
  { title: 'Building a prototype', text: 'Wires up the flow while you shape it, and flags what won’t hold up.' },
  { title: 'Writing code', text: 'Questions the approach before you build it, then takes the tests while you do.' },
  { title: 'Writing and research', text: 'Brings the evidence while you talk, and drafts the case against your idea.' },
];

/** The prototype's closing screen, outside Claude's interface like the start screen. */
export function Outro() {
  const player = usePlayer();
  const { state, instant } = useSnap();
  const open = state.view === 'outro';
  const backToRecord = () => {
    player.pause();
    player.seek(player.timeline.starts['s5-record'] + record.timing.replay);
  };
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="outro"
          initial={instant ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="outro-inner">
            <div className="start-kicker">Teammate · what you just saw</div>
            <h1>Claude did more of the work. You still made the calls.</h1>
            <div className="outro-split">
              {split.map((s) => (
                <div key={s.label}>
                  <span>{s.label}</span>
                  {s.text}
                </div>
              ))}
            </div>

            <h2>Not just navigation. Anything you do with Claude alone today.</h2>
            <div className="outro-uses">
              {uses.map((u) => (
                <div key={u.title}>
                  <b>{u.title}</b>
                  {u.text}
                </div>
              ))}
            </div>

            <div className="outro-go">
              <button className="outro-primary" onClick={() => player.restart()}>
                Replay
              </button>
              <button className="outro-secondary" onClick={backToRecord}>
                Back to the decision record
              </button>
              <small>Assumes models a year or two better: quick enough to research mid-sentence, with the judgement to disagree well.</small>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
