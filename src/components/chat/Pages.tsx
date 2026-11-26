import { usePlayer, useTime } from '../../engine/context';
import { session, tour } from '../../script/script';
import { Icon } from '../Icon';
import { TopBar } from '../TopBar';

/** Claude's New page: where the viewer starts. */
export function NewPage() {
  return (
    <div className="page page-new">
      <TopBar />
      <div className="page-center">
        <h1>Afternoon, Callum</h1>
        <div className="composer">
          <div className="composer-text">How can I help you today?</div>
          <Icon name="enter" size={18} />
        </div>
        <div className="composer-row">
          <Icon name="plus" size={18} />
          <Icon name="mic" size={18} />
        </div>
      </div>
    </div>
  );
}

/** The Teammate page: name what you want to work on and start a session. */
export function TeammatePage() {
  const player = usePlayer();
  const t = useTime() - player.timeline.starts['s0-tour'];
  const p = Math.max(0, Math.min(1, (t - tour.typeStart) / (tour.typeEnd - tour.typeStart)));
  const typed = session.title.slice(0, Math.round(p * session.title.length));
  return (
    <div className="page page-teammate">
      <TopBar crumbs={['Teammate']} />
      <div className="page-center">
        <h1>Work it out together</h1>
        <p className="page-lede">
          Start a live session with Claude: you both talk, think out loud and move things around on a shared board, then Claude writes up what you decided.
        </p>
        <div className="composer" data-tour="topic" data-focus={t >= 3.2 && p < 1}>
          <div className="composer-text" data-filled={typed.length > 0}>
            {typed || 'What do you want to work on?'}
            {t >= 3.2 && t < tour.duration && <span className="caret" />}
          </div>
          <span className="btn-primary start-session" data-tour="start">
            {session.start}
          </span>
        </div>
        <div className="composer-row">
          <Icon name="mic" size={18} />
          <span>Voice and a shared board</span>
        </div>
        <div className="past">
          <div className="past-label">Past sessions</div>
          <div className="past-row">
            <span>Checkout flow review</span>
            <em>Decision record saved · 2 days ago</em>
          </div>
        </div>
      </div>
    </div>
  );
}
