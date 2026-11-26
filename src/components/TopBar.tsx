import { session } from '../script/script';
import { Icon } from './Icon';

/** Claude's page header: where you are, and Share. */
export function TopBar() {
  return (
    <header className="topbar">
      <span className="topbar-crumb">Teammate</span>
      <span className="topbar-sep">/</span>
      <span className="topbar-title">
        {session.title} <Icon name="chevron" size={16} />
      </span>
      <span className="topbar-share">
        <Icon name="share" size={18} /> Share
      </span>
    </header>
  );
}
