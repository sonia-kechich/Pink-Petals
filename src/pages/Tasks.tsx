import { useMemo, useState, useRef } from "react";
import { Trash2, X, GripVertical } from "lucide-react";
import { useStore } from "../store/useStore";
import { Card, PageTitle, EmptyState } from "../components/Card";
import { Checkbox } from "../components/Checkbox";
import { Celebration } from "../components/Celebration";
import { todayKey } from "../lib/date";
import type { Task } from "../types";

export default function Tasks() {
  const tasks = useStore((s) => s.tasks);
  const addTask = useStore((s) => s.addTask);
  const updateTask = useStore((s) => s.updateTask);
  const reorderTasks = useStore((s) => s.reorderTasks);
  const [draft, setDraft] = useState("");
  const [celebrate, setCelebrate] = useState(0);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");

  const todayK = todayKey();

  const filtered = useMemo(
    () => [...tasks].sort((a, b) => a.order - b.order),
    [tasks]
  );

  const active = useMemo(() => filtered.filter((t) => !t.done), [filtered]);
  const done = useMemo(() => filtered.filter((t) => t.done), [filtered]);

  const submit = () => {
    if (!draft.trim()) return;
    addTask(draft, todayK);
    setDraft("");
  };

  // ---- Drag reorder ----
  const listRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragY, setDragY] = useState(0); // live translateY offset for the dragged card
  const dragStartYRef = useRef(0);
  const dragSectionRef = useRef<"active" | "done" | null>(null);
  const lastSwapIdRef = useRef<string | null>(null);

  const sectionOf = (id: string): "active" | "done" | null => {
    if (active.some((t) => t.id === id)) return "active";
    if (done.some((t) => t.id === id)) return "done";
    return null;
  };

  const onHandlePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStartYRef.current = e.clientY;
    dragSectionRef.current = sectionOf(id);
    lastSwapIdRef.current = id;
    setDragId(id);
    setDragY(0);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragId) return;
    setDragY(e.clientY - dragStartYRef.current);

    const el = listRef.current;
    if (!el) return;
    const section = dragSectionRef.current;
    const candidates = [
      ...el.querySelectorAll(`[data-task-id][data-section="${section}"]`),
    ] as HTMLElement[];

    for (const child of candidates) {
      const id = child.dataset.taskId!;
      if (id === dragId) continue;
      const rect = child.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
        // Only swap once per crossing to avoid jitter
        if (lastSwapIdRef.current === id) break;
        const draggedIsAbove = e.clientY < midpoint;
        const sectionIds = candidates.map((c) => c.dataset.taskId!);
        const fromIdx = sectionIds.indexOf(dragId);
        const toIdx = sectionIds.indexOf(id);
        if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
          const newSection = [...sectionIds];
          newSection.splice(fromIdx, 1);
          const insertAt = draggedIsAbove
            ? (fromIdx < toIdx ? toIdx - 1 : toIdx)
            : (fromIdx < toIdx ? toIdx : toIdx + 1);
          newSection.splice(insertAt, 0, dragId);
          // Build full order: updated section first, then the other section's current order
          const otherSection = section === "active" ? "done" : "active";
          const otherIds = (
            [...el.querySelectorAll(`[data-task-id][data-section="${otherSection}"]`)] as HTMLElement[]
          ).map((c) => c.dataset.taskId!);
          reorderTasks(section === "active" ? [...newSection, ...otherIds] : [...otherIds, ...newSection]);
          lastSwapIdRef.current = id;
          // Re-anchor the drag start so the card doesn't jump visually
          dragStartYRef.current = e.clientY - dragY;
        }
        break;
      }
    }
  };

  const endDrag = () => {
    setDragId(null);
    setDragY(0);
    dragSectionRef.current = null;
    lastSwapIdRef.current = null;
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

      {filtered.length === 0 ? (
        <EmptyState title="Nothing here yet" hint="Add your first task above." />
      ) : (
        <div
          ref={listRef}
          className="flex flex-col gap-1.5"
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {active.map((t) => (
            <div
              key={t.id}
              data-task-id={t.id}
              data-section="active"
              style={{
                transform: dragId === t.id ? `translateY(${dragY}px) scale(1.02)` : undefined,
                zIndex: dragId === t.id ? 10 : undefined,
                position: "relative",
                transition: dragId === t.id ? "none" : "transform 150ms ease",
              }}
            >
              <TaskRow
                task={t}
                isDragging={dragId === t.id}
                onComplete={() => setCelebrate((c) => c + 1)}
                onTitleClick={() => openEdit(t)}
                onHandlePointerDown={(e) => onHandlePointerDown(t.id, e)}
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
                    data-section="done"
                    style={{
                      transform: dragId === t.id ? `translateY(${dragY}px) scale(1.02)` : undefined,
                      zIndex: dragId === t.id ? 10 : undefined,
                      position: "relative",
                      transition: dragId === t.id ? "none" : "transform 150ms ease",
                    }}
                  >
                    <TaskRow
                      task={t}
                      isDragging={dragId === t.id}
                      onComplete={() => setCelebrate((c) => c + 1)}
                      onTitleClick={() => openEdit(t)}
                      onHandlePointerDown={(e) => onHandlePointerDown(t.id, e)}
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
  isDragging,
  onComplete,
  onTitleClick,
  onHandlePointerDown,
}: {
  task: Task;
  isDragging: boolean;
  onComplete: () => void;
  onTitleClick: () => void;
  onHandlePointerDown: (e: React.PointerEvent) => void;
}) {
  const toggleTask = useStore((s) => s.toggleTask);
  const deleteTask = useStore((s) => s.deleteTask);

  return (
    <div className="relative">
      <Card
        className="flex items-center gap-2 !py-2.5 !pr-3"
        style={{
          boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.18)" : undefined,
        }}
      >
        <span
          onPointerDown={onHandlePointerDown}
          className="icon-btn !h-8 !w-6 shrink-0 cursor-grab touch-none active:cursor-grabbing"
          style={{ color: "var(--text-muted)" }}
          aria-label="Drag to reorder"
        >
          <GripVertical size={16} />
        </span>

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