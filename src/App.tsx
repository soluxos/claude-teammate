import { useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { AudioEngine } from './engine/audio';
import { PlayerContext, useSnap } from './engine/context';
import { buildTimeline, Player } from './engine/timeline';
import { lines, script } from './script/script';
import { PlaybackBar } from './components/PlaybackBar';
import { Sidebar } from './components/chat/Sidebar';
import { ChatView } from './components/chat/ChatView';
import { Rail } from './components/chat/Rail';
import { Canvas } from './components/session/Canvas';
import { CallBar } from './components/session/CallBar';
import { Captions } from './components/session/Captions';
import { ActivityChips } from './components/session/ActivityChips';
import { ShareOverlay } from './components/session/ShareOverlay';
import { StartScreen } from './components/StartScreen';
import { Outro } from './components/Outro';
import { TourPointer } from './components/TourPointer';
import { NewPage, TeammatePage } from './components/chat/Pages';

export function App() {
  const [ctx, setCtx] = useState<{ player: Player; audio: AudioEngine } | null>(null);

  useEffect(() => {
    let player: Player | null = null;
    let cancelled = false;
    const audio = new AudioEngine();
    audio.load(lines).then((timings) => {
      if (cancelled) return;
      player = new Player(buildTimeline(script, timings), audio);
      player.start();
      if (import.meta.env.DEV) Object.assign(window, { __player: player, __audio: audio }); // for timing and audio passes
      setCtx({ player, audio });
    });
    return () => {
      cancelled = true;
      player?.stop();
    };
  }, []);

  useEffect(() => {
    if (!ctx) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement) return; // the volume slider uses the arrow keys itself
      if (e.code === 'Space') {
        e.preventDefault();
        ctx.player.toggle();
      } else if (e.code === 'ArrowRight') ctx.player.jumpScene(1);
      else if (e.code === 'ArrowLeft') ctx.player.jumpScene(-1);
    };
    // Background tabs stop animating; pause rather than let audio run ahead of the canvas.
    // Resume when the tab comes back.
    let resume = false;
    const onHide = () => {
      if (document.hidden) {
        resume = ctx.player.snapshot.playing;
        ctx.player.pause();
      } else if (resume) {
        resume = false;
        ctx.player.play();
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [ctx]);

  if (!ctx) return <div className="boot" />;
  return (
    <PlayerContext.Provider value={ctx}>
      <MotionConfig reducedMotion="never">
        <Shell />
      </MotionConfig>
    </PlayerContext.Provider>
  );
}

/** The goal stays on screen from the moment Callum states it. */
function GoalBar() {
  const goal = useSnap().state.brief.find((b) => b.label === 'Goal');
  if (!goal) return null;
  return (
    <div className="goal">
      <span>Working on</span>
      {goal.text}
    </div>
  );
}

function Shell() {
  const shown = useSnap().state.view;
  // The outro sits over the decision record, so Claude's interface underneath stays on the record.
  const view = shown === 'outro' ? 'record' : shown;
  return (
    <div className="app" data-view={view}>
      <PlaybackBar />
      <div className="product">
        <Sidebar />
        <div className="chat-pane">
          <NewPage />
          <TeammatePage />
          <ChatView />
          <Rail />
        </div>
        <div className="session-pane" aria-hidden={view !== 'session'}>
          <Canvas />
          <ShareOverlay />
          <GoalBar />
          <ActivityChips />
          <Captions />
          <CallBar />
        </div>
        <TourPointer />
        <div className="concept-label">Concept prototype</div>
      </div>
      <StartScreen />
      <Outro />
    </div>
  );
}
