import { optionC } from '../../script/layouts';
import { record } from '../../script/script';
import { streamed } from './ChatView';

const lengths = record.sections.map((s) => s.label.length + s.text.length);
const total = lengths.reduce((a, b) => a + b, 0);

/** The decision record, streamed section by section. */
export function DecisionCard({ progress }: { progress: number }) {
  let budget = progress * total;
  return (
    <div className="record">
      <h3>{record.title}</h3>
      <div className="record-main">
        {record.sections.map((s, i) => {
          const p = Math.max(0, Math.min(1, budget / lengths[i]));
          budget -= lengths[i];
          if (p <= 0) return null;
          return (
            <p key={s.label}>
              <strong>{s.label}</strong> {streamed(s.text, p)}
            </p>
          );
        })}
      </div>
      <figure className="record-thumb" data-shown={progress > 0.08}>
        <div className="thumb-cols">
          {optionC.map((col) => (
            <div key={col.title} className="thumb-col">
              <div className="thumb-title">{col.title}</div>
              <div className="thumb-sub">{col.subtitle}</div>
              {col.items.map((item) => (
                <div key={item} className="thumb-item" data-shared={item === 'Sites'}>
                  {item}
                </div>
              ))}
            </div>
          ))}
          <span className="thumb-link" />
        </div>
        <figcaption>Option C · Sites shown in both workspaces</figcaption>
      </figure>
    </div>
  );
}
