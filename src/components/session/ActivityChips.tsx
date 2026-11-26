import { AnimatePresence, motion } from 'framer-motion';
import { useSnap } from '../../engine/context';

/** What the agent is doing in the background. Results land on the canvas as notes. */
export function ActivityChips() {
  const { state, instant } = useSnap();
  return (
    <div className="chips">
      <AnimatePresence initial={false}>
        {state.chips.map((chip) => (
          <motion.div
            key={chip.id}
            className="chip"
            data-done={chip.done}
            layout={!instant}
            initial={instant ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {chip.done ? (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M3 8.500l3.200 3L13 4.500" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <span className="spinner" />
            )}
            {chip.label}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
