import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSnap } from '../../engine/context';
import { session } from '../../script/script';
import { Icon } from '../Icon';
import { Transcript } from './Transcript';

type Tab = 'brief' | 'transcript';

/** Beside the canvas: the brief Claude takes down as Callum explains the problem, and the session's transcript. */
export function Rail() {
  const { state, instant } = useSnap();
  const [tab, setTab] = useState<Tab>('brief');
  return (
    <div className="rail">
      <div className="rail-head">
        <Icon name="sidebar" />
        <span className="wordmark">Claude</span>
      </div>
      <div className="rail-title">
        <span>Teammate</span>
        {session.title}
      </div>
      <div className="rail-tabs" role="tablist">
        {(
          [
            ['brief', 'Session brief'],
            ['transcript', 'Transcript'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'brief' ? (
        <div className="rail-thread" role="tabpanel">
          {state.brief.length === 0 && <p className="rail-empty">Claude notes what you are working on here as you explain it.</p>}
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
      ) : (
        <Transcript />
      )}
      <div className="rail-live">
        <span className="live-dot" /> Working session in progress
      </div>
    </div>
  );
}
