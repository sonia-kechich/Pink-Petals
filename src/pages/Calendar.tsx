import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "../store/useStore";
import { PageTitle } from "../components/Card";
import { monthGrid, toKey, format } from "../lib/date";

export default function Calendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedKey, setSelectedKey] = useState(toKey(today));

  const tasks = useStore((s) => s.tasks);
  const habits = useStore((s) => s.habits);
  const sessions = useStore((s) => s.sessions);

  const grid = useMemo(() => monthGrid(year, month), [year, month]);

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
    setSelectedKey("");
  };

  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
    setSelectedKey("");
  };

  const byDay = useMemo(() => {
    const map: Record<string, { tasksDone: number; habitsDone: number; focusMin: number }> = {};
    for (const t of tasks) {
      if (t.completedAt) {
        const k = toKey(new Date(t.completedAt));
        if (!map[k]) map[k] = { tasksDone: 0, habitsDone: 0, focusMin: 0 };
        map[k].tasksDone++;
      }
    }
    for (const h of habits) {
      for (const k of Object.keys(h.log)) {
        if (h.log[k]) {
          if (!map[k]) map[k] = { tasksDone: 0, habitsDone: 0, focusMin: 0 };
          map[k].habitsDone++;
        }
      }
    }
    for (const s of sessions) {
      if (s.mode === "focus") {
        const k = toKey(new Date(s.startedAt));
        if (!map[k]) map[k] = { tasksDone: 0, habitsDone: 0, focusMin: 0 };
        map[k].focusMin += s.minutes;
      }
    }
    return map;
  }, [tasks, habits, sessions]);

  const selectedData = selectedKey ? byDay[selectedKey] : null;

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      <PageTitle title="Calendar" subtitle="Your month at a glance." />

      {/* Month navigation */}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={prevMonth} aria-label="Previous month" className="icon-btn !h-9 !w-9">
          <ChevronLeft size={20} />
        </button>
        <h2 className="heading text-lg" style={{ color: "var(--text)" }}>
          {format(new Date(year, month, 1), "MMMM yyyy")}
        </h2>
        <button onClick={nextMonth} aria-label="Next month" className="icon-btn !h-9 !w-9">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {weekDays.map((d) => (
          <div key={d} className="muted text-center text-[11px] font-semibold uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="mb-5 grid grid-cols-7 gap-1">
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
              className="relative flex flex-col items-center rounded-xl p-2 text-sm transition-colors"
              style={{
                background: isSelected
                  ? "var(--accent)"
                  : isToday
                    ? "var(--surface-2)"
                    : "transparent",
                color: isSelected
                  ? "var(--on-accent)"
                  : isCurrentMonth
                    ? "var(--text)"
                    : "var(--text-muted)",
                opacity: isCurrentMonth ? 1 : 0.35,
              }}
            >
              <span className="text-xs font-semibold">{d.getDate()}</span>
              {info && (
                <div className="mt-0.5 flex gap-0.5">
                  {info.tasksDone > 0 && (
                    <span className="h-1 w-1 rounded-full" style={{ background: "var(--accent)" }} />
                  )}
                  {info.habitsDone > 0 && (
                    <span className="h-1 w-1 rounded-full" style={{ background: "var(--accent-2)" }} />
                  )}
                  {info.focusMin > 0 && (
                    <span className="h-1 w-1 rounded-full" style={{ background: "var(--text-muted)" }} />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day details */}
      {selectedKey && (
        <div className="rounded-3xl p-4" style={{ background: "var(--surface)" }}>
          <h3 className="heading mb-3 text-sm" style={{ color: "var(--text)" }}>
            {format(new Date(selectedKey + "T12:00:00"), "EEEE, MMMM d")}
          </h3>
          {!selectedData ? (
            <p className="muted text-sm">No activity on this day.</p>
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: "var(--accent)" }}
                />
                <span style={{ color: "var(--text)" }}>
                  {selectedData.tasksDone} task{selectedData.tasksDone !== 1 ? "s" : ""} completed
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: "var(--accent-2)" }}
                />
                <span style={{ color: "var(--text)" }}>
                  {selectedData.habitsDone} habit{selectedData.habitsDone !== 1 ? "s" : ""} done
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: "var(--text-muted)" }}
                />
                <span style={{ color: "var(--text)" }}>
                  {selectedData.focusMin}m focused
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
