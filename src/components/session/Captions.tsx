import { usePlayer, useSnap, useTime } from '../../engine/context';
import { splitDirection } from '../../script/script';

const NAMES = { callum: 'Callum', agent: 'Assistant' } as const;

export function Captions() {
  const player = usePlayer();
  const t = useTime();
  const { captions } = useSnap();
  // Hold the caption briefly after the line ends so it does not flicker between lines.
  // During an interruption the newer line takes over.
  const line = player.linesAt(t, 0.35).pop();
  if (!captions || !line) return null;
  const local = t - line.start;
  const { direction } = splitDirection(line.line.text);
  let current = -1;
  line.words.forEach((w, i) => {
    if (local >= w.start) current = i;
  });
  return (
    <div className={`captions ${line.line.speaker}`} aria-live="off">
      <span className="caption-name">{NAMES[line.line.speaker]}</span>
      <p>
        {direction && <em>({direction}) </em>}
        {line.words.map((w, i) => (
          <span key={i} className={i === current ? 'now' : i < current ? 'said' : undefined}>
            {w.word}{' '}
          </span>
        ))}
      </p>
    </div>
  );
}
