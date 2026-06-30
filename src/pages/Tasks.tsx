import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus, Star, Trash2, Repeat, CalendarDays, SlidersHorizontal } from "lucide-react";
import { useStore } from "../store/useStore";
import type { NewTaskInput } from "../store/useStore";
import { Card, PageTitle, EmptyState } from "../components/Card";
import { SortableList } from "../components/SortableList";
import { TaskItem } from "../components/TaskItem";
import { Celebration } from "../components/Celebration";
import { todayKey, dueLabel, isOverdue } from "../lib/date";
import { expandMotion } from "../lib/motion";
import { useT } from "../lib/i18n";
import { MAX_FOCUS } from "../types";
import type { Task, RepeatFreq } from "../types";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const REPEAT_LABEL: Record<RepeatFreq, string> = {
  none: "Daily",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export default function Tasks() {
  const tasks = useStore((s) => s.tasks);
  const addTask = useStore((s) => s.addTask);
  const clearCompleted = useStore((s) => s.clearCompleted);
  const reorderTasks = useStore((s) => s.reorderTasks);
  const [celebrate, setCelebrate] = useState(0);

  // Active tasks follow the user's manual drag order; completed stay newest-first.
  const { active, done } = useMemo(
    () => ({
      active: [...tasks]
        .filter((t) => !t.done)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      done: [...tasks]
        .filter((t) => t.done)
        .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)),
    }),
    [tasks]
  );

  return (
    <div>
      <Celebration trigger={celebrate} />
      <PageTitle title="Tasks" subtitle="A calm, scheduled list." />

      <AddTask onAdd={addTask} />

      {active.length === 0 && done.length === 0 ? (
        <EmptyState title="Nothing here yet" hint="Add your first task above whenever you're ready." />
      ) : (
        <div className={done.length > 0 ? "lg:grid lg:grid-cols-2 lg:items-start lg:gap-6" : ""}>
          <div>
            {active.length === 0 ? (
              <p className="muted px-1 py-4 text-sm">All done for now. 🌸</p>
            ) : (
              <SortableList
                items={active}
                onReorder={reorderTasks}
                renderItem={(t) => (
                  <TaskRow task={t} onComplete={() => setCelebrate((c) => c + 1)} />
                )}
              />
            )}
          </div>

          {done.length > 0 && (
            <div className="mt-4 lg:mt-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="muted text-xs font-semibold uppercase tracking-wide">
                  Completed · {done.length}
                </span>
                <button onClick={clearCompleted} className="muted text-xs font-semibold">
                  Clear
                </button>
              </div>
              <div className="flex flex-col gap-2.5">
                {done.map((t) => (
                  <TaskRow key={t.id} task={t} onComplete={() => setCelebrate((c) => c + 1)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddTask({ onAdd }: { onAdd: (input: NewTaskInput) => void }) {
  const t = useT();
  const reduce = !!useReducedMotion();
  const [title, setTitle] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(todayKey());
  const [freq, setFreq] = useState<RepeatFreq>("none");
  const [weekdays, setWeekdays] = useState<number[]>([new Date().getDay()]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setDueDate(todayKey());
    setFreq("none");
    setWeekdays([new Date().getDay()]);
    setShowOptions(false);
  };

  const submit = () => {
    if (!title.trim()) return;
    onAdd({
      title,
      description: description || undefined,
      dueDate,
      repeat: freq === "none" ? undefined : { freq, weekdays: freq === "weekly" ? weekdays : undefined },
    });
    reset();
  };

  const toggleDay = (d: number) =>
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2">
        <input
          className="input"
          placeholder={t("tasks.addPlaceholder")}
          aria-label={t("tasks.addLabel")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button
          onClick={() => setShowOptions((v) => !v)}
          aria-label={t("tasks.options")}
          className="icon-btn !h-12 !w-12 shrink-0"
          style={{
            background: showOptions ? "var(--surface-2)" : "transparent",
            color: showOptions ? "var(--accent)" : "var(--text-muted)",
          }}
        >
          <SlidersHorizontal size={18} />
        </button>
        <button onClick={submit} aria-label={t("tasks.add")} className="btn h-12 w-12 shrink-0 !px-0">
          <Plus size={20} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showOptions && (
          <motion.div {...expandMotion(reduce, 0.22)} className="overflow-hidden">
            <Card className="mt-2 flex flex-col gap-3.5">
              <textarea
                className="input !py-2.5 resize-none"
                rows={2}
                placeholder={t("tasks.descriptionPlaceholder")}
                aria-label={t("tasks.descriptionLabel")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
                  <CalendarDays size={16} style={{ color: "var(--text-muted)" }} /> Due date
                </span>
                <input
                  type="date"
                  className="input !w-auto !py-2"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value || todayKey())}
                />
              </div>

              <div>
                <span className="mb-2 flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
                  <Repeat size={16} style={{ color: "var(--text-muted)" }} /> Repeat
                </span>
                <div className="flex gap-1.5">
                  {(["none", "daily", "weekly", "monthly"] as RepeatFreq[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFreq(f)}
                      className="flex-1 rounded-full py-2 text-xs font-semibold capitalize transition-colors"
                      style={{
                        background: freq === f ? "var(--accent)" : "var(--surface-2)",
                        color: freq === f ? "var(--on-accent)" : "var(--text-muted)",
                      }}
                    >
                      {f === "none" ? "Never" : f}
                    </button>
                  ))}
                </div>
              </div>

              <AnimatePresence initial={false}>
                {freq === "weekly" && (
                  <motion.div {...expandMotion(reduce, 0.2)} className="overflow-hidden">
                    <div className="flex justify-between gap-1 pt-0.5">
                      {WEEKDAYS.map((w, i) => {
                        const on = weekdays.includes(i);
                        return (
                          <button
                            key={i}
                            onClick={() => toggleDay(i)}
                            aria-label={`Toggle ${w}`}
                            className="grid h-9 w-9 place-items-center rounded-full text-xs font-semibold transition-colors"
                            style={{
                              background: on ? "var(--accent)" : "var(--surface-2)",
                              color: on ? "var(--on-accent)" : "var(--text-muted)",
                            }}
                          >
                            {w}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskRow({
  task,
  onComplete,
}: {
  task: Task;
  onComplete: () => void;
}) {
  const deleteTask = useStore((s) => s.deleteTask);
  const toggleFocus = useStore((s) => s.toggleFocus);
  const focusedActive = useStore(
    (s) => s.tasks.filter((t) => t.focused && !t.done).length
  );
  const focusFull = !task.focused && focusedActive >= MAX_FOCUS;
  const overdue = !task.done && task.dueDate ? isOverdue(task.dueDate) : false;
  const [editing, setEditing] = useState(false);

  if (editing) return <TaskEditor task={task} onClose={() => setEditing(false)} />;

  return (
    <TaskItem
      task={task}
      onComplete={onComplete}
      onTitleClick={() => setEditing(true)}
      cardClassName="flex items-center gap-3 !py-3"
      details={
        <>
          {task.description && (
            <span className="muted block truncate text-xs">{task.description}</span>
          )}
          {!task.done && (task.dueDate || task.repeat) && (
            <span className="mt-1 flex flex-wrap items-center gap-1.5">
              {task.dueDate && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{
                    background: "var(--surface-2)",
                    color: overdue ? "var(--danger)" : "var(--text-muted)",
                  }}
                >
                  <CalendarDays size={11} /> {dueLabel(task.dueDate)}
                </span>
              )}
              {task.repeat && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{ background: "var(--surface-2)", color: "var(--accent)" }}
                >
                  <Repeat size={11} /> {REPEAT_LABEL[task.repeat.freq]}
                </span>
              )}
            </span>
          )}
        </>
      }
      endSlot={
        <>
          {!task.done && (
            <button
              onClick={() => !focusFull && toggleFocus(task.id)}
              aria-label={task.focused ? "Remove from today's focus" : "Add to today's focus"}
              title={focusFull ? "You already have 3 focus tasks" : "Focus today"}
              className="icon-btn !h-8 !w-8 shrink-0"
              style={{
                color: task.focused ? "var(--accent)" : "var(--text-muted)",
                opacity: focusFull ? 0.35 : 1,
              }}
            >
              <Star size={16} fill={task.focused ? "var(--accent)" : "none"} />
            </button>
          )}
          <button
            onClick={() => deleteTask(task.id)}
            aria-label="Delete task"
            className="icon-btn !h-8 !w-8 shrink-0"
          >
            <Trash2 size={15} />
          </button>
        </>
      }
    />
  );
}

// Inline editor shown when a task title is tapped. Edits title / description /
// due date in place (repeat is preserved). Enter saves, Escape cancels.
function TaskEditor({ task, onClose }: { task: Task; onClose: () => void }) {
  const updateTask = useStore((s) => s.updateTask);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [dueDate, setDueDate] = useState(task.dueDate ?? todayKey());

  const save = () => {
    if (!title.trim()) return;
    updateTask(task.id, { title, description: description || undefined, dueDate });
    onClose();
  };

  return (
    <Card className="flex flex-col gap-3 !py-3">
      <input
        className="input"
        value={title}
        aria-label="Task title"
        autoFocus
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          else if (e.key === "Escape") onClose();
        }}
      />
      <textarea
        className="input !py-2.5 resize-none"
        rows={2}
        placeholder="Description (optional)"
        aria-label="Task description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
          <CalendarDays size={16} style={{ color: "var(--text-muted)" }} /> Due date
        </span>
        <input
          type="date"
          className="input !w-auto !py-2"
          value={dueDate}
          aria-label="Due date"
          onChange={(e) => setDueDate(e.target.value || todayKey())}
        />
      </div>
      <div className="flex gap-2">
        <button onClick={save} className="btn flex-1">
          Save
        </button>
        <button onClick={onClose} className="btn-soft flex-1">
          Cancel
        </button>
      </div>
    </Card>
  );
}
