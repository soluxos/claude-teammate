import { usePlayer, useSnap } from '../../engine/context';
import { formatTime } from '../../engine/context';
import { session } from '../../script/script';

/** The first thing a viewer sees. Joining is the gesture that unlocks audio; the call starts at once. */
export function JoinOverlay() {
  const player = usePlayer();
  const { fresh } = useSnap();
  if (!fresh) return null;
  return (
    <div className="join">
      <div className="join-card">
        <div className="join-kicker">Teammate · working session</div>
        <h1>{session.title}</h1>
        <p>A live call over a shared board. You and Claude work the problem out together.</p>
        <div className="join-people">
          <span className="participant callum">
            <span className="avatar">C</span> Callum
          </span>
          <span className="participant agent">
            <span className="avatar">✦</span> Claude
          </span>
        </div>
        <button className="btn-primary" autoFocus onClick={() => player.restart()}>
          {session.join}
        </button>
        <small>Sound on · {formatTime(player.timeline.total)}</small>
      </div>
    </div>
  );
}
