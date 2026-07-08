import { useState, useRef, useCallback } from "react";
import { Trash2, ChevronUp, ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import { useStore } from "../store/useStore";
import { Card, PageTitle, EmptyState } from "../components/Card";
import { toKey, longestStreak } from "../lib/date";

export default function Habits() {
  const habits = useStore((s) => s.habits);
  const addHabit = useStore((s) => s.addHabit);
  const moveHabitToTop = useStore((s) => s.moveHabitToTop);
  const moveHabitToBottom = useStore((s) => s.moveHabitToBottom);
  const [draft, setDraft] = useState("");
  const [heldId, setHeldId] = useState<string | null>(null);

  const holdTimer = useRef<number | null>(null);

  const startHold = useCallback((id: string) => {
    holdTimer.current = window.setTimeout(() => {
      setHeldId(id);
    }, 500);
  }, []);

  const endHold = useCallback(() => {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

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
          placeholder="Add a new habit ..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button onClick={submit} aria-label="Add habit" className="btn h-12 !px-5">
          Add
        </button>
      </div>

      {habits.length === 0 ? (
        <EmptyState title="No habits yet" hint="Add one above — a checkmark a day is plenty." />
      ) : (
        <div className="flex flex-col gap-3">
          {habits.map((h) => (
            <HabitCard
              key={h.id}
              habit={h}
              held={heldId === h.id}
              onHold={startHold}
              onHoldEnd={endHold}
              onMoveTop={() => { moveHabitToTop(h.id); setHeldId(null); }}
              onMoveBottom={() => { moveHabitToBottom(h.id); setHeldId(null); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HabitCard({
  habit,
  held,
  onHold,
  onHoldEnd,
  onMoveTop,
  onMoveBottom,
}: {
  habit: { id: string; name: string; log: Record<string, boolean> };
  held: boolean;
  onHold: (id: string) => void;
  onHoldEnd: () => void;
  onMoveTop: () => void;
  onMoveBottom: () => void;
}) {
  const deleteHabit = useStore((s) => s.deleteHabit);
  const renameHabit = useStore((s) => s.renameHabit);
  const todayKey = toKey(new Date());
  const doneToday = !!habit.log[todayKey];
  const allKeys = Object.keys(habit.log).filter((k) => habit.log[k]);
  const totalDays = allKeys.length;
  const best = longestStreak(habit.log);
  const [showDetails, setShowDetails] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(habit.name);

  const saveName = () => {
    if (editName.trim()) {
      renameHabit(habit.id, editName);
    }
    setEditing(false);
  };

  return (
    <div className="relative">
      <Card
        className="px-4 py-2.5"
        onPointerDown={() => onHold(habit.id)}
        onPointerUp={onHoldEnd}
        onPointerLeave={onHoldEnd}
        onTouchStart={() => onHold(habit.id)}
        onTouchEnd={onHoldEnd}
        onTouchCancel={onHoldEnd}
      >
        <div className="flex items-center gap-2">
          {editing ? (
            <input
              className="flex-1 rounded-xl px-3 py-1.5 text-[15px] font-semibold outline-none"
              style={{ background: "var(--surface-2)", color: "var(--text)" }}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              autoFocus
            />
          ) : (
            <span
              className="flex-1 cursor-pointer truncate text-[15px] font-semibold"
              style={{ color: "var(--text)" }}
              onClick={() => { setEditName(habit.name); setEditing(true); }}
            >
              {habit.name}
            </span>
          )}
          <button
            onClick={() => setShowDetails(!showDetails)}
            aria-label="Toggle details"
            className="icon-btn !h-8 !w-8"
          >
            {showDetails ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
          </button>
          <button onClick={() => deleteHabit(habit.id)} aria-label="Delete habit" className="icon-btn !h-8 !w-8">
            <Trash2 size={15} />
          </button>
        </div>

        {showDetails && (
          <div className="flex items-center justify-between rounded-2xl px-3 py-2 text-sm" style={{ background: "var(--surface-2)" }}>
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-semibold tabular-nums" style={{ color: "var(--text)" }}>
                {totalDays}
              </span>
              <span className="muted text-[10px]">Total days</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-semibold tabular-nums" style={{ color: "var(--text)" }}>
                {best}
              </span>
              <span className="muted text-[10px]">Best streak</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-semibold tabular-nums" style={{ color: doneToday ? "var(--accent)" : "var(--text-muted)" }}>
                {doneToday ? "Done" : "–"}
              </span>
              <span className="muted text-[10px]">Today</span>
            </div>
          </div>
        )}
      </Card>

      {held && (
        <div
          className="absolute -right-12 top-1/2 flex -translate-y-1/2 flex-col gap-1"
          style={{ zIndex: 10 }}
        >
          <button
            onClick={onMoveTop}
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            aria-label="Move to top"
          >
            <ChevronUp size={16} />
          </button>
          <button
            onClick={onMoveBottom}
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: "var(--accent-2)", color: "var(--on-accent)" }}
            aria-label="Move to bottom"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
