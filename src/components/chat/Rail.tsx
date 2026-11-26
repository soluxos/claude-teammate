import { session } from '../../script/script';
import { Icon } from '../Icon';
import { Transcript } from './Transcript';

/** Beside the canvas: the session's live transcript, kept so anyone can come back and see what happened. */
export function Rail() {
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
      <div className="rail-label">
        Transcript
        <span className="rail-live-pill">
          <span className="live-dot" /> Live
        </span>
      </div>
      <Transcript />
    </div>
  );
}
