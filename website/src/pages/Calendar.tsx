import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ListChecks, Heart, Clock } from "lucide-react";
import { useStore } from "../store/useStore";
import { monthGrid, toKey, format } from "../lib/date";

export default function Calendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [view, setView] = useState<"month" | "week">("month");
  const [selectedKey, setSelectedKey] = useState(toKey(today));

  const tasks = useStore((s) => s.tasks);
  const habits = useStore((s) => s.habits);
  const sessions = useStore((s) => s.sessions);

  const grid = useMemo(() => monthGrid(year, month), [year, month]);

  const prev = () => { if (month === 0) { setYear((y) => y - 1); setMonth(11); } else setMonth((m) => m - 1); setSelectedKey(""); };
  const next = () => { if (month === 11) { setYear((y) => y + 1); setMonth(0); } else setMonth((m) => m + 1); setSelectedKey(""); };

  const byDay = useMemo(() => {
    const map: Record<string, { tasksDone: number; habitsDone: number; focusMin: number; tasks: typeof tasks }> = {};
    for (const t of tasks) {
      const k = t.dateKey;
      if (!map[k]) map[k] = { tasksDone: 0, habitsDone: 0, focusMin: 0, tasks: [] };
      if (t.done) map[k].tasksDone++;
      map[k].tasks.push(t);
    }
    for (const h of habits) {
      for (const k of Object.keys(h.log)) {
        if (h.log[k]) {
          if (!map[k]) map[k] = { tasksDone: 0, habitsDone: 0, focusMin: 0, tasks: [] };
          map[k].habitsDone++;
        }
      }
    }
    for (const s of sessions) {
      if (s.mode === "focus") {
        const k = toKey(new Date(s.startedAt));
        if (!map[k]) map[k] = { tasksDone: 0, habitsDone: 0, focusMin: 0, tasks: [] };
        map[k].focusMin += s.minutes;
      }
    }
    return map;
  }, [tasks, habits, sessions]);

  const selectedData = selectedKey ? byDay[selectedKey] : null;
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="heading text-2xl" style={{ color: "var(--text)" }}>Calendar</h1>
          <p className="muted mt-0.5 text-sm">Your month at a glance.</p>
        </div>
        <div className="flex gap-1 rounded-full p-1" style={{ background: "var(--surface-2)" }}>
          <button onClick={() => setView("month")} className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
            style={{ background: view === "month" ? "var(--accent)" : "transparent", color: view === "month" ? "var(--on-accent)" : "var(--text-muted)" }}>
            Month
          </button>
          <button onClick={() => setView("week")} className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
            style={{ background: view === "week" ? "var(--accent)" : "transparent", color: view === "week" ? "var(--on-accent)" : "var(--text-muted)" }}>
            Week
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="mb-5 flex items-center justify-between">
        <button onClick={prev} aria-label="Previous" className="icon-btn !h-9 !w-9"><ChevronLeft size={20} /></button>
        <h2 className="heading text-lg" style={{ color: "var(--text)" }}>{format(new Date(year, month, 1), "MMMM yyyy")}</h2>
        <button onClick={next} aria-label="Next" className="icon-btn !h-9 !w-9"><ChevronRight size={20} /></button>
      </div>

      {/* Weekday headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {weekDays.map((d) => (
          <div key={d} className="muted text-center text-[11px] font-semibold uppercase">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="mb-6 grid grid-cols-7 gap-1">
        {grid.map((d) => {
          const k = toKey(d);
          const info = byDay[k];
          const isCurrentMonth = d.getMonth() === month;
          const isToday = k === toKey(new Date());
          const isSelected = k === selectedKey;
          return (
            <button
              key={k}
              onClick={() => setSelectedKey(k)}
              className="flex flex-col items-center rounded-xl p-1.5 transition-colors sm:p-2"
              style={{
                background: isSelected ? "var(--accent)" : isToday ? "var(--surface-2)" : "transparent",
                color: isSelected ? "var(--on-accent)" : isCurrentMonth ? "var(--text)" : "var(--text-muted)",
                opacity: isCurrentMonth ? 1 : 0.35,
              }}
            >
              <span className="text-xs font-semibold">{d.getDate()}</span>
              {info && (
                <div className="mt-0.5 flex gap-0.5">
                  {info.tasksDone > 0 && <span className="h-1 w-1 rounded-full" style={{ background: "var(--accent)" }} />}
                  {info.habitsDone > 0 && <span className="h-1 w-1 rounded-full" style={{ background: "var(--accent-2)" }} />}
                  {info.focusMin > 0 && <span className="h-1 w-1 rounded-full" style={{ background: "var(--text-muted)" }} />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedKey && (
        <div className="card p-5">
          <h3 className="heading mb-4 text-base" style={{ color: "var(--text)" }}>
            {format(new Date(selectedKey + "T12:00:00"), "EEEE, MMMM d, yyyy")}
          </h3>
          {!selectedData ? (
            <p className="muted text-sm">No activity on this day.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl p-3" style={{ background: "var(--surface-2)" }}>
                <div className="flex items-center gap-2">
                  <ListChecks size={16} style={{ color: "var(--accent)" }} />
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{selectedData.tasksDone} tasks</span>
                </div>
                {selectedData.tasks.filter((t) => t.done).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {selectedData.tasks.filter((t) => t.done).slice(0, 3).map((t) => (
                      <p key={t.id} className="truncate text-xs" style={{ color: "var(--text-muted)" }}>✓ {t.title}</p>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-2xl p-3" style={{ background: "var(--surface-2)" }}>
                <div className="flex items-center gap-2">
                  <Heart size={16} style={{ color: "var(--accent-2)" }} />
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{selectedData.habitsDone} habits</span>
                </div>
              </div>
              <div className="rounded-2xl p-3" style={{ background: "var(--surface-2)" }}>
                <div className="flex items-center gap-2">
                  <Clock size={16} style={{ color: "var(--text-muted)" }} />
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{selectedData.focusMin}m focused</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
