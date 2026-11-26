import { AnimatePresence, motion } from 'framer-motion';
import { usePlayer, useSnap } from '../engine/context';
import { record } from '../script/script';

// What I would do next, as the brief asks. Same layout as the start screen.
const next = [
  {
    label: 'Beyond this example',
    text: 'Run the same session for designing a UI, building a prototype and writing code: anywhere people work with Claude on their own today.',
  },
  {
    label: 'Test it with people',
    text: 'Put real designers and engineers in sessions, and watch for when pushback helps and when it gets in the way.',
  },
  {
    label: 'Set how hard it pushes',
    text: 'Let people choose between a Claude that challenges them and one that backs them up, and change it per session.',
  },
  {
    label: 'Make it live',
    text: 'Swap the script for a real model, so Claude reacts to what you actually say and draw.',
  },
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
          className="start outro"
          initial={instant ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="start-inner">
            <div className="start-kicker">Teammate · next steps</div>
            <h1>What I’d do next.</h1>
            <dl className="start-brief">
              {next.map((n) => (
                <div key={n.label}>
                  <dt>{n.label}</dt>
                  <dd>{n.text}</dd>
                </div>
              ))}
            </dl>
            <div className="start-go">
              <button onClick={() => player.restart()}>Replay</button>
              <button className="start-secondary" onClick={backToRecord}>
                Back to the decision record
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
