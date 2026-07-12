import { useMemo, useState, useRef } from "react";
import { Trash2, X } from "lucide-react";
import { useStore } from "../store/useStore";
import type { NewTaskInput } from "../store/useStore";
import { Card, PageTitle, EmptyState } from "../components/Card";
import { SortableList } from "../components/SortableList";
import { TaskItem } from "../components/TaskItem";
import { Celebration } from "../components/Celebration";
import { todayKey } from "../lib/date";
import { format } from "date-fns";
import type { Task } from "../types";

type Tab = "all" | "today" | "tomorrow";

function tomorrowKey(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return format(d, "yyyy-MM-dd");
}

function fmtDate(key: string | undefined): string {
  if (!key) return "";
  try {
    return format(new Date(key + "T00:00:00"), "MMM d");
  } catch {
    return "";
  }
}

export default function Tasks() {
  const tasks = useStore((s) => s.tasks);
  const addTask = useStore((s) => s.addTask);
  const updateTask = useStore((s) => s.updateTask);
  const moveTask = useStore((s) => s.moveTask);
  const [draft, setDraft] = useState("");
  const [celebrate, setCelebrate] = useState(0);
  const [tab, setTab] = useState<Tab>("all");
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");

  const todayK = todayKey();
  const tomorrowK = tomorrowKey();

  const filtered = useMemo(() => {
    let result = [...tasks];
    switch (tab) {
      case "today":
        result = result.filter((t) => t.dateKey === todayK);
        break;
      case "tomorrow":
        result = result.filter((t) => t.dateKey === tomorrowK);
        break;
    }
    return result.sort((a, b) => b.createdAt - a.createdAt);
  }, [tasks, tab, todayK, tomorrowK]);

  const active = useMemo(() => filtered.filter((t) => !t.done), [filtered]);
  const done = useMemo(() => filtered.filter((t) => t.done), [filtered]);

  const submit = () => {
    if (!draft.trim()) return;
    let key = todayK;
    if (tab === "tomorrow") key = tomorrowK;
    addTask(draft, key);
    setDraft("");
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "today", label: "Today" },
    { id: "tomorrow", label: "Tomorrow" },
  ];

  // Drag reorder
  const listRef = useRef<HTMLDivElement>(null);
  const dragIdRef = useRef<string | null>(null);
  const pressTimerRef = useRef<number | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const startDrag = (id: string, e: React.PointerEvent) => {
    pressTimerRef.current = window.setTimeout(() => {
      dragIdRef.current = id;
      setDragOverId(id);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, 300);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragIdRef.current) return;
    const el = listRef.current;
    if (!el) return;
    const children = [...el.querySelectorAll("[data-task-id]")] as HTMLElement[];
    for (const child of children) {
      const rect = child.getBoundingClientRect();
      const id = child.dataset.taskId;
      if (id && id !== dragIdRef.current && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const toIdx = tasks.findIndex((t) => t.id === id);
        if (toIdx >= 0) {
          moveTask(dragIdRef.current, toIdx);
        }
        break;
      }
    }
  };

  const endDrag = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    dragIdRef.current = null;
    setDragOverId(null);
  };

  // Edit
  const openEdit = (task: Task) => {
    setEditTaskId(task.id);
    setEditTitle(task.title);
    setEditDate(task.dateKey);
  };

  const saveEdit = () => {
    if (editTaskId) {
      updateTask(editTaskId, { title: editTitle, dateKey: editDate });
    }
    setEditTaskId(null);
  };

  return (
    <div>
      <Celebration trigger={celebrate} />
      <PageTitle title="Tasks" subtitle="A calm, scheduled list." />

      {/* Add task */}
      <div className="mb-4 flex items-center gap-2">
        <input
          className="input"
          placeholder="Add a new task ..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button onClick={submit} aria-label="Add task" className="btn h-12 !px-5">
          Add
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-2xl p-1 no-scrollbar" style={{ background: "var(--surface)" }}>
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
            style={{
              background: tab === id ? "var(--accent)" : "transparent",
              color: tab === id ? "var(--on-accent)" : "var(--text-muted)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nothing here yet" hint="Add your first task above." />
      ) : (
        <div ref={listRef} className="flex flex-col gap-1.5">
          {active.map((t) => (
            <div
              key={t.id}
              data-task-id={t.id}
              style={{ opacity: dragOverId === t.id ? 0.4 : 1 }}
              onPointerMove={onPointerMove}
            >
              <TaskRow
                task={t}
                onComplete={() => setCelebrate((c) => c + 1)}
                onTitleClick={() => openEdit(t)}
                onDragStart={(e) => startDrag(t.id, e)}
                onDragEnd={endDrag}
              />
            </div>
          ))}

          {done.length > 0 && (
            <div className="mt-4 lg:mt-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="muted text-xs font-semibold uppercase tracking-wide">
                  COMPLETED · {done.length}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {done.map((t) => (
                  <div
                    key={t.id}
                    data-task-id={t.id}
                    style={{ opacity: dragOverId === t.id ? 0.4 : 1 }}
                    onPointerMove={onPointerMove}
                  >
                    <TaskRow
                      task={t}
                      onComplete={() => setCelebrate((c) => c + 1)}
                      onTitleClick={() => openEdit(t)}
                      onDragStart={(e) => startDrag(t.id, e)}
                      onDragEnd={endDrag}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editTaskId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "var(--surface)" }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6"
            style={{ background: "var(--surface)", color: "var(--text)" }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">Edit Task</h2>
              <button onClick={() => setEditTaskId(null)} className="icon-btn !h-8 !w-8">
                <X size={18} />
              </button>
            </div>

            <input
              className="input mb-4"
              placeholder="Task name"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />

            <p className="muted mb-1.5 text-xs font-semibold uppercase tracking-wide">DATE</p>
            <input
              className="input mb-6"
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
            />

            <button onClick={saveEdit} className="btn w-full">
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  onComplete,
  onTitleClick,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  onComplete: () => void;
  onTitleClick: () => void;
  onDragStart: (e: React.PointerEvent) => void;
  onDragEnd: () => void;
}) {
  const toggleTask = useStore((s) => s.toggleTask);
  const deleteTask = useStore((s) => s.deleteTask);

  return (
    <div className="relative">
      <Card
        className="flex items-center gap-3 !py-2.5 !pr-3"
        onPointerDown={onDragStart}
        onPointerUp={onDragEnd}
        onPointerLeave={onDragEnd}
      >
        <Checkbox
          checked={task.done}
          onChange={() => {
            if (!task.done) onComplete();
            toggleTask(task.id);
          }}
        />
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0 flex-1">
            <span
              className="block truncate text-[15px] cursor-pointer"
              style={{
                color: task.done ? "var(--text-muted)" : "var(--text)",
                textDecoration: task.done ? "line-through" : "none",
              }}
              onClick={onTitleClick}
            >
              {task.title}
            </span>
          </div>
          <span className="muted shrink-0 text-xs tabular-nums" style={{ minWidth: 44, textAlign: "right" }}>
            {fmtDate(task.dateKey)}
          </span>
        </div>
        <button
          onClick={() => deleteTask(task.id)}
          aria-label="Delete task"
          className="icon-btn !h-8 !w-8 shrink-0"
        >
          <Trash2 size={15} />
        </button>
      </Card>
    </div>
  );
}
