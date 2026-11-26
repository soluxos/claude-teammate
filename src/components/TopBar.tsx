import { Icon } from './Icon';

/** Claude's page header: where you are, and Share. */
export function TopBar({ crumbs = [] }: { crumbs?: string[] }) {
  return (
    <header className="topbar">
      {crumbs.map((crumb, i) =>
        i < crumbs.length - 1 ? (
          <span key={crumb} className="topbar-crumb">
            {crumb} <span className="topbar-sep">/</span>
          </span>
        ) : (
          <span key={crumb} className="topbar-title">
            {crumb} {crumbs.length > 1 && <Icon name="chevron" size={16} />}
          </span>
        ),
      )}
      <span className="topbar-share">
        <Icon name="share" size={18} /> Share
      </span>
    </header>
  );
}
