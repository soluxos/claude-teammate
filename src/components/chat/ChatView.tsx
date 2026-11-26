import { useEffect, useRef } from 'react';
import { formatTime, usePlayer, useSnap, useTime } from '../../engine/context';
import { chat, record } from '../../script/script';
import { Mark } from '../Mark';
import { DecisionCard } from './DecisionCard';

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const progress = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

/** Reveals whole words, so streamed text never shows half a word. */
export function streamed(text: string, p: number): string {
  if (p >= 1) return text;
  const words = text.split(' ');
  return words.slice(0, Math.floor(p * words.length)).join(' ');
}

export function ChatView() {
  const player = usePlayer();
  const t = useTime();
  const { atGate } = useSnap();
  const tl = player.timeline;
  const c = chat.timing;
  const recordStart = tl.starts['s5-record'];
  const inRecord = t >= recordStart;
  const sessionStarted = t >= tl.gate;

  const typed = t < c.send ? chat.callum.slice(0, Math.floor(progress(t, c.typeStart, c.typeEnd) * chat.callum.length)) : '';
  const sent = t >= c.send;
  const replyP = progress(t, c.replyStart, c.replyEnd);
  const recordP = progress(t - recordStart, record.timing.streamStart, record.timing.streamEnd);

  const thread = useRef<HTMLDivElement>(null);
  const recordMsg = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = thread.current;
    // In the closing scene, bring the decision record to the top of the column.
    if (el) el.scrollTop = inRecord && recordMsg.current ? recordMsg.current.offsetTop - el.offsetTop - 8 : 0;
  }, [inRecord, recordP]);

  return (
    <div className="chat">
      <header className="chat-head">{chat.title}</header>
      <div className="thread" ref={thread}>
        <div className="thread-inner">
          {sent && <div className="msg-user">{chat.callum}</div>}
          {sent && (
            <div className="msg-agent">
              <div className="msg-agent-mark" data-thinking={replyP === 0}>
                <Mark size={22} />
              </div>
              <div className="msg-agent-body">
                <p>{streamed(chat.agent, replyP)}</p>
                {t >= c.button &&
                  (sessionStarted ? (
                    <div className="session-chip">
                      <span className="session-chip-dot" />
                      Working session{inRecord ? ` · ${formatTime(recordStart - tl.gate)} · Callum and Assistant` : ' in progress'}
                    </div>
                  ) : (
                    <button className="btn-primary start-button" data-ready={atGate} onClick={() => player.startSession()}>
                      {chat.button}
                    </button>
                  ))}
              </div>
            </div>
          )}
          {inRecord && (
            <div className="msg-agent record-msg" ref={recordMsg}>
              <div className="msg-agent-mark">
                <Mark size={22} />
              </div>
              <div className="msg-agent-body">
                <DecisionCard progress={recordP} />
                {t - recordStart >= record.timing.saved && (
                  <div className="saved-line">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {record.saved}
                  </div>
                )}
                {t - recordStart >= record.timing.replay && (
                  <button className="btn-secondary replay-button" onClick={() => player.restart()}>
                    Replay
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="composer-wrap">
        <div className="composer">
          <div className="composer-text" data-empty={!typed}>
            {typed || 'Reply to Assistant'}
            {typed && <span className="caret" />}
          </div>
          <div className="composer-row">
            <span className="composer-plus">+</span>
            <span className="composer-send" data-active={!!typed}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 13V3M8 3L3.5 7.5M8 3l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
