import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { useStore } from "../store/useStore";
import { PageTitle } from "../components/Card";
import { SoundPicker } from "../components/SoundPicker";
import { formatClock } from "../lib/utils";
import { ambient } from "../lib/ambient";

type Mode = "focus" | "break";

export default function Timer() {
  const tasks = useStore((s) => s.tasks);
  const addSession = useStore((s) => s.addSession);
  const focusMin = useStore((s) => s.settings.pomodoroFocus);
  const breakMin = useStore((s) => s.settings.pomodoroBreak);
  const soundOn = useStore((s) => s.settings.soundOnComplete);

  const [mode, setMode] = useState<Mode>("focus");
  const [running, setRunning] = useState(false);
  const total = (mode === "focus" ? focusMin : breakMin) * 60;
  const [left, setLeft] = useState(total);
  const intervalRef = useRef<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");

  const activeTasks = tasks.filter((t) => !t.done);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(intervalRef.current!);
          setRunning(false);
          addSession(mode === "focus" ? focusMin : breakMin, mode, selectedTaskId || undefined);
          if (soundOn) ambient.chime();
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
  }, [running, mode, focusMin, breakMin, soundOn, addSession, selectedTaskId]);

  const progress = total > 0 ? Math.min(1, (total - left) / total) : 0;
  const size = 240;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div>
      <PageTitle title="Timer" subtitle="Focus gently, then rest." />

      <div className="mx-auto mb-6 flex w-max gap-1 rounded-full p-1" style={{ background: "var(--surface-2)" }}>
        {(["focus", "break"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setLeft(m === "focus" ? focusMin : breakMin * 60); }}
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

      <div className="mb-6 flex justify-center">
        <select
          value={selectedTaskId}
          onChange={(e) => setSelectedTaskId(e.target.value)}
          className="w-full max-w-xs rounded-xl px-4 py-2 text-sm font-medium"
          style={{
            background: "var(--surface-2)",
            color: selectedTaskId ? "var(--text)" : "var(--text-muted)",
            border: "none",
            outline: "none",
          }}
        >
          <option value="">Select a task to focus on...</option>
          {activeTasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
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
              style={{ transition: "stroke-dashoffset 0.5s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="heading text-5xl tabular-nums" style={{ color: "var(--text)" }}>
              {formatClock(left)}
            </span>
            <span className="muted mt-1 text-sm capitalize">{mode}</span>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-center gap-2.5">
          <button
            onClick={() => setRunning((v) => !v)}
            className="btn !px-5 !py-2 text-sm"
          >
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? "Pause" : left < total ? "Resume" : "Start"}
          </button>
          <button
            onClick={() => { setRunning(false); setLeft(total); }}
            aria-label="Reset"
            className="btn-soft !h-9 !w-9 !px-0"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        <SoundPicker />
      </div>
    </div>
  );
}
