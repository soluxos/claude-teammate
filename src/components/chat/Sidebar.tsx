import { useSnap } from '../../engine/context';
import { session } from '../../script/script';
import { Icon } from '../Icon';

const nav = [
  { icon: 'plus', label: 'New' },
  { icon: 'search', label: 'Search' },
  { icon: 'projects', label: 'Projects' },
  { icon: 'artifacts', label: 'Artifacts' },
  { icon: 'teammate', label: 'Teammate', badge: 'New' },
  { icon: 'customize', label: 'Customize' },
] as const;

const recents = ['Onboarding checklist copy', 'Research synthesis, round two', 'Empty states audit', 'Pricing page critique', 'Icon naming conventions'];

/** Claude's navigation, with the concept feature, Teammate, as one more item in it. */
export function Sidebar() {
  const view = useSnap().state.view;
  const selected = view === 'new' ? 'New' : 'Teammate';
  return (
    <aside className="sidebar">
      <div className="sb-top">
        <Icon name="sidebar" />
        <span className="wordmark">Claude</span>
        <div className="seg">
          <span className="on">
            <Icon name="chat" size={18} />
          </span>
          <span>
            <Icon name="code" size={18} />
          </span>
        </div>
      </div>
      <nav>
        {nav.map((item) => (
          <div key={item.label} className="sb-row" data-selected={item.label === selected} data-tour={item.label === 'Teammate' ? 'nav-teammate' : undefined}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
            {'badge' in item && <em>{item.badge}</em>}
          </div>
        ))}
      </nav>
      <div className="sb-label">
        Teammate sessions <Icon name="chevron" size={14} />
      </div>
      <ul>
        {view === 'record' && <li className="selected">{session.title}</li>}
        <li>Checkout flow review</li>
      </ul>
      <div className="sb-label">
        Recents <Icon name="chevron" size={14} />
      </div>
      <ul className="grow">
        {recents.map((title) => (
          <li key={title}>{title}</li>
        ))}
      </ul>
      <div className="sb-user">
        <span className="avatar-sm">C</span>
        <span>Callum</span>
        <Icon name="chevron" size={14} />
      </div>
    </aside>
  );
}
