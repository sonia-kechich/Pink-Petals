import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { useStore } from "../store/useStore";
import { PageTitle } from "../components/Card";
import { formatClock } from "../lib/utils";

type Mode = "focus" | "break";

/** A soft, optional completion chime. Nothing jarring. */
function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 528;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch {
    /* sound is optional */
  }
}

export default function Timer() {
  const focusMin = useStore((s) => s.settings.pomodoroFocus);
  const breakMin = useStore((s) => s.settings.pomodoroBreak);
  const soundOn = useStore((s) => s.settings.soundOnComplete);
  const addSession = useStore((s) => s.addSession);

  const [mode, setMode] = useState<Mode>("focus");
  const [running, setRunning] = useState(false);
  const total = (mode === "focus" ? focusMin : breakMin) * 60;
  const [left, setLeft] = useState(total);
  const intervalRef = useRef<number | null>(null);

  // Reset the clock whenever the mode or its duration changes while idle.
  useEffect(() => {
    if (!running) setLeft(total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, total]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(intervalRef.current!);
          setRunning(false);
          addSession(mode === "focus" ? focusMin : breakMin, mode);
          if (soundOn) chime();
          const next: Mode = mode === "focus" ? "break" : "focus";
          setMode(next);
          return (next === "focus" ? focusMin : breakMin) * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running, mode, focusMin, breakMin, soundOn, addSession]);

  const progress = total > 0 ? 1 - left / total : 0;
  const size = 240;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div>
      <PageTitle title="Timer" subtitle="Focus gently, then rest." />

      {/* Mode switch */}
      <div className="mx-auto mb-8 flex w-max gap-1 rounded-full p-1" style={{ background: "var(--surface-2)" }}>
        {(["focus", "break"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setRunning(false);
              setMode(m);
            }}
            className="rounded-full px-5 py-1.5 text-sm font-semibold capitalize transition-colors"
            style={{
              background: mode === m ? "var(--accent)" : "transparent",
              color: mode === m ? "var(--on-accent)" : "var(--text-muted)",
            }}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ - progress * circ}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="heading text-5xl tabular-nums" style={{ color: "var(--text)" }}>
              {formatClock(left)}
            </span>
            <span className="muted mt-1 text-sm capitalize">{mode}</span>
          </div>
        </div>

        <div className="mt-10 flex items-center gap-3">
          <button onClick={() => setRunning((v) => !v)} className="btn !px-8 !py-3 text-base">
            {running ? <Pause size={18} /> : <Play size={18} />}
            {running ? "Pause" : "Start"}
          </button>
          <button
            onClick={() => {
              setRunning(false);
              setLeft(total);
            }}
            aria-label="Reset"
            className="btn-soft !h-12 !w-12 !px-0"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
