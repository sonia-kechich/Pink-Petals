import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { useStore } from "../store/useStore";
import { Checkbox } from "../components/Checkbox";
import { Celebration } from "../components/Celebration";
import { greeting, quoteOfDay } from "../lib/content";
import { todayKey, toKey } from "../lib/date";

export default function Today() {
  const tasks = useStore((s) => s.tasks);
  const habits = useStore((s) => s.habits);
  const notes = useStore((s) => s.notes);
  const sessions = useStore((s) => s.sessions);
  const toggleTask = useStore((s) => s.toggleTask);
  const toggleHabitDay = useStore((s) => s.toggleHabitDay);
  const name = useStore((s) => s.settings.userName);
  const [celebrate, setCelebrate] = useState(0);

  const key = todayKey();

  const activeTasks = useMemo(
    () => tasks.filter((t) => !t.done),
    [tasks]
  );

  const habitsDone = habits.filter((h) => h.log[key]).length;
  const focusMinutesToday = sessions
    .filter((s) => s.mode === "focus" && toKey(new Date(s.startedAt)) === key)
    .reduce((sum, s) => sum + s.minutes, 0);
  const recentNotes = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3),
    [notes]
  );

  const hour = new Date().getHours();

  const formatDay = (d: Date) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[d.getDay()];
  };

  const weekDays = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, []);

  const dayMinutes = useMemo(() => {
    return weekDays.map((d) => {
      const k = toKey(d);
      return sessions
        .filter((s) => s.mode === "focus" && toKey(new Date(s.startedAt)) === k)
        .reduce((sum, s) => sum + s.minutes, 0);
    });
  }, [sessions, weekDays]);

  const maxDayMinutes = Math.max(...dayMinutes, 1);

  return (
    <div>
      <Celebration trigger={celebrate} />
      <header className="mb-5 mt-1">
        <h1 className="heading text-[1.7rem] leading-tight" style={{ color: "var(--text)" }}>
          {greeting(hour)}
          {name ? `, ${name}` : ""}.
        </h1>
        <p className="muted mt-1 text-sm">{quoteOfDay(key)}</p>
      </header>

      {/* ---- Stats row ---- */}
      <div className="mb-6 grid grid-cols-3 gap-2">
        <StatCard label="Tasks" value={`${activeTasks.length}`} sub="active" />
        <StatCard label="Habits" value={`${habitsDone}/${habits.length}`} sub="done today" />
        <StatCard label="Focus" value={`${focusMinutesToday}m`} sub="today" />
      </div>

      {/* ---- Weekly Progress ---- */}
      <section className="mb-6">
        <h2 className="muted mb-3 px-1 text-xs font-semibold uppercase tracking-wide">
          Weekly Progress
        </h2>
        <div
          className="flex items-end justify-between gap-1.5 rounded-3xl px-4 py-5"
          style={{ background: "var(--surface)" }}
        >
          {weekDays.map((d, i) => {
            const minutes = dayMinutes[i];
            const h = Math.max(Math.round((minutes / maxDayMinutes) * 80), 4);
            const isToday = toKey(d) === key;
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: isToday ? "var(--accent)" : "var(--text-muted)" }}
                >
                  {formatDay(d)}
                </span>
                <div
                  className="w-full rounded-full transition-all"
                  style={{
                    height: h,
                    background: isToday ? "var(--accent)" : "var(--surface-2)",
                    minHeight: 4,
                  }}
                />
                <span className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                  {minutes}m
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- Today's Tasks ---- */}
      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="muted text-xs font-semibold uppercase tracking-wide">
            Tasks ({activeTasks.length})
          </h2>
          {activeTasks.length > 3 && (
            <Link
              to="/tasks"
              className="muted text-xs font-semibold transition-colors hover:opacity-70"
              style={{ color: "var(--accent)" }}
            >
              View all
            </Link>
          )}
        </div>
        {activeTasks.length === 0 ? (
          <div className="rounded-3xl p-6 text-center" style={{ background: "var(--surface)" }}>
            <p className="muted text-sm">No tasks yet</p>
            <Link to="/tasks" className="btn mx-auto mt-3 flex w-max">Add a task</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {activeTasks.slice(0, 3).map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-1">
                <Checkbox
                  checked={t.done}
                  onChange={() => {
                    if (!t.done) setCelebrate((c) => c + 1);
                    toggleTask(t.id);
                  }}
                />
                <span className="flex-1 text-[15px]" style={{ color: "var(--text)" }}>
                  {t.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---- Today's Habits ---- */}
      <section className="mb-6">
        <h2 className="muted mb-2 px-1 text-xs font-semibold uppercase tracking-wide">
          Today's Habits
        </h2>
        {habits.length === 0 ? (
          <div className="rounded-3xl p-6 text-center" style={{ background: "var(--surface)" }}>
            <p className="muted text-sm">No habits yet</p>
            <Link to="/habits" className="btn mx-auto mt-3 flex w-max">Add a habit</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {habits.map((h) => {
              const done = h.log[key];
              return (
                <div
                  key={h.id}
                  className="flex cursor-pointer items-center gap-3 px-1"
                  onClick={() => toggleHabitDay(h.id, key)}
                >
                  <div
                    className="flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors"
                    style={{
                      borderColor: done ? "var(--accent)" : "var(--border)",
                      background: done ? "var(--accent)" : "transparent",
                    }}
                  >
                    {done && <Check size={12} strokeWidth={3} style={{ color: "var(--on-accent)" }} />}
                  </div>
                  <span
                    className="flex-1 text-[15px]"
                    style={{
                      color: "var(--text)",
                      textDecoration: done ? "line-through" : "none",
                    }}
                  >
                    {h.name}
                  </span>
                  <span className="muted text-xs">Today</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ---- Recent Notes ---- */}
      {recentNotes.length > 0 && (
        <section className="mb-6">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="muted text-xs font-semibold uppercase tracking-wide">Recent Notes</h2>
            <Link
              to="/notes"
              className="muted text-xs font-semibold transition-colors hover:opacity-70"
              style={{ color: "var(--accent)" }}
            >
              View all
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {recentNotes.map((n) => (
              <Link
                key={n.id}
                to={`/notes`}
                className="rounded-2xl px-4 py-3 text-sm transition-colors hover:opacity-70"
                style={{ background: "var(--surface)" }}
              >
                <span style={{ color: "var(--text)" }}>
                  {n.title || "Untitled"}
                </span>
                <span className="muted ml-2 text-xs">
                  {n.body
                    ? n.body.length > 40
                      ? n.body.slice(0, 40) + "…"
                      : n.body
                    : "Empty note"}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl p-3 text-center" style={{ background: "var(--surface)" }}>
      <p className="muted text-[10px] font-semibold uppercase tracking-wide">{label}</p>
      <p className="heading text-xl leading-tight" style={{ color: "var(--text)" }}>
        {value}
      </p>
      <p className="muted mt-0.5 text-[10px]">{sub}</p>
    </div>
  );
}
