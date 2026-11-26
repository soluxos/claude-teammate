import { memo } from 'react';
import type { Site } from '../../script/sites';

// Tiny generic glyphs for nav items, so each mock reads like a real app rather than a wireframe.
const glyphs = [
  <rect key="a" x="2" y="2" width="8" height="8" rx="2" />,
  <circle key="b" cx="6" cy="6" r="4" />,
  <path key="c" d="M2 3.5h8M2 6h8M2 8.5h5" />,
  <path key="d" d="M2 9.5V6M5 9.5V3M8 9.5V5M10.5 9.5H1.5" />,
  <path key="e" d="M6 2l4 2.3v3.4L6 10 2 7.7V4.3z" />,
  <path key="f" d="M2.5 4.5A1.5 1.5 0 014 3h4a1.5 1.5 0 011.5 1.5v3A1.5 1.5 0 018 9H5l-2.5 1.5z" />,
];
function Glyph({ i }: { i: number }) {
  return (
    <svg className="ms-glyph" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {glyphs[i % glyphs.length]}
    </svg>
  );
}

function Logo({ site }: { site: Site }) {
  return (
    <span className="ms-logo">
      <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden>
        <rect width="14" height="14" rx="3.5" fill={site.header === 'brand' ? '#fff' : site.brand} />
        <path d="M4 9.5L7 4l3 5.5" stroke={site.header === 'brand' ? site.brand : '#fff'} strokeWidth="1.6" fill="none" strokeLinejoin="round" />
      </svg>
      {site.name}
    </span>
  );
}

function Avatar({ letter }: { letter: string }) {
  return <span className="ms-avatar">{letter}</span>;
}

const statusTone = (v: string) => (/running|paid|won/i.test(v) ? 'good' : /stopped/i.test(v) ? 'bad' : /scheduled|proposal|qualified/i.test(v) ? 'mid' : undefined);

function Page({ site }: { site: Site }) {
  const p = site.page;
  return (
    <div className="ms-main">
      <div className="ms-page-head">
        <span>{p.title}</span>
        <span className="ms-btn" style={{ background: site.brand }}>
          New
        </span>
      </div>
      {p.kind === 'stats' && (
        <div className="ms-stats">
          {p.stats.map(([k, v]) => (
            <div key={k}>
              <small>{k}</small>
              {v}
            </div>
          ))}
        </div>
      )}
      {p.kind === 'table' && (
        <div className="ms-table">
          <div className="ms-tr ms-th">
            {p.columns.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          {p.rows.map((r) => (
            <div key={r[0]} className="ms-tr">
              {r.map((c, i) => (
                <span key={i} data-tone={i > 0 ? statusTone(c) : undefined}>
                  {c}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
      {p.kind === 'stats' && (
        <div className="ms-table">
          {p.rows.map((r) => (
            <div key={r[0]} className="ms-tr">
              {r.map((c, i) => (
                <span key={i} data-tone={i === 1 ? statusTone(c) : undefined}>
                  {c}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
      {p.kind === 'list' && (
        <div className="ms-list">
          {p.rows.map(([title, when], i) => (
            <div key={title}>
              <i style={{ background: i === 0 ? site.brand : undefined }} />
              <span>{title}</span>
              <small>{when}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** A believable screenshot of a fictional multi-product suite, drawn in HTML. Its account area is marked for highlighting. */
export const MockSite = memo(function MockSite({ site }: { site: Site }) {
  const { account } = site;
  const menuOpen = account.where === 'menu';
  let glyph = 0;
  return (
    <div className="ms" style={{ ['--brand' as string]: site.brand }} data-header={site.header}>
      <div className="ms-chrome">
        <i />
        <i />
        <i />
        <span className="ms-url">
          <svg width="7" height="8" viewBox="0 0 7 8" aria-hidden>
            <rect x="0.5" y="3.5" width="6" height="4" rx="1" fill="currentColor" />
            <path d="M1.8 3.5V2.4a1.7 1.7 0 013.4 0v1.1" stroke="currentColor" fill="none" />
          </svg>
          {site.url}
        </span>
      </div>
      <div className="ms-app">
        <div className="ms-top">
          <Logo site={site} />
          {site.switcher === 'tabs' && (
            <span className="ms-tabs">
              {site.products.map((p, i) => (
                <span key={p} data-on={i === 0}>
                  {p}
                </span>
              ))}
            </span>
          )}
          {site.switcher === 'dropdown' && (
            <span className="ms-dd">
              {site.products[0]}
              <svg width="7" height="7" viewBox="0 0 8 8" aria-hidden>
                <path d="M1.5 3l2.5 2.5L6.5 3" stroke="currentColor" fill="none" strokeWidth="1.2" />
              </svg>
              <span className="ms-dd-menu">
                <small>Switch product</small>
                {site.products.map((p, i) => (
                  <span key={p} data-on={i === 0}>
                    <b style={{ background: site.brand, opacity: 1 - i * 0.18 }} />
                    {site.name} {p}
                  </span>
                ))}
              </span>
            </span>
          )}
          {site.switcher === 'segmented' && (
            <span className="ms-seg">
              {site.products.map((p, i) => (
                <span key={p} data-on={i === 0}>
                  {p}
                </span>
              ))}
            </span>
          )}
          <span className="ms-search">Search</span>
          <span className="ms-me">
            <Avatar letter="J" />
            {menuOpen && (
              <span className="ms-menu" data-account>
                <small>{account.label}</small>
                {account.items.map((x) => (
                  <span key={x}>{x}</span>
                ))}
              </span>
            )}
          </span>
        </div>
        <div className="ms-body">
          {site.switcher === 'rail' && (
            <div className="ms-rail">
              {site.products.map((p, i) => (
                <span key={p} data-on={i === 0} title={p}>
                  {p[0]}
                </span>
              ))}
            </div>
          )}
          <div className="ms-side">
            {site.switcher === 'rail' && <div className="ms-side-title">{site.name} {site.products[0]}</div>}
            {site.nav.map((g, gi) => (
              <div key={gi} className="ms-group">
                {g.section && <div className="ms-section">{g.section}</div>}
                {g.items.map((item) => (
                  <div key={item} className="ms-item" data-on={item === site.active}>
                    <Glyph i={glyph++} />
                    {item}
                  </div>
                ))}
              </div>
            ))}
            {account.where === 'sidebar' && (
              <div className="ms-group" data-account>
                <div className="ms-section">{account.label}</div>
                {account.items.map((item) => (
                  <div key={item} className="ms-item">
                    <Glyph i={glyph++} />
                    {item}
                  </div>
                ))}
              </div>
            )}
            {account.where === 'footer' && (
              <div className="ms-foot" data-account>
                <Avatar letter="S" />
                {account.label}
              </div>
            )}
          </div>
          <Page site={site} />
        </div>
      </div>
    </div>
  );
});
