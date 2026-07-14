import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Calendar, Trash2, Check, X } from "lucide-react";
import { useStore } from "../store/useStore";
import { todayKey, format } from "../lib/date";

interface TaskItem {
  id: string;
  title: string;
  done: boolean;
  dateKey: string;
  order: number;
}

// ---- layout constants for the absolute-positioned sortable list ----
const CARD_HEIGHT = 56;
const ROW_GAP = 8;
const ROW_HEIGHT = CARD_HEIGHT + ROW_GAP;

// Long-press delay before a touch pointer starts dragging (lets normal scrolling win first).
const TOUCH_HOLD_MS = 260;
// Distance, in px, a mouse has to move before a press becomes a drag rather than a click.
const MOUSE_DRAG_THRESHOLD = 4;
// Distance a touch pointer can wander during the hold before we give up on starting a drag.
const TOUCH_CANCEL_THRESHOLD = 10;

// Stops the browser from treating a press-and-hold as a text-selection gesture. Without
// this, holding a finger on a row shows the native selection carets/blobs ("points") and
// the copy/select-all callout before (or instead of) dragging.
const noSelectStyle: React.CSSProperties = {
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
  WebkitTapHighlightColor: "transparent",
};

function TaskRow({
  task,
  todayK,
  done,
  dragging,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: TaskItem;
  todayK: string;
  done: boolean;
  dragging: boolean;
  onToggle: (id: string) => void;
  onEdit: (task: TaskItem) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className="card flex items-start gap-3 !py-3 !px-4"
      style={{ opacity: done && !dragging ? 0.6 : 1, boxShadow: dragging ? "0 8px 20px rgba(0,0,0,0.14)" : undefined }}
    >
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onToggle(task.id)}
        className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors"
        style={{
          borderColor: done ? "var(--accent)" : "var(--border)",
          background: done ? "var(--accent)" : "transparent",
        }}
      >
        <Check size={11} strokeWidth={3} style={{ color: done ? "var(--on-accent)" : "transparent" }} />
      </button>

      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onEdit(task)}>
        <p
          className="text-sm"
          style={{
            color: done ? "var(--text-muted)" : "var(--text)",
            fontWeight: done ? 400 : 500,
            textDecoration: done ? "line-through" : "none",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {task.title}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
          <Calendar size={10} />
          {(() => {
            if (!task.dateKey || task.dateKey === todayK) return "Today";
            try { return format(new Date(task.dateKey + "T00:00:00"), "MMM d, yyyy"); }
            catch { return task.dateKey; }
          })()}
        </p>
      </div>

      <button onPointerDown={(e) => e.stopPropagation()} onClick={() => onDelete(task.id)} className="icon-btn !h-7 !w-7 shrink-0">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// The whole row is the drag surface, like TickTick — press and move (or press-hold on
// touch) anywhere on a task, and it lifts and reorders as you drag it up or down.
function SortableSection({
  title,
  tasks,
  todayK,
  done,
  onToggle,
  onEdit,
  onDelete,
  onReorder,
}: {
  title: string;
  tasks: TaskItem[];
  todayK: string;
  done: boolean;
  onToggle: (id: string) => void;
  onEdit: (task: TaskItem) => void;
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

  // stay in sync with the store, but don't fight an in-progress drag
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
        // active drag: move the card and re-slot siblings
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

      // not dragging yet: mouse promotes to a drag once it's moved past the click threshold
      if (drag.pointerType === "mouse" && drag.pendingId) {
        const dist = Math.abs(e.clientY - drag.startY);
        if (dist > MOUSE_DRAG_THRESHOLD) {
          beginDrag(drag.pendingId, drag.pointerId, drag.target!, drag.startY, "mouse");
        }
      } else if (drag.pointerType !== "mouse" && drag.pendingId) {
        // touch: wandering too far before the hold timer fires cancels the pending drag
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
    if ((e.target as HTMLElement).closest("button")) return; // let checkbox/delete clicks through untouched
    if (e.pointerType === "mouse" && e.button !== 0) return;

    // Prevent the browser's own long-press behavior (text selection carets, the
    // select/copy callout) from ever getting a chance to fire.
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

    if (e.pointerType === "mouse") return; // drag begins once movement passes the threshold

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
              <TaskRow task={task} todayK={todayK} done={done} dragging={isDragging} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Tasks() {
  const tasks = useStore((s) => s.tasks) as TaskItem[];
  const addTask = useStore((s) => s.addTask);
  const toggleTask = useStore((s) => s.toggleTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const updateTask = useStore((s) => s.updateTask);
  const clearCompleted = useStore((s) => s.clearCompleted);
  // NOTE: add this action to your store (see reorderTasks example below the file).
  const reorderTasks = useStore((s) => s.reorderTasks);

  const [draft, setDraft] = useState("");
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");

  const todayK = todayKey();

  const active = useMemo(() => tasks.filter((t) => !t.done).sort((a, b) => a.order - b.order), [tasks]);
  const done = useMemo(() => tasks.filter((t) => t.done).sort((a, b) => a.order - b.order), [tasks]);

  const submit = () => {
    if (!draft.trim()) return;
    addTask(draft, todayK);
    setDraft("");
  };

  const openEdit = (task: TaskItem) => {
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="heading text-2xl" style={{ color: "var(--text)" }}>Tasks</h1>
          <p className="muted mt-0.5 text-sm">Organize your day, gently.</p>
        </div>
        <button onClick={clearCompleted} className="btn-soft text-xs">Clear completed</button>
      </div>

      {/* Add task */}
      <div className="mb-6 flex items-center gap-2">
        <input
          className="input"
          placeholder="Add a new task..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button onClick={submit} aria-label="Add task" className="btn h-12 !px-5">
          <Plus size={18} /> Add
        </button>
      </div>

      {/* Task list */}
      {active.length === 0 && done.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-16 text-center">
          <p className="heading text-lg" style={{ color: "var(--text)" }}>Nothing here yet</p>
          <p className="muted text-sm">Add your first task above.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <SortableSection
            title="Active"
            tasks={active}
            todayK={todayK}
            done={false}
            onToggle={toggleTask}
            onEdit={openEdit}
            onDelete={deleteTask}
            onReorder={reorderTasks}
          />
          <SortableSection
            title="Completed"
            tasks={done}
            todayK={todayK}
            done={true}
            onToggle={toggleTask}
            onEdit={openEdit}
            onDelete={deleteTask}
            onReorder={reorderTasks}
          />
        </div>
      )}

      {/* Edit modal */}
      {editTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="card w-full max-w-md p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Edit Task</h2>
              <button onClick={() => setEditTaskId(null)} className="icon-btn !h-8 !w-8"><X size={18} /></button>
            </div>
            <input className="input mb-4" placeholder="Task name" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            <p className="muted mb-1.5 text-xs font-semibold uppercase tracking-wide">DATE</p>
            <input className="input mb-6" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            <button onClick={saveEdit} className="btn w-full">Save</button>
          </div>
        </div>
      )}
    </div>
  );
}