import { useEffect, useRef } from "react";
import { useStore } from "../store/useStore";
import { ambient, isSoundId } from "../lib/ambient";

export function AmbientController() {
  const selectedId = useStore((s) => s.sound.selectedId);
  const playing = useStore((s) => s.sound.playing);
  const volume = useStore((s) => s.sound.volume);
  const sessions = useStore((s) => s.sessions);
  const stopSound = useStore((s) => s.stopSound);

  useEffect(() => {
    if (playing && isSoundId(selectedId)) {
      void ambient.play(selectedId);
    } else {
      ambient.stop();
    }
  }, [playing, selectedId]);

  useEffect(() => {
    ambient.setVolume(volume);
  }, [volume]);

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
