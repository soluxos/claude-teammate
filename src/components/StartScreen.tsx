import { formatTime, usePlayer, useSnap } from '../engine/context';

/** The prototype's own front door, deliberately outside Claude's interface. Starting is the gesture that unlocks audio. */
export function StartScreen() {
  const player = usePlayer();
  const { fresh } = useSnap();
  if (!fresh) return null;
  return (
    <div className="start">
      <div className="start-inner">
        <div className="start-kicker">Concept prototype</div>
        <h1>Teammate</h1>
        <p>
          A concept for Claude. Instead of taking turns in a chat, you and Claude join a live working session: a call over a shared board, where you
          think out loud, disagree, and reach an answer neither of you had at the start.
        </p>
        <ol>
          <li>Open Teammate from Claude's navigation</li>
          <li>Start a session and brief Claude out loud</li>
          <li>Work side by side, then compare and combine</li>
          <li>Get a decision record back in chat</li>
        </ol>
        <button autoFocus onClick={() => player.restart()}>
          Play the demo
        </button>
        <small>Sound on · {formatTime(player.timeline.total)} · best viewed at 1440 × 900</small>
      </div>
    </div>
  );
}
