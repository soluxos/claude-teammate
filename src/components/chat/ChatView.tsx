import { useState } from 'react';
import { formatTime, usePlayer, useTime } from '../../engine/context';
import { record, session } from '../../script/script';
import { Icon } from '../Icon';
import { TopBar } from '../TopBar';
import { DecisionCard } from './DecisionCard';
import { Transcript } from './Transcript';

/** Reveals whole words, so streamed text never shows half a word. */
export function streamed(text: string, p: number): string {
  if (p >= 1) return text;
  const words = text.split(' ');
  return words.slice(0, Math.floor(p * words.length)).join(' ');
}

/** The chat the session returns to: one assistant message holding the decision record. */
export function ChatView() {
  const player = usePlayer();
  const t = useTime();
  const recordStart = player.timeline.starts['s5-record'];
  const local = t - recordStart;
  const r = record.timing;
  const [showTranscript, setShowTranscript] = useState(false);
  const recordP = Math.max(0, Math.min(1, (local - r.streamStart) / (r.streamEnd - r.streamStart)));

  return (
    <div className="chat page page-record">
      <TopBar crumbs={['Teammate', session.title]} />
      <div className="thread">
        <div className="thread-inner">
          <div className="session-chip">
            <span className="session-chip-dot" />
            Working session · {formatTime(recordStart - player.timeline.starts['s1-open'])} · Callum and Claude
          </div>
          {local >= 0.4 && (
            <div className="msg-agent">
              <div className="msg-agent-body">
                <DecisionCard progress={recordP} />
                {local >= r.saved && (
                  <div className="saved-line">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {record.saved}
                  </div>
                )}
                {local >= r.replay && (
                  <div className="record-actions">
                    <button className="btn-secondary" onClick={() => setShowTranscript((v) => !v)} aria-expanded={showTranscript}>
                      {showTranscript ? 'Hide transcript' : 'Read the transcript'}
                    </button>
                    <button className="btn-secondary" onClick={() => player.restart()}>
                      Replay
                    </button>
                  </div>
                )}
                {local >= r.replay && showTranscript && (
                  <div className="record-transcript">
                    <div className="record-transcript-head">Transcript · click any line to jump back to that moment</div>
                    <Transcript all />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="composer-wrap">
        <div className="composer">
          <div className="composer-text" data-empty="true">
            Reply to Claude
          </div>
          <Icon name="enter" size={18} />
        </div>
        <div className="composer-row">
          <Icon name="plus" size={18} />
          <Icon name="mic" size={18} />
          <span className="composer-mode">Teammate</span>
        </div>
      </div>
    </div>
  );
}
