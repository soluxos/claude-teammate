import { syntheticLevel } from '../../engine/audio';
import { formatTime, useAudio, usePlayer, useSnap, useTime } from '../../engine/context';
import type { Speaker } from '../../script/script';

const people: { who: Speaker; name: string; initial: string }[] = [
  { who: 'callum', name: 'Callum', initial: 'C' },
  { who: 'agent', name: 'Claude', initial: '✦' },
];

export function CallBar() {
  const player = usePlayer();
  const audio = useAudio();
  const t = useTime();
  const { captions, playing } = useSnap();
  const lines = player.linesAt(t); // two while one speaker is interrupting the other
  const { starts } = player.timeline;
  const elapsed = Math.min(t, starts['s5-record']) - starts['s1-open'];

  return (
    <div className="callbar">
      {people.map((p) => {
        const line = lines.filter((l) => l.line.speaker === p.who).pop();
        const speaking = !!line;
        // Real loudness from the analyser when audio is sounding, otherwise a synthetic envelope.
        const level = line && playing ? (audio.level(line) ?? syntheticLevel(line, t)) : 0;
        return (
          <div key={p.who} className={`participant ${p.who}`} data-speaking={speaking}>
            <span className="avatar-ring" style={{ boxShadow: `0 0 0 ${speaking ? 2 + level * 7 : 0}px var(--ring)` }}>
              <span className="avatar">{p.initial}</span>
            </span>
            {p.name}
          </div>
        );
      })}
      <span className="callbar-timer">{formatTime(elapsed)}</span>
      <span className="callbar-sep" />
      <button className="icon-btn" tabIndex={-1} aria-label="Mute (decorative)" title="Mute">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <rect x="5.7" y="1.5" width="4.6" height="8" rx="2.3" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3.2 7.5a4.8 4.8 0 009.6 0M8 12.3v2.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
      <button className="icon-btn" data-on={captions} aria-pressed={captions} aria-label="Captions" title="Captions" onClick={() => player.setCaptions(!captions)}>
        CC
      </button>
      <button className="icon-btn leave" tabIndex={-1} aria-label="Leave (decorative)" title="Leave">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path d="M2.2 10.6c0-1 .5-1.900 1.500-2.300a14 14 0 0110.600 0c1 .4 1.500 1.300 1.500 2.300v.6c0 .500-.4.900-.900.800l-2.300-.4a.9.9 0 01-.7-.9v-1a9 9 0 00-5.800 0v1c0 .4-.3.8-.7.900l-2.300.4a.8.8 0 01-.9-.8v-.6z" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
