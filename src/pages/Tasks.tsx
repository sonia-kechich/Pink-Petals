import { useMemo, useState } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { useStore } from "../store/useStore";
import { Card, PageTitle, EmptyState } from "../components/Card";
import { Checkbox } from "../components/Checkbox";
import { Celebration } from "../components/Celebration";
import { MAX_FOCUS } from "../types";
import type { Task } from "../types";

export default function Tasks() {
  const tasks = useStore((s) => s.tasks);
  const addTask = useStore((s) => s.addTask);
  const clearCompleted = useStore((s) => s.clearCompleted);
  const [draft, setDraft] = useState("");
  const [celebrate, setCelebrate] = useState(0);

  const { active, done } = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => b.createdAt - a.createdAt);
    return {
      active: sorted.filter((t) => !t.done),
      done: sorted.filter((t) => t.done),
    };
  }, [tasks]);

  const submit = () => {
    if (!draft.trim()) return;
    addTask(draft);
    setDraft("");
  };

  return (
    <div>
      <Celebration trigger={celebrate} />
      <PageTitle title="Tasks" subtitle="A calm, simple list." />

      {/* Inline add — no popup. */}
      <div className="mb-5 flex items-center gap-2">
        <input
          className="input"
          placeholder="Add a task…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button onClick={submit} aria-label="Add task" className="btn h-12 w-12 !px-0">
          <Plus size={20} />
        </button>
      </div>

      {active.length === 0 && done.length === 0 ? (
        <EmptyState title="Nothing here yet" hint="Add your first task above whenever you're ready." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {active.map((t) => (
            <TaskRow key={t.id} task={t} onComplete={() => setCelebrate((c) => c + 1)} />
          ))}

          {done.length > 0 && (
            <div className="mt-4">
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

function TaskRow({ task, onComplete }: { task: Task; onComplete: () => void }) {
  const toggleTask = useStore((s) => s.toggleTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const toggleFocus = useStore((s) => s.toggleFocus);
  const focusedActive = useStore(
    (s) => s.tasks.filter((t) => t.focused && !t.done).length
  );
  const focusFull = !task.focused && focusedActive >= MAX_FOCUS;

  return (
    <Card className="flex items-center gap-3 !py-3">
      <Checkbox
        checked={task.done}
        onChange={() => {
          if (!task.done) onComplete();
          toggleTask(task.id);
        }}
      />
      <span
        className="min-w-0 flex-1 truncate text-[15px]"
        style={{
          color: task.done ? "var(--text-muted)" : "var(--text)",
          textDecoration: task.done ? "line-through" : "none",
        }}
      >
        {task.title}
      </span>

      {!task.done && (
        <button
          onClick={() => !focusFull && toggleFocus(task.id)}
          aria-label={task.focused ? "Remove from today's focus" : "Add to today's focus"}
          title={focusFull ? "You already have 3 focus tasks" : "Focus today"}
          className="icon-btn !h-8 !w-8"
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
        className="icon-btn !h-8 !w-8"
      >
        <Trash2 size={15} />
      </button>
    </Card>
  );
}
