import { formatTime, usePlayer, useSnap } from '../engine/context';

/** The prototype's own front door, deliberately outside Claude's interface. Starting is the gesture that unlocks audio. */
export function StartScreen() {
  const player = usePlayer();
  const { fresh } = useSnap();
  if (!fresh) return null;
  return (
    <div className="start">
      <div className="start-inner">
        <div className="start-kicker">Teammate · concept prototype</div>
        <h1>
          Claude works <em>for</em> you, or <em>instead of</em> you.
          <br />
          Never <em>with</em> you.
        </h1>
        <p className="start-lede">Teammate puts you and Claude on a live call over a shared canvas, to work out a hard problem together.</p>
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
