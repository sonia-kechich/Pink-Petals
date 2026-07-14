import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import { useStore } from "../store/useStore";
import { Card, PageTitle, EmptyState } from "../components/Card";
import { Checkbox } from "../components/Checkbox";
import { Celebration } from "../components/Celebration";
import { todayKey } from "../lib/date";
import type { Task } from "../types";

const CARD_HEIGHT = 56;
const ROW_GAP = 6;
const ROW_HEIGHT = CARD_HEIGHT + ROW_GAP;
const TOUCH_HOLD_MS = 260;
const MOUSE_DRAG_THRESHOLD = 4;
const TOUCH_CANCEL_THRESHOLD = 10;

const noSelectStyle: React.CSSProperties = {
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
  WebkitTapHighlightColor: "transparent",
};

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

  const active = useMemo(
    () => tasks.filter((t) => !t.done).sort((a, b) => a.order - b.order),
    [tasks]
  );
  const done = useMemo(
    () => tasks.filter((t) => t.done).sort((a, b) => a.order - b.order),
    [tasks]
  );

  const submit = () => {
    if (!draft.trim()) return;
    addTask(draft, todayK);
    setDraft("");
  };

  const openEdit = (task: Task) => {
    setEditTaskId(task.id);
    setEditTitle(task.title);
    setEditDate(task.dateKey);
  };

  const saveEdit = () => {
    if (editTaskId) updateTask(editTaskId, { title: editTitle, dateKey: editDate });
    setEditTaskId(null);
  };

  return (
    <div>
      <Celebration trigger={celebrate} />
      <PageTitle title="Tasks" subtitle="A calm, scheduled list." />

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

      {active.length === 0 && done.length === 0 ? (
        <EmptyState title="Nothing here yet" hint="Add your first task above." />
      ) : (
        <div className="space-y-6">
          <SortableSection
            title="Active"
            tasks={active}
            done={false}
            onToggle={(id) => {
              const t = tasks.find((tk) => tk.id === id);
              if (t && !t.done) setCelebrate((c) => c + 1);
              useStore.getState().toggleTask(id);
            }}
            onEdit={openEdit}
            onDelete={(id) => useStore.getState().deleteTask(id)}
            onReorder={reorderTasks}
          />
          {done.length > 0 && (
            <SortableSection
              title="Completed"
              tasks={done}
              done={true}
              onToggle={(id) => useStore.getState().toggleTask(id)}
              onEdit={openEdit}
              onDelete={(id) => useStore.getState().deleteTask(id)}
              onReorder={reorderTasks}
            />
          )}
        </div>
      )}

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

function SortableSection({
  title,
  tasks,
  done,
  onToggle,
  onEdit,
  onDelete,
  onReorder,
}: {
  title: string;
  tasks: Task[];
  done: boolean;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  const [order, setOrder] = useState<string[]>(tasks.map((t) => t.id));
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  type DragState = {
    pointerId: number;
    startY: number;
    startIndex: number;
    baseOrder: string[];
    pointerType: string;
    pendingId?: string;
    target?: HTMLElement;
  };
  const dragRef = useRef<DragState | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!dragId) setOrder(tasks.map((t) => t.id));
  }, [tasks, dragId]);

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const beginDrag = useCallback(
    (id: string, pointerId: number, target: HTMLElement, startY: number, pointerType: string) => {
      target.setPointerCapture(pointerId);
      const startIndex = order.indexOf(id);
      dragRef.current = { pointerId, startY, startIndex, baseOrder: order, pointerType };
      setDragId(id);
      setDragOffset(0);
    },
    [order]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;

      if (dragId) {
        e.preventDefault();
        const delta = e.clientY - drag.startY;
        setDragOffset(delta);
        const shift = Math.round(delta / ROW_HEIGHT);
        const targetIndex = Math.max(0, Math.min(drag.baseOrder.length - 1, drag.startIndex + shift));
        const next = [...drag.baseOrder];
        next.splice(drag.startIndex, 1);
        next.splice(targetIndex, 0, dragId);
        setOrder(next);
        return;
      }

      if (drag.pointerType === "mouse" && drag.pendingId) {
        const dist = Math.abs(e.clientY - drag.startY);
        if (dist > MOUSE_DRAG_THRESHOLD) {
          beginDrag(drag.pendingId, drag.pointerId, drag.target!, drag.startY, "mouse");
        }
      } else if (drag.pointerType !== "mouse" && drag.pendingId) {
        const dist = Math.abs(e.clientY - drag.startY);
        if (dist > TOUCH_CANCEL_THRESHOLD) {
          clearHoldTimer();
          dragRef.current = null;
        }
      }
    },
    [dragId, beginDrag]
  );

  const endDrag = useCallback(() => {
    clearHoldTimer();
    if (dragId) onReorder(order);
    dragRef.current = null;
    setDragId(null);
    setDragOffset(0);
  }, [dragId, order, onReorder]);

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [onPointerMove, endDrag]);

  const onCardPointerDown = (id: string) => (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    e.preventDefault();

    const target = e.currentTarget as HTMLElement;
    dragRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      startIndex: order.indexOf(id),
      baseOrder: order,
      pointerType: e.pointerType,
      pendingId: id,
      target,
    };

    if (e.pointerType === "mouse") return;

    holdTimerRef.current = setTimeout(() => {
      if (dragRef.current && dragRef.current.pendingId === id) {
        beginDrag(id, e.pointerId, target, e.clientY, e.pointerType);
      }
    }, TOUCH_HOLD_MS);
  };

  if (tasks.length === 0) return null;

  return (
    <div>
      <h2 className="muted mb-3 text-xs font-semibold uppercase tracking-wide">
        {title} · {tasks.length}
      </h2>
      <div style={{ position: "relative", height: order.length * ROW_HEIGHT - ROW_GAP, ...noSelectStyle }}>
        {order.map((id, index) => {
          const task = byId.get(id);
          if (!task) return null;
          const isDragging = dragId === id;
          return (
            <div
              key={id}
              onPointerDown={onCardPointerDown(id)}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              draggable={false}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: index * ROW_HEIGHT,
                transform: isDragging ? `translateY(${dragOffset}px) scale(1.015)` : "none",
                transition: isDragging ? "none" : "top 200ms cubic-bezier(0.2,0,0,1)",
                zIndex: isDragging ? 10 : 1,
                cursor: isDragging ? "grabbing" : "grab",
                touchAction: "none",
                ...noSelectStyle,
              }}
            >
              <TaskRow
                task={task}
                done={done}
                dragging={isDragging}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  done,
  dragging,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task;
  done: boolean;
  dragging: boolean;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card
      className="flex items-center gap-2 !py-2.5 !pr-3"
      style={{
        opacity: done && !dragging ? 0.6 : 1,
        boxShadow: dragging ? "0 8px 24px rgba(0,0,0,0.18)" : undefined,
      }}
    >
      <Checkbox
        checked={task.done}
        onChange={() => onToggle(task.id)}
      />
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onEdit(task)}>
          <span
            className="block truncate text-[15px]"
            style={{
              color: done ? "var(--text-muted)" : "var(--text)",
              textDecoration: done ? "line-through" : "none",
            }}
          >
            {task.title}
          </span>
        </div>
      </div>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onDelete(task.id)}
        aria-label="Delete task"
        className="icon-btn !h-8 !w-8 shrink-0"
      >
        <Trash2 size={15} />
      </button>
    </Card>
  );
}
