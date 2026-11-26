import { AnimatePresence, motion } from 'framer-motion';
import { useSnap } from '../../engine/context';
import { sites } from '../../script/sites';
import { MockSite } from './MockSite';
import { SpeakerMark } from '../SpeakerMark';

/** Claude puts its research up over the canvas, the way someone shares their screen on a call. */
export function ShareOverlay() {
  const { state, instant } = useSnap();
  const open = state.share === 'research';
  const pulse = state.notes.research?.pulse ?? false;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="share"
          initial={instant ? false : { opacity: 0, y: 14, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.985 }}
          transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <div className="share-head">
            <span className="share-badge">
              <span className="share-avatar">
                <SpeakerMark who="agent" size={11} />
              </span> Claude is sharing
            </span>
            <span className="share-title">How 6 multi-product suites handle their navigation</span>
          </div>
          <div className="share-grid" data-pulse={pulse}>
            {sites.map((site) => (
              <figure key={site.name}>
                <MockSite site={site} />
                <figcaption>
                  <b>{site.name}</b> · {site.summary} · <span>one account area</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="share-foot">
            <b>4 of 6</b> keep their products apart. <b>All 6</b> have a single account, billing and people area.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
