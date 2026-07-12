import { useMemo, useState } from "react";
import { Plus, Flame, Check, Calendar, Trash2, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { useStore } from "../store/useStore";
import { todayKey, toKey, currentStreak, longestStreak, daysInMonthKeys } from "../lib/date";

export default function Habits() {
  const habits = useStore((s) => s.habits);
  const addHabit = useStore((s) => s.addHabit);
  const renameHabit = useStore((s) => s.renameHabit);
  const deleteHabit = useStore((s) => s.deleteHabit);
  const toggleHabitDay = useStore((s) => s.toggleHabitDay);
  const [draft, setDraft] = useState("");

  const submit = () => {
    if (!draft.trim()) return;
    addHabit(draft);
    setDraft("");
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="heading text-2xl" style={{ color: "var(--text)" }}>Habits</h1>
          <p className="muted mt-0.5 text-sm">Small, steady rituals.</p>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-2">
        <input
          className="input"
          placeholder="Add a new habit..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button onClick={submit} aria-label="Add habit" className="btn h-12 !px-5">
          <Plus size={18} /> Add
        </button>
      </div>

      {habits.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-16 text-center">
          <p className="heading text-lg" style={{ color: "var(--text)" }}>No habits yet</p>
          <p className="muted text-sm">Add one above — a checkmark a day is plenty.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {habits.map((h) => (
            <HabitCard
              key={h.id}
              habit={h}
              onRename={(name) => renameHabit(h.id, name)}
              onDelete={() => deleteHabit(h.id)}
              onToggleDay={(k) => toggleHabitDay(h.id, k)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HabitCard({
  habit, onRename, onDelete, onToggleDay,
}: {
  habit: { id: string; name: string; log: Record<string, boolean> };
  onRename: (name: string) => void;
  onDelete: () => void;
  onToggleDay: (key: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(habit.name);
  const [expanded, setExpanded] = useState(false);
  const key = todayKey();
  const doneToday = !!habit.log[key];
  const streak = currentStreak(habit.log);
  const best = longestStreak(habit.log);
  const totalDays = Object.keys(habit.log).filter((k) => habit.log[k]).length;

  const saveName = () => {
    if (editName.trim()) onRename(editName);
    setEditing(false);
  };

  const now = new Date();
  const days = daysInMonthKeys(now.getFullYear(), now.getMonth());

  const completionRate = days.length > 0 ? Math.round((days.filter((d) => habit.log[d]).length / days.length) * 100) : 0;

  return (
    <div className="card overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onToggleDay(key)}
            className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors"
            style={{ borderColor: doneToday ? "var(--accent)" : "var(--border)", background: doneToday ? "var(--accent)" : "transparent" }}
          >
            {doneToday && <Check size={11} strokeWidth={3} style={{ color: "var(--on-accent)" }} />}
          </button>
          <div className="min-w-0 flex-1">
            {editing ? (
              <input
                className="w-full rounded-xl px-2 py-1 text-sm font-semibold outline-none"
                style={{ background: "var(--surface-2)", color: "var(--text)" }}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                autoFocus
              />
            ) : (
              <p
                className="cursor-pointer truncate text-sm font-semibold"
                style={{ color: "var(--text)" }}
                onClick={() => { setEditName(habit.name); setEditing(true); }}
              >
                {habit.name}
              </p>
            )}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="icon-btn !h-7 !w-7"
            aria-label={expanded ? "Collapse details" : "Expand details"}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={onDelete} className="icon-btn !h-7 !w-7 shrink-0"><Trash2 size={13} /></button>
        </div>

        {expanded && (
          <>
            {/* Stats */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl px-2 py-1.5 text-center" style={{ background: "var(--surface-2)" }}>
                <p className="flex items-center justify-center gap-1 text-xs font-bold tabular-nums" style={{ color: "var(--accent)" }}>
                  <Flame size={12} /> {streak}
                </p>
                <p className="muted text-[9px]">Streak</p>
              </div>
              <div className="rounded-xl px-2 py-1.5 text-center" style={{ background: "var(--surface-2)" }}>
                <p className="text-xs font-bold tabular-nums" style={{ color: "var(--text)" }}>{best}</p>
                <p className="muted text-[9px]">Best</p>
              </div>
              <div className="rounded-xl px-2 py-1.5 text-center" style={{ background: "var(--surface-2)" }}>
                <p className="text-xs font-bold tabular-nums" style={{ color: "var(--text)" }}>{totalDays}</p>
                <p className="muted text-[9px]">Total</p>
              </div>
            </div>

            {/* Progress ring */}
            <div className="mt-3 flex items-center gap-3">
              <div className="relative h-12 w-12 shrink-0">
                <svg width={48} height={48} className="-rotate-90">
                  <circle cx={24} cy={24} r={20} fill="none" stroke="var(--surface-2)" strokeWidth={4} />
                  <circle cx={24} cy={24} r={20} fill="none" stroke="var(--accent)" strokeWidth={4} strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 20} strokeDashoffset={2 * Math.PI * 20 * (1 - completionRate / 100)}
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums" style={{ color: "var(--accent)" }}>
                  {completionRate}%
                </span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium" style={{ color: "var(--text)" }}>Monthly progress</p>
                <p className="muted text-[10px]">{days.filter((d) => habit.log[d]).length} of {days.length} days</p>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="icon-btn !h-7 !w-7"
                aria-label="Collapse"
              >
                <ChevronUp size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
