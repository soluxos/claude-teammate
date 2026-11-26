import { formatTime, usePlayer, useSnap } from '../engine/context';
import { harborNav, relayNav } from '../script/layouts';

// Items both products have: the duplication customers with both products live with today.
const twice = new Set(['Billing', 'Settings', 'Team', 'Users']);

const behaviours = [
  'Says what it thinks before doing what it was asked',
  'Works on its own idea while you work on yours',
  'Brings research and past decisions, unprompted',
  'Changes its mind out loud, and says what changed it',
  'Pushes back on a point it still believes, then leaves the call to you',
  'Writes down what was decided, and who changed whose mind',
];

function MiniNav({ name, who, items }: { name: string; who: string; items: string[] }) {
  return (
    <div className="sp-nav">
      <div className="sp-nav-head">
        <b>{name}</b>
        <span>{who}</span>
      </div>
      {items.map((item) => (
        <div key={item} className="sp-nav-item" data-twice={twice.has(item) || undefined}>
          {item}
        </div>
      ))}
    </div>
  );
}

/** The prototype's own front door, deliberately outside Claude's interface. Starting is the gesture that unlocks audio. */
export function StartScreen() {
  const player = usePlayer();
  const { fresh } = useSnap();
  if (!fresh) return null;
  return (
    <div className="start">
      <div className="start-inner">
        <section className="start-why">
          <div className="start-kicker">Concept prototype · Teammate, a new mode for Claude</div>
          <h1>
            Claude works <em>for</em> you, or <em>instead of</em> you.
            <br />
            Never <em>with</em> you.
          </h1>
          <p className="start-lede">On open-ended problems, chat is turn-taking, so one side is always leading.</p>
          <div className="start-sides">
            <div>
              <span>When you lead</span>
              Claude agrees too easily. You get your own idea back, polished.
            </div>
            <div>
              <span>When Claude leads</span>
              You get a finished answer you can only accept or reject.
            </div>
          </div>
          <p className="start-cost">
            Either way, the thinking that matters (holding a view, defending it, changing it for a good reason) happens on one side alone. You end up
            being your own colleague.
          </p>
          <div className="start-answer">
            <span>The idea</span>
            <p>
              <b>Teammate</b> puts you and Claude on a live call over a shared canvas. You each take a position, work in parallel, disagree, and land
              on an answer neither of you started with.
            </p>
          </div>
          <div className="start-go">
            <button autoFocus onClick={() => player.restart()}>
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                <path d="M3 1.8v8.4L10 6z" fill="currentColor" />
              </svg>
              Play the demo
            </button>
            <small>Sound on · {formatTime(player.timeline.total)} · best at 1440 × 900</small>
          </div>
        </section>

        <section className="start-case">
          <div className="start-case-label">In this demo</div>
          <h2>Two products, two menus. Make them one.</h2>
          <p>
            A software company sells <b>Harbor</b>, where developers host websites, and <b>Relay</b>, where marketers run campaigns. A third of
            customers pay for both, and it feels like two separate apps.
          </p>
          <div className="sp-navs">
            <MiniNav name="Harbor" who="Developers" items={harborNav} />
            <MiniNav name="Relay" who="Marketers" items={relayNav} />
          </div>
          <div className="sp-legend">
            <i /> In both menus, so customers with both products see them twice (Team and Users are the same people)
          </div>
          <p className="start-setup">
            Callum, a designer, wants a product switcher. Claude wants to group by job. Neither is right.
          </p>
          <div className="start-watch">
            <div className="start-case-label">Watch Claude</div>
            <ol>
              {behaviours.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}
