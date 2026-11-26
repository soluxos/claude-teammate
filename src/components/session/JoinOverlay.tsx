import { usePlayer, useSnap } from '../../engine/context';
import { formatTime } from '../../engine/context';
import { session } from '../../script/script';
import { Mark } from '../Mark';

/** The first thing a viewer sees. Joining is the gesture that unlocks audio; the call starts at once. */
export function JoinOverlay() {
  const player = usePlayer();
  const { fresh } = useSnap();
  if (!fresh) return null;
  return (
    <div className="join">
      <div className="join-card">
        <Mark size={30} />
        <div className="join-kicker">Working session</div>
        <h1>{session.title}</h1>
        <p>A live call over a shared board. You and the assistant work the problem out together.</p>
        <div className="join-people">
          <span className="participant callum">
            <span className="avatar">C</span> Callum
          </span>
          <span className="participant agent">
            <span className="avatar">A</span> Assistant
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
