import { chat } from '../../script/script';
import { Mark } from '../Mark';

const recents = [chat.title, 'Onboarding checklist copy', 'Research synthesis, round two', 'Empty states audit', 'Pricing page critique', 'Icon naming conventions'];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Mark /> <span>Assistant</span>
      </div>
      <button className="sidebar-new" tabIndex={-1}>
        <span>+</span> New conversation
      </button>
      <div className="sidebar-label">Recent</div>
      <ul>
        {recents.map((title, i) => (
          <li key={title} className={i === 0 ? 'selected' : undefined}>
            {title}
          </li>
        ))}
      </ul>
      <div className="sidebar-user">
        <span className="avatar person">C</span> Callum
      </div>
    </aside>
  );
}
