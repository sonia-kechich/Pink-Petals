import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2, Check, ChevronDown, Flame } from "lucide-react";
import { useStore } from "../store/useStore";
import { Card, PageTitle, EmptyState } from "../components/Card";
import { SortableList } from "../components/SortableList";
import { toKey, todayKey, currentStreak, longestStreak } from "../lib/date";
import { useExpandMotion } from "../lib/motion";
import { useT } from "../lib/i18n";
import type { Habit } from "../types";

function lastSevenDays() {
  const days: { key: string; letter: string; isToday: boolean }[] = [];
  const todayK = todayKey();
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
  const reorderHabits = useStore((s) => s.reorderHabits);
  const [draft, setDraft] = useState("");
  const t = useT();

  // Render in the user's manual drag order.
  const ordered = useMemo(
    () => [...habits].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [habits]
  );

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
          placeholder={t("habits.addPlaceholder")}
          aria-label={t("habits.addLabel")}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button onClick={submit} aria-label={t("habits.add")} className="btn h-12 w-12 !px-0">
          <Plus size={20} />
        </button>
      </div>

      {habits.length === 0 ? (
        <EmptyState title="No habits yet" hint="Add one above — a checkmark a day is plenty." />
      ) : (
        <SortableList
          items={ordered}
          onReorder={reorderHabits}
          layout="grid"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-start sm:gap-3 xl:grid-cols-3"
          renderItem={(h) => <HabitCard habit={h} />}
        />
      )}
    </div>
  );
}

function HabitCard({ habit }: { habit: Habit }) {
  const toggleHabitDay = useStore((s) => s.toggleHabitDay);
  const deleteHabit = useStore((s) => s.deleteHabit);

  const [open, setOpen] = useState(false);
  const expand = useExpandMotion();
  const todayK = todayKey();
  const doneToday = !!habit.log[todayK];
  const streak = currentStreak(habit.log);

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => toggleHabitDay(habit.id, todayK)}
          aria-label={doneToday ? "Mark today incomplete" : "Mark today complete"}
          aria-pressed={doneToday}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors duration-200"
          style={{
            borderColor: doneToday ? "var(--accent)" : "var(--border)",
            background: doneToday ? "var(--accent)" : "transparent",
          }}
        >
          {doneToday && <Check size={15} strokeWidth={3} color="var(--on-accent)" />}
        </button>

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="min-w-0 flex-1 truncate text-[15px]" style={{ color: "var(--text)" }}>
            {habit.name}
          </span>
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{
              background: streak > 0 ? "var(--surface-2)" : "transparent",
              color: streak > 0 ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            <Flame size={13} fill={streak > 0 ? "var(--accent)" : "none"} /> {streak}
          </span>
          <ChevronDown
            size={18}
            className="shrink-0 transition-transform duration-200"
            style={{ color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "none" }}
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div {...expand} className="overflow-hidden">
            <HabitDetails habit={habit} onDelete={() => deleteHabit(habit.id)} />
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function HabitDetails({ habit, onDelete }: { habit: Habit; onDelete: () => void }) {
  const updateHabit = useStore((s) => s.updateHabit);
  const days = lastSevenDays();
  const doneThisWeek = days.filter((d) => habit.log[d.key]).length;
  const best = longestStreak(habit.log);

  // Local edit state so a momentarily-empty field doesn't snap back (the store
  // keeps the last non-empty name); commits to the store on every change.
  const [name, setName] = useState(habit.name);
  const [description, setDescription] = useState(habit.description ?? "");

  return (
    <div className="border-t px-4 pb-4 pt-3.5" style={{ borderColor: "var(--border)" }}>
      <input
        className="input mb-2.5"
        value={name}
        aria-label="Habit name"
        onChange={(e) => {
          setName(e.target.value);
          updateHabit(habit.id, { name: e.target.value });
        }}
      />
      <textarea
        className="input mb-3 resize-none !py-2.5"
        rows={2}
        placeholder="Description (optional)"
        aria-label="Habit description"
        value={description}
        onChange={(e) => {
          setDescription(e.target.value);
          updateHabit(habit.id, { description: e.target.value });
        }}
      />

      <div className="mb-3 grid grid-cols-2 gap-2">
        <Stat label="This week" value={`${doneThisWeek}/7`} />
        <Stat label="Best streak" value={`${best}`} />
      </div>

      <div className="mb-4 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${(doneThisWeek / 7) * 100}%`, background: "var(--accent)" }}
        />
      </div>

      <div className="flex items-center justify-end">
        <button onClick={onDelete} aria-label="Delete habit" className="icon-btn !h-9 !w-9">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl px-2 py-2.5 text-center" style={{ background: "var(--surface-2)" }}>
      <p className="heading text-lg leading-none" style={{ color: "var(--text)" }}>
        {value}
      </p>
      <p className="muted mt-1 text-[11px]">{label}</p>
    </div>
  );
}
