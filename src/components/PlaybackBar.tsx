import { useRef } from 'react';
import { formatTime, useAudio, usePlayer, useSnap, useTime } from '../engine/context';

/** Prototype chrome, deliberately not part of the product UI. */
export function PlaybackBar() {
  const player = usePlayer();
  const audio = useAudio();
  const t = useTime();
  const { playing, speed, atGate } = useSnap();
  const tl = player.timeline;
  const track = useRef<HTMLDivElement>(null);
  const scene = player.sceneAt(t);

  const seekTo = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    player.seek(((clientX - r.left) / r.width) * tl.total);
  };
  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    seekTo(e.clientX);
  };
  const onMove = (e: React.PointerEvent) => {
    if (e.buttons & 1) seekTo(e.clientX);
  };
  const toggle = () => (atGate && !playing ? player.startSession() : player.toggle());

  return (
    <div className="playback">
      <span className="playback-tag">Prototype</span>
      <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} title="Play or pause (Space)">
        {playing ? (
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><rect x="2" y="1.500" width="3" height="9" rx="0.8" fill="currentColor" /><rect x="7" y="1.500" width="3" height="9" rx="0.8" fill="currentColor" /></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><path d="M3 1.600v8.800a.5.5 0 00.760.430l7-4.400a.5.5 0 000-.860l-7-4.400A.5.5 0 003 1.600z" fill="currentColor" /></svg>
        )}
      </button>
      <button onClick={() => player.restart()} aria-label="Restart" title="Restart">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M2.500 7a4.500 4.500 0 104.500-4.500H4M4 2.500L6 .700M4 2.500l2 1.800" stroke="currentColor" strokeWidth="1.400" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <span className="playback-time">{formatTime(t)}</span>
      <div className="scrubber" ref={track} onPointerDown={onDown} onPointerMove={onMove} role="slider" aria-label="Timeline" aria-valuemin={0} aria-valuemax={Math.round(tl.total)} aria-valuenow={Math.round(t)}>
        <div className="scrubber-track">
          <div className="scrubber-fill" style={{ width: `${(t / tl.total) * 100}%` }} />
          {tl.scenes.slice(1).map((s) => (
            <span key={s.index} className="scrubber-mark" style={{ left: `${(s.start / tl.total) * 100}%` }} title={s.name} />
          ))}
          <span className="scrubber-thumb" style={{ left: `${(t / tl.total) * 100}%` }} />
        </div>
      </div>
      <span className="playback-time">{formatTime(tl.total)}</span>
      <span className="playback-scene">
        {scene.index}. {scene.name}
      </span>
      {audio.coverage !== 'full' && <span className="playback-note">{audio.coverage === 'none' ? 'Audio not generated' : 'Some audio missing'}</span>}
      <button className="playback-speed" onClick={() => player.setSpeed(speed === 1 ? 1.25 : 1)} title="Playback speed">
        {speed === 1 ? '1x' : '1.25x'}
      </button>
    </div>
  );
}
