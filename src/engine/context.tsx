import { createContext, useContext, useSyncExternalStore } from 'react';
import type { AudioEngine } from './audio';
import type { Player } from './timeline';

export const PlayerContext = createContext<{ player: Player; audio: AudioEngine } | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('PlayerContext missing');
  return ctx.player;
}
export const useAudio = () => useContext(PlayerContext)!.audio;

/** Canvas state and transport flags: changes only when an event fires. */
export function useSnap() {
  const player = usePlayer();
  return useSyncExternalStore(player.subscribeSnap, player.getSnap);
}

/** Current time: changes every frame while playing. Use in small components only. */
export function useTime() {
  const player = usePlayer();
  return useSyncExternalStore(player.subscribeTime, player.getTime);
}

export const formatTime = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
