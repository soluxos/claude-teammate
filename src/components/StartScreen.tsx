import { formatTime, usePlayer, useSnap } from '../engine/context';

/** The prototype's own front door, deliberately outside Claude's interface. Starting is the gesture that unlocks audio. */
export function StartScreen() {
  const player = usePlayer();
  const { fresh } = useSnap();
  if (!fresh) return null;
  return (
    <div className="start">
      <div className="start-inner">
        <div className="start-kicker">Design exercise · concept prototype</div>
        <h1>
          <span>Teammate:</span> Claude as a colleague who pushes back.
        </h1>
        <dl className="start-brief">
          <div>
            <dt>The product</dt>
            <dd>Claude. I use it every day for design work, and it’s where I most want a second opinion.</dd>
          </div>
          <div>
            <dt>What isn’t good enough</dt>
            <dd>
              On open-ended problems, chat is turn-taking. I lead and Claude agrees, or Claude leads and I accept. Either way the real thinking
              stays with one of us.
            </dd>
          </div>
          <div>
            <dt>How an agent could do more</dt>
            <dd>
              Claude joins a live call over a shared canvas. It holds its own view, builds a rival idea alongside mine, brings research, and
              argues its case until we land on something better than either of us started with.
            </dd>
          </div>
        </dl>
        <div className="start-go">
          <button autoFocus onClick={() => player.restart()}>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <path d="M3 1.8v8.4L10 6z" fill="currentColor" />
            </svg>
            Play the demo
          </button>
          <small>Sound on · {formatTime(player.timeline.total)}</small>
        </div>
      </div>
    </div>
  );
}
