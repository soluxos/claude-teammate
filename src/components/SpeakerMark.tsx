import type { Speaker } from '../script/script';

/**
 * The mark inside a speaker's round badge, drawn rather than typed:
 * a typed "✦" and "C" sit at different heights depending on the font, so they never line up.
 */
export function SpeakerMark({ who, size = 12 }: { who: Speaker; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden>
      {who === 'agent' ? (
        <path d="M6 1.4c.33 2.43 2.17 4.27 4.6 4.6-2.43.33-4.27 2.17-4.6 4.6-.33-2.43-2.17-4.27-4.6-4.6 2.43-.33 4.27-2.17 4.6-4.6z" fill="currentColor" />
      ) : (
        <path d="M8.55 4.35a3.05 3.05 0 1 0 0 3.3" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
      )}
    </svg>
  );
}
