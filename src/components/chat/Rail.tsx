import { chat } from '../../script/script';
import { Mark } from '../Mark';

/** The chat, collapsed beside the canvas: the last two messages. */
export function Rail() {
  return (
    <div className="rail">
      <div className="rail-head">
        <Mark size={18} />
        <span>{chat.title}</span>
      </div>
      <div className="rail-thread">
        <div className="rail-user">{chat.callum}</div>
        <div className="rail-agent">{chat.agent}</div>
      </div>
      <div className="rail-live">
        <span className="live-dot" /> Working session in progress
      </div>
    </div>
  );
}
