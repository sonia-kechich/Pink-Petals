import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Pause, RotateCcw, Plus, Check, ChevronDown, Flower2 } from "lucide-react";
import { useStore, timerElapsed } from "../store/useStore";
import { PageTitle } from "../components/Card";
import { SoundPicker } from "../components/SoundPicker";
import { formatClock } from "../lib/utils";
import { ambient } from "../lib/ambient";

type Mode = "focus" | "break";

export default function Timer() {
  const tasks = useStore((s) => s.tasks);
  const focusMin = useStore((s) => s.settings.pomodoroFocus);
  const breakMin = useStore((s) => s.settings.pomodoroBreak);
  const soundOn = useStore((s) => s.settings.soundOnComplete);
  const notifyOn = useStore((s) => s.settings.notifyOnComplete);

  const [mode, setMode] = useState<Mode>("focus");
  const [running, setRunning] = useState(false);
  const total = (mode === "focus" ? focusMin : breakMin) * 60;
  const [left, setLeft] = useState(total);
  const intervalRef = useRef<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");

  const activeTasks = tasks.filter((t) => !t.done);

  const mode = timer.mode;
  const running = timer.running;
  const total = timer.duration;

  const [, force] = useState(0);
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

  const elapsed = timerElapsed(timer);
  const left = Math.max(0, Math.round(total - elapsed));

  const finishedRef = useRef(false);
  useEffect(() => {
    if (running && elapsed >= total) {
      if (finishedRef.current) return;
      finishedRef.current = true;
      // Let the store decide: a genuine completion is recorded; a clearly-stale
      // one (tab/app left running far too long) is discarded silently.
      const res = reconcileTimer();
      if (res.record) {
        if (soundOn) chime();
        if (notifyOn) {
          void notify(
            mode === "focus" ? "Focus session complete 🌸" : "Break's over 🌿",
            mode === "focus" ? "Lovely work. Time for a gentle break." : "Ready for another focused round?"
          );
        }
      }
    } else if (!running || elapsed < total) {
      finishedRef.current = false;
    }
  }, [running, elapsed, total, mode, soundOn, notifyOn, reconcileTimer]);

  useEffect(() => {
    if (notifyOn) void ensureNotifyPermission();
  }, [notifyOn]);

  const selectedTask = tasks.find((t) => t.id === timer.taskId);
  const progress = total > 0 ? Math.min(1, elapsed / total) : 0;
  const size = 240;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div className="mx-auto max-w-md">
      <PageTitle title="Timer" subtitle="Focus gently, then rest." />

      <div className="mx-auto mb-6 flex w-max gap-1 rounded-full p-1" style={{ background: "var(--surface-2)" }}>
        {(["focus", "break"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setTimerMode(m)}
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

      {/* Task selector */}
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
            {mode === "focus" && selectedTask && (
              <span
                className="mt-1 max-w-[10rem] truncate px-2 text-center text-xs font-semibold"
                style={{ color: "var(--accent)" }}
                title={selectedTask.title}
              >
                {selectedTask.title}
              </span>
            )}
          </div>
        </div>

        <div className="mt-10 flex items-center justify-center gap-2.5">
          <button onClick={() => (running ? pauseTimer() : startTimer())} className="btn !px-5 !py-2 text-sm">
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? "Pause" : left < total ? "Resume" : "Start"}
          </button>
          <button onClick={resetTimer} aria-label="Reset" className="btn-soft !h-9 !w-9 !px-0">
            <RotateCcw size={16} />
          </button>
        </div>

        <SoundPicker />
      </div>
    </div>
  );
}

function TaskPicker({
  selectedId,
  selectedTitle,
  selectedFocusSeconds,
  tasks,
  onSelect,
  onCreate,
  locked,
}: {
  selectedId?: string;
  selectedTitle?: string;
  selectedFocusSeconds?: number;
  tasks: { id: string; title: string; focusSeconds?: number }[];
  onSelect: (id: string | undefined) => void;
  onCreate: (title: string) => void;
  locked: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const expand = useExpandMotion(0.22);
  const t = useT();

  const create = () => {
    if (!draft.trim()) return;
    onCreate(draft.trim());
    setDraft("");
    setOpen(false);
  };

  return (
    <div className="mx-auto w-full max-w-xs">
      <button
        onClick={() => !locked && setOpen((v) => !v)}
        className="card flex w-full items-center gap-3 px-3 py-2.5 text-left"
        style={{ opacity: locked ? 0.85 : 1 }}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: "var(--surface-2)", color: "var(--accent)" }}>
          <Flower2 size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px]" style={{ color: selectedTitle ? "var(--text)" : "var(--text-muted)" }}>
            {selectedTitle ?? "Choose a task to focus on"}
          </span>
          {selectedTitle && (selectedFocusSeconds ?? 0) > 0 && (
            <span className="muted block text-xs">{formatDuration(selectedFocusSeconds ?? 0)} focused so far</span>
          )}
        </span>
        {!locked && (
          <ChevronDown
            size={18}
            className="shrink-0 transition-transform duration-200"
            style={{ color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "none" }}
          />
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && !locked && (
          <motion.div {...expand} className="overflow-hidden">
            <div className="card mt-2 p-2">
              <div className="mb-2 flex items-center gap-2 px-1">
                <input
                  className="input !py-2"
                  placeholder={t("timer.newTaskPlaceholder")}
                  aria-label={t("timer.newTaskLabel")}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && create()}
                />
                <button onClick={create} aria-label={t("tasks.add")} className="btn h-10 w-10 shrink-0 !px-0">
                  <Plus size={18} />
                </button>
              </div>

              <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
                {selectedId && (
                  <PickRow label="No task (free focus)" active={false} onClick={() => { onSelect(undefined); setOpen(false); }} />
                )}
                {tasks.length === 0 && !selectedId ? (
                  <p className="muted px-3 py-3 text-center text-sm">No open tasks — create one above.</p>
                ) : (
                  tasks.map((t) => (
                    <PickRow
                      key={t.id}
                      label={t.title}
                      meta={(t.focusSeconds ?? 0) > 0 ? formatDuration(t.focusSeconds ?? 0) : undefined}
                      active={t.id === selectedId}
                      onClick={() => { onSelect(t.id); setOpen(false); }}
                    />
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PickRow({
  label,
  meta,
  active,
  onClick,
}: {
  label: string;
  meta?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-2xl px-3 py-2 text-left transition-colors"
      style={{ background: active ? "var(--surface-2)" : "transparent" }}
    >
      <span className="min-w-0 flex-1 truncate text-sm" style={{ color: "var(--text)" }}>
        {label}
      </span>
      {meta && <span className="muted shrink-0 text-xs">{meta}</span>}
      {active && <Check size={15} style={{ color: "var(--accent)" }} className="shrink-0" />}
    </button>
  );
}
