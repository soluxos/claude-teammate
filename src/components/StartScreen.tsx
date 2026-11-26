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
          <span>Teammate:</span> work with Claude like another person.
        </h1>
        <dl className="start-brief">
          <div>
            <dt>The product</dt>
            <dd>Claude. I use it every day for design work, and it’s where I most want a second opinion.</dd>
          </div>
          <div>
            <dt>What isn’t good enough</dt>
            <dd>Chat is turn-taking: I ask, Claude answers. It’s a tool I direct, not someone I think alongside.</dd>
          </div>
          <div>
            <dt>How an agent could do more</dt>
            <dd>
              Claude joins the way another teammate would. It has its own opinions and its own view on how to solve the task, researches in
              seconds, and reasons it through with me until we get somewhere neither of us would alone.
            </dd>
          </div>
        </dl>
        <div className="start-go">
          <button autoFocus onClick={() => player.restart()}>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <path d="M3 1.8v8.4L10 6z" fill="currentColor" />
            </svg>
            Play an example session
          </button>
          <small>Sound on · {formatTime(player.timeline.total)}</small>
        </div>
      </div>
    </div>
  );
}
