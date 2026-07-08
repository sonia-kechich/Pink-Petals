import { useEffect, useRef } from "react";
import { useStore } from "../store/useStore";
import { ambient, isSoundId } from "../lib/ambient";

/**
 * Headless bridge between the persisted sound state and the Web Audio engine.
 *
 * Mounted once in the Layout (not the Timer page) so ambient audio keeps
 * playing while the user moves between pages. It:
 *   • starts / crossfades / stops the engine as intent changes,
 *   • keeps the engine volume in sync,
 *   • unlocks the AudioContext on the first user gesture (autoplay policy),
 *   • fades the ambient sound out gently when a focus session completes.
 */
export function AmbientController() {
  const selectedId = useStore((s) => s.sound.selectedId);
  const playing = useStore((s) => s.sound.playing);
  const volume = useStore((s) => s.sound.volume);
  const sessions = useStore((s) => s.sessions);
  const stopSound = useStore((s) => s.stopSound);

  // Drive playback from intent. Crossfades handled inside the engine.
  useEffect(() => {
    if (playing && isSoundId(selectedId)) {
      void ambient.play(selectedId);
    } else {
      ambient.stop();
    }
  }, [playing, selectedId]);

  // Keep volume in sync (independent of device volume).
  useEffect(() => {
    ambient.setVolume(volume);
  }, [volume]);

  // Unlock audio on the first interaction — covers resuming after the app is
  // reopened with a previously-playing sound, where autoplay is blocked.
  useEffect(() => {
    const unlock = () => void ambient.unlock();
    const opts = { passive: true } as const;
    window.addEventListener("pointerdown", unlock, opts);
    window.addEventListener("keydown", unlock, opts);
    window.addEventListener("touchstart", unlock, opts);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  // When a focus session completes, fade the ambient sound out smoothly.
  // A new session is prepended to the list, so watch the top id.
  const lastSessionId = useRef<string | null>(sessions[0]?.id ?? null);
  useEffect(() => {
    const top = sessions[0];
    if (top && top.id !== lastSessionId.current) {
      lastSessionId.current = top.id;
      if (top.mode === "focus") stopSound();
    }
  }, [sessions, stopSound]);

  return null;
}
