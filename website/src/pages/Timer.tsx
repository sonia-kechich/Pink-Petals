import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Music } from "lucide-react";
import { useStore } from "../store/useStore";
import { formatClock } from "../lib/utils";
import { SoundPicker } from "../components/SoundPicker";

type Mode = "focus" | "break";

export default function TimerPage() {
  const tasks = useStore((s) => s.tasks);
  const focusMin = useStore((s) => s.settings.pomodoroFocus);
  const breakMin = useStore((s) => s.settings.pomodoroBreak);
  const soundOn = useStore((s) => s.settings.soundOnComplete);
  const addSession = useStore((s) => s.addSession);

  const [mode, setMode] = useState<Mode>("focus");
  const [running, setRunning] = useState(false);
  const total = (mode === "focus" ? focusMin : breakMin) * 60;
  const [left, setLeft] = useState(total);
  const intervalRef = useRef<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [showSounds, setShowSounds] = useState(false);

  const activeTasks = tasks.filter((t) => !t.done);

  useEffect(() => { if (!running) setLeft(total); }, [mode, total, running]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(intervalRef.current!);
          setRunning(false);
          addSession(mode === "focus" ? focusMin : breakMin, mode, selectedTaskId || undefined);
          const next: Mode = mode === "focus" ? "break" : "focus";
          setMode(next);
          return (next === "focus" ? focusMin : breakMin) * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [running, mode, focusMin, breakMin, addSession, selectedTaskId]);

  const progress = total > 0 ? 1 - left / total : 0;
  const size = 280;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div>
      <div className="mb-6">
        <h1 className="heading text-2xl" style={{ color: "var(--text)" }}>Timer</h1>
        <p className="muted mt-0.5 text-sm">Focus gently, then rest.</p>
      </div>

      <div className="mx-auto max-w-lg">
        {/* Mode switch */}
        <div className="mx-auto mb-8 flex w-max gap-1 rounded-full p-1" style={{ background: "var(--surface-2)" }}>
          {(["focus", "break"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setRunning(false); setMode(m); }}
              className="rounded-full px-6 py-2 text-sm font-semibold capitalize transition-colors"
              style={{
                background: mode === m ? "var(--accent)" : "transparent",
                color: mode === m ? "var(--on-accent)" : "var(--text-muted)",
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Task selector */}
        <div className="mb-8 flex justify-center">
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full max-w-xs rounded-xl px-4 py-2 text-sm font-medium outline-none"
            style={{ background: "var(--surface-2)", color: selectedTaskId ? "var(--text)" : "var(--text-muted)" }}
          >
            <option value="">Select a task to focus on...</option>
            {activeTasks.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center">
          <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={circ - progress * circ} style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="heading text-5xl tabular-nums" style={{ color: "var(--text)" }}>{formatClock(left)}</span>
              <span className="muted mt-1 text-sm capitalize">{mode}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-10 flex items-center gap-4">
            <button onClick={() => setRunning((v) => !v)} className="btn !px-10 !py-3 text-base">
              {running ? <Pause size={18} /> : <Play size={18} />}
              {running ? "Pause" : "Start"}
            </button>
            <button onClick={() => { setRunning(false); setLeft(total); }} aria-label="Reset" className="btn-soft !h-12 !w-12 !px-0">
              <RotateCcw size={18} />
            </button>
            <button onClick={() => setShowSounds(!showSounds)} aria-label="Toggle sounds" className="btn-soft !h-12 !w-12 !px-0">
              <Music size={18} />
            </button>
          </div>

          {showSounds && <SoundPicker />}
        </div>
      </div>
    </div>
  );
}
