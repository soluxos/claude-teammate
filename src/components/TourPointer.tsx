import { useLayoutEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSnap } from '../engine/context';

/** The viewer's own mouse during the opening walkthrough: it finds its target on the page by data-tour name. */
export function TourPointer() {
  const { state, instant } = useSnap();
  const { to, clicks } = state.pointer;
  const [pos, setPos] = useState({ x: 760, y: 520 });

  useLayoutEffect(() => {
    if (!to) return;
    const el = document.querySelector(`[data-tour="${to}"]`);
    const host = document.querySelector('.product');
    if (!el || !host) return;
    const r = el.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    setPos({ x: r.left - h.left + Math.min(r.width / 2, 70), y: r.top - h.top + r.height / 2 });
  }, [to]);

  return (
    <motion.div
      className="tour-pointer"
      initial={false}
      animate={{ x: pos.x, y: pos.y, opacity: to ? 1 : 0 }}
      transition={{ x: { duration: instant ? 0 : 0.9, ease: [0.3, 0, 0.2, 1] }, y: { duration: instant ? 0 : 0.9, ease: [0.5, 0, 0.3, 1] }, opacity: { duration: 0.25 } }}
    >
      {clicks > 0 && !instant && <span key={clicks} className="tour-click" />}
      <svg width="22" height="22" viewBox="0 0 20 20" aria-hidden>
        <path d="M4 2.5l11.5 7-5 1.2-2.6 4.6L4 2.5z" fill="#0b0b0b" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    </motion.div>
  );
}
