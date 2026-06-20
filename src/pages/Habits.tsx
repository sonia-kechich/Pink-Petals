import { useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { useStore } from "../store/useStore";
import { Card, PageTitle, EmptyState } from "../components/Card";
import { toKey } from "../lib/date";
import type { Habit } from "../types";

/** The last 7 days, oldest first. */
function lastSevenDays() {
  const days: { key: string; letter: string; isToday: boolean }[] = [];
  const todayK = toKey(new Date());
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      key: toKey(d),
      letter: d.toLocaleDateString(undefined, { weekday: "narrow" }),
      isToday: toKey(d) === todayK,
    });
  }
  return days;
}

export default function Habits() {
  const habits = useStore((s) => s.habits);
  const addHabit = useStore((s) => s.addHabit);
  const [draft, setDraft] = useState("");

  const submit = () => {
    if (!draft.trim()) return;
    addHabit(draft);
    setDraft("");
  };

  return (
    <div>
      <PageTitle title="Habits" subtitle="Small, steady rituals." />

      <div className="mb-5 flex items-center gap-2">
        <input
          className="input"
          placeholder="Add a habit…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button onClick={submit} aria-label="Add habit" className="btn h-12 w-12 !px-0">
          <Plus size={20} />
        </button>
      </div>

      {habits.length === 0 ? (
        <EmptyState title="No habits yet" hint="Add one above — a checkmark a day is plenty." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {habits.map((h) => (
            <HabitCard key={h.id} habit={h} />
          ))}
        </div>
      )}
    </div>
  );
}

function HabitCard({ habit }: { habit: Habit }) {
  const toggleHabitDay = useStore((s) => s.toggleHabitDay);
  const deleteHabit = useStore((s) => s.deleteHabit);
  const days = lastSevenDays();
  const doneThisWeek = days.filter((d) => habit.log[d.key]).length;

  return (
    <Card className="!py-3.5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex-1 truncate text-[15px]" style={{ color: "var(--text)" }}>
          {habit.name}
        </span>
        <span className="muted text-xs font-semibold">{doneThisWeek}/7</span>
        <button onClick={() => deleteHabit(habit.id)} aria-label="Delete habit" className="icon-btn !h-8 !w-8">
          <Trash2 size={15} />
        </button>
      </div>

      <div className="flex items-center justify-between">
        {days.map((d) => {
          const done = !!habit.log[d.key];
          return (
            <button
              key={d.key}
              onClick={() => toggleHabitDay(habit.id, d.key)}
              aria-label={`${d.key} ${done ? "done" : "not done"}`}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className="grid h-8 w-8 place-items-center rounded-full border-2 transition-colors duration-200"
                style={{
                  borderColor: done ? "var(--accent)" : "var(--border)",
                  background: done ? "var(--accent)" : "transparent",
                  outline: d.isToday ? "2px solid var(--ring)" : "none",
                  outlineOffset: "2px",
                }}
              >
                {done && <Check size={15} strokeWidth={3} color="var(--on-accent)" />}
              </span>
              <span className="muted text-[10px] font-semibold">{d.letter}</span>
            </button>
          );
        })}
      </div>

      {/* Weekly progress bar */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${(doneThisWeek / 7) * 100}%`, background: "var(--accent)" }}
        />
      </div>
    </Card>
  );
}
