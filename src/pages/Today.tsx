import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Flame, NotebookPen, ArrowRight } from "lucide-react";
import { useStore } from "../store/useStore";
import { Card, EmptyState } from "../components/Card";
import { TaskItem } from "../components/TaskItem";
import { Celebration } from "../components/Celebration";
import { SortableList } from "../components/SortableList";
import { greeting, quoteOfDay } from "../lib/content";
import { todayKey, toKey, currentStreak, dueLabel, isOverdue } from "../lib/date";
import type { Task } from "../types";

export default function Today() {
  const tasks = useStore((s) => s.tasks);
  const habits = useStore((s) => s.habits);
  const sessions = useStore((s) => s.sessions);
  const notes = useStore((s) => s.notes);
  const toggleHabitDay = useStore((s) => s.toggleHabitDay);
  const reorderTasks = useStore((s) => s.reorderTasks);
  const name = useStore((s) => s.settings.userName);
  const [celebrate, setCelebrate] = useState(0);

  const key = todayKey();

  // Active tasks for today (due today or overdue), in the user's manual order.
  const todayTasks = useMemo(
    () =>
      tasks
        .filter((t) => !t.done && (t.dueDate ?? key) <= key)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [tasks, key]
  );
  const completedToday = useMemo(
    () =>
      tasks.filter(
        (t) => t.done && t.completedAt && toKey(new Date(t.completedAt)) === key
      ).length,
    [tasks, key]
  );
  const totalToday = todayTasks.length + completedToday;

  const habitsDone = habits.filter((h) => h.log[key]).length;
  const focusMinutes = sessions
    .filter((s) => s.mode === "focus" && toKey(new Date(s.startedAt)) === key)
    .reduce((sum, s) => sum + s.minutes, 0);
  const bestStreak = useMemo(
    () => habits.reduce((max, h) => Math.max(max, currentStreak(h.log)), 0),
    [habits]
  );

  // Previews follow the same manual order used on the Habits / Notes pages.
  const orderedHabits = useMemo(
    () => [...habits].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [habits]
  );
  const orderedNotes = useMemo(
    () => [...notes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [notes]
  );

  const hour = new Date().getHours();

  return (
    <div>
      <Celebration trigger={celebrate} />
      <header className="mb-6 mt-1">
        <h1
          className="heading text-[1.7rem] leading-tight md:text-4xl"
          style={{ color: "var(--text)" }}
        >
          {greeting(hour)}
          {name ? `, ${name}` : ""}.
        </h1>
        <p className="muted mt-1 text-sm md:text-base">{quoteOfDay(key)}</p>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-2.5 md:gap-4 lg:grid-cols-4">
        <Stat label="Tasks done" value={`${completedToday}/${totalToday || 0}`} ratio={totalToday ? completedToday / totalToday : 0} />
        <Stat label="Habits" value={`${habitsDone}/${habits.length || 0}`} ratio={habits.length ? habitsDone / habits.length : 0} />
        <Stat label="Focus min" value={`${focusMinutes}`} ratio={Math.min(focusMinutes / 60, 1)} />
        <Stat label="Best streak" value={`${bestStreak}`} ratio={Math.min(bestStreak / 14, 1)} icon />
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="min-w-0 lg:col-span-2">
          <SectionHeading
            title="Today's focus"
            action={<TextLink to="/tasks" label="All tasks" />}
          />
          {todayTasks.length === 0 ? (
            <Card>
              <EmptyState
                title="All clear for today"
                hint="Nothing due today. Add a task or enjoy the calm. 🌸"
              />
              <Link to="/tasks" className="btn mx-auto mt-1 flex w-max">
                Go to tasks
              </Link>
            </Card>
          ) : (
            <SortableList
              items={todayTasks}
              onReorder={reorderTasks}
              renderItem={(t) => (
                <TodayTaskCard task={t} onComplete={() => setCelebrate((c) => c + 1)} />
              )}
            />
          )}
        </section>

        <aside className="flex min-w-0 flex-col gap-5">
          <section>
            <SectionHeading
              title="Habits today"
              action={<TextLink to="/habits" label="Open" />}
            />
            {habits.length === 0 ? (
              <Card>
                <p className="muted py-3 text-center text-sm">
                  No habits yet. <Link to="/habits" className="font-semibold" style={{ color: "var(--accent)" }}>Add one →</Link>
                </p>
              </Card>
            ) : (
              <Card className="flex flex-col gap-1 !p-2">
                {orderedHabits.slice(0, 6).map((h) => {
                  const done = !!h.log[key];
                  const streak = currentStreak(h.log);
                  return (
                    <button
                      key={h.id}
                      onClick={() => toggleHabitDay(h.id, key)}
                      className="flex items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-[var(--surface-2)]"
                    >
                      <span
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors"
                        style={{
                          borderColor: done ? "var(--accent)" : "var(--border)",
                          background: done ? "var(--accent)" : "transparent",
                        }}
                      >
                        {done && <Check size={13} strokeWidth={3} color="var(--on-accent)" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm" style={{ color: "var(--text)" }}>
                        {h.name}
                      </span>
                      {streak > 0 && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold" style={{ color: "var(--accent)" }}>
                          <Flame size={12} fill="var(--accent)" /> {streak}
                        </span>
                      )}
                    </button>
                  );
                })}
              </Card>
            )}
          </section>

          {notes.length > 0 && (
            <section>
              <SectionHeading
                title="Recent notes"
                action={<TextLink to="/notes" label="All" />}
              />
              <Card className="flex flex-col gap-1 !p-2">
                {orderedNotes.slice(0, 4).map((n) => {
                  const preview = (n.body.split("\n").find((l) => l.trim()) ?? "").trim();
                  return (
                    <Link
                      key={n.id}
                      to="/notes"
                      className="flex items-center gap-2.5 rounded-2xl px-2 py-2 transition-colors hover:bg-[var(--surface-2)]"
                    >
                      <NotebookPen size={15} className="shrink-0" style={{ color: "var(--text-muted)" }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold" style={{ color: "var(--text)" }}>
                          {n.title.trim() || "Untitled"}
                        </span>
                        {preview && <span className="muted block truncate text-xs">{preview}</span>}
                      </span>
                    </Link>
                  );
                })}
              </Card>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function TodayTaskCard({ task, onComplete }: { task: Task; onComplete: () => void }) {
  const overdue = task.dueDate ? isOverdue(task.dueDate) : false;
  return (
    <TaskItem
      task={task}
      onComplete={onComplete}
      cardClassName="flex items-center gap-3 !py-3.5"
      wrap
      endSlot={
        overdue && task.dueDate ? (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: "var(--surface-2)", color: "var(--danger)" }}
          >
            {dueLabel(task.dueDate)}
          </span>
        ) : null
      }
    />
  );
}

function SectionHeading({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <h2 className="muted text-xs font-semibold uppercase tracking-wide">{title}</h2>
      {action}
    </div>
  );
}

function TextLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-xs font-semibold"
      style={{ color: "var(--accent)" }}
    >
      {label} <ArrowRight size={12} />
    </Link>
  );
}

function Stat({
  label,
  value,
  ratio,
  icon,
}: {
  label: string;
  value: string;
  ratio: number;
  icon?: boolean;
}) {
  return (
    <Card className="!p-3.5 md:!p-4">
      <div className="flex items-center gap-1.5">
        {icon && <Flame size={16} style={{ color: "var(--accent)" }} fill="var(--accent)" />}
        <p className="heading text-xl md:text-2xl" style={{ color: "var(--text)" }}>
          {value}
        </p>
      </div>
      <p className="muted mb-2 mt-0.5 text-xs">{label}</p>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.round(ratio * 100)}%`, background: "var(--accent)" }}
        />
      </div>
    </Card>
  );
}
