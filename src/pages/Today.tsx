import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store/useStore";
import { Card, EmptyState } from "../components/Card";
import { Checkbox } from "../components/Checkbox";
import { Celebration } from "../components/Celebration";
import { greeting, quoteOfDay } from "../lib/content";
import { todayKey, toKey } from "../lib/date";

export default function Today() {
  const tasks = useStore((s) => s.tasks);
  const habits = useStore((s) => s.habits);
  const sessions = useStore((s) => s.sessions);
  const toggleTask = useStore((s) => s.toggleTask);
  const name = useStore((s) => s.settings.userName);
  const [celebrate, setCelebrate] = useState(0);

  const key = todayKey();
  const focus = useMemo(
    () => tasks.filter((t) => t.focused).sort((a, b) => Number(a.done) - Number(b.done)),
    [tasks]
  );

  const focusDone = focus.filter((t) => t.done).length;
  const habitsDone = habits.filter((h) => h.log[key]).length;
  const focusMinutes = sessions
    .filter((s) => s.mode === "focus" && toKey(new Date(s.startedAt)) === key)
    .reduce((sum, s) => sum + s.minutes, 0);

  const hour = new Date().getHours();

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

      <section className="mb-6">
        <h2 className="muted mb-2 px-1 text-xs font-semibold uppercase tracking-wide">
          Today's focus
        </h2>
        {focus.length === 0 ? (
          <Card>
            <EmptyState
              title="Choose up to 3"
              hint="Star a few tasks in your list to focus on them today."
            />
            <Link to="/tasks" className="btn mx-auto mt-1 flex w-max">
              Go to tasks
            </Link>
          </Card>
        ) : (
          <div className="flex flex-col gap-2.5">
            {focus.map((t) => (
              <Card key={t.id} className="flex items-center gap-3 !py-3.5">
                <Checkbox
                  checked={t.done}
                  onChange={() => {
                    if (!t.done) setCelebrate((c) => c + 1);
                    toggleTask(t.id);
                  }}
                />
                <span
                  className="flex-1 text-[15px]"
                  style={{
                    color: t.done ? "var(--text-muted)" : "var(--text)",
                    textDecoration: t.done ? "line-through" : "none",
                  }}
                >
                  {t.title}
                </span>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="muted mb-2 px-1 text-xs font-semibold uppercase tracking-wide">
          Gentle progress
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          <Stat label="Focus" value={`${focusDone}/${focus.length || 0}`} ratio={focus.length ? focusDone / focus.length : 0} />
          <Stat label="Habits" value={`${habitsDone}/${habits.length || 0}`} ratio={habits.length ? habitsDone / habits.length : 0} />
          <Stat label="Minutes" value={`${focusMinutes}`} ratio={Math.min(focusMinutes / 60, 1)} />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, ratio }: { label: string; value: string; ratio: number }) {
  return (
    <Card className="!p-3.5">
      <p className="heading text-xl" style={{ color: "var(--text)" }}>
        {value}
      </p>
      <p className="muted mb-2 text-xs">{label}</p>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.round(ratio * 100)}%`, background: "var(--accent)" }}
        />
      </div>
    </Card>
  );
}
