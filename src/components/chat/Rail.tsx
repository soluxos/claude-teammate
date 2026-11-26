import { AnimatePresence, motion } from 'framer-motion';
import { useSnap } from '../../engine/context';
import { session } from '../../script/script';
import { Mark } from '../Mark';

/** Beside the canvas: the brief the assistant takes down as Callum explains the problem. */
export function Rail() {
  const { state, instant } = useSnap();
  return (
    <div className="rail">
      <div className="rail-head">
        <Mark size={18} />
        <span>{session.title}</span>
      </div>
      <div className="rail-label">Session brief</div>
      <div className="rail-thread">
        {state.brief.length === 0 && <p className="rail-empty">The assistant notes what you are working on here as you explain it.</p>}
        <AnimatePresence initial={false}>
          {state.brief.map((item) => (
            <motion.div
              key={item.label}
              className="brief-item"
              data-kind={item.label.includes('idea') ? 'idea' : undefined}
              initial={instant ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <span>{item.label}</span>
              {item.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="rail-live">
        <span className="live-dot" /> Working session in progress
      </div>
    </div>
  );
}
