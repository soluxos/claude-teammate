import { formatTime, usePlayer, useSnap } from '../engine/context';

/** The prototype's own front door, deliberately outside Claude's interface. Starting is the gesture that unlocks audio. */
export function StartScreen() {
  const player = usePlayer();
  const { fresh } = useSnap();
  if (!fresh) return null;
  return (
    <div className="start">
      <div className="start-inner">
        <div className="start-kicker">Concept prototype · a new mode for Claude</div>
        <p className="start-problem">Today, Claude works for you, or instead of you. Never with you.</p>
        <h1>
          <span>Teammate:</span> Claude as a colleague who pushes back.
        </h1>
        <p className="start-lede">
          You and Claude meet on a live call over a shared canvas. Claude holds its own view, builds a competing idea alongside yours, and argues
          its case, until you land on an answer neither of you started with.
        </p>
        <div className="start-go">
          <button autoFocus onClick={() => player.restart()}>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <path d="M3 1.8v8.4L10 6z" fill="currentColor" />
            </svg>
            Play the demo
          </button>
          <small>Sound on · {formatTime(player.timeline.total)}</small>
        </div>
      </div>
    </div>
  );
}
