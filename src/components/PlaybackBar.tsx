import { useRef, useState } from 'react';
import { formatTime, useAudio, usePlayer, useSnap, useTime } from '../engine/context';

/** Prototype chrome, deliberately not part of the product UI. */
export function PlaybackBar() {
  const player = usePlayer();
  const audio = useAudio();
  const t = useTime();
  const { playing, speed } = useSnap();
  const tl = player.timeline;
  const track = useRef<HTMLDivElement>(null);
  const [volume, setVolumeState] = useState(audio.volume);
  const lastVolume = useRef(audio.volume || 1);
  const setVolume = (v: number) => {
    if (v > 0) lastVolume.current = v;
    audio.setVolume(v);
    setVolumeState(v);
  };
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
  const toggle = () => player.toggle();

  return (
    <div className="playback">
      <span className="playback-tag">Prototype</span>
      <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} title="Play or pause (Space)">
        {playing ? (
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><rect x="2" y="1.5" width="3" height="9" rx="0.8" fill="currentColor" /><rect x="7" y="1.5" width="3" height="9" rx="0.8" fill="currentColor" /></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><path d="M3 1.600v8.8a.5.5 0 00.760.430l7-4.4a.5.5 0 000-.860l-7-4.400A.5.5 0 003 1.6z" fill="currentColor" /></svg>
        )}
      </button>
      <button onClick={() => player.restart()} aria-label="Restart" title="Restart">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M2.5 7a4.5 4.5 0 104.5-4.5H4M4 2.5L6 .700M4 2.5l2 1.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
      <div className="playback-volume">
        <button onClick={() => setVolume(volume > 0 ? 0 : lastVolume.current)} aria-label={volume > 0 ? 'Mute' : 'Unmute'} title={volume > 0 ? 'Mute' : 'Unmute'}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M2.5 6.2v3.6h2.4L8.2 12.6V3.4L4.9 6.2H2.5z" fill="currentColor" />
            {volume === 0 ? (
              <path d="M10.6 6.2l3 3.6M13.6 6.2l-3 3.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            ) : (
              <>
                <path d="M10.3 6.1a2.7 2.7 0 010 3.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                {volume > 0.5 && <path d="M11.9 4.4a5 5 0 010 7.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />}
              </>
            )}
          </svg>
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          aria-label="Volume"
          title={`Volume ${Math.round(volume * 100)}%`}
          style={{ '--fill': `${volume * 100}%` } as React.CSSProperties}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
      </div>
      <button className="playback-speed" onClick={() => player.setSpeed(speed === 1 ? 1.25 : 1)} title="Playback speed">
        {speed === 1 ? '1x' : '1.25x'}
      </button>
    </div>
  );
}
