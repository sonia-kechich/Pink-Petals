import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Calendar, Trash2, Check, X } from "lucide-react";
import { useStore } from "../store/useStore";
import { todayKey, format } from "../lib/date";

// Long-press delay before a touch pointer starts dragging (lets normal scrolling win first).
const TOUCH_HOLD_MS = 260;
// Distance, in px, a mouse has to move before a press becomes a drag rather than a click.
const MOUSE_DRAG_THRESHOLD = 4;
// Distance a touch pointer can wander during the hold before we give up on starting a drag.
const TOUCH_CANCEL_THRESHOLD = 10;

type DragRef = {
  pointerId: number;
  startX: number;
  startY: number;
  pointerType: string;
  pendingId?: string;
  target: HTMLElement;
} | null;

// Reusable press-and-hold / press-and-drag reorder behavior, TickTick-style. Works for any
// layout (list or grid) because it finds the drop target by hit-testing under the pointer
// rather than assuming fixed row positions.
function useDragReorder(ids: string[], onReorder: (orderedIds: string[]) => void) {
  const [order, setOrder] = useState(ids);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });
  const dragRef = useRef<DragRef>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // stay in sync with the store, but don't fight an in-progress drag
  useEffect(() => {
    if (!dragId) setOrder(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join("|"), dragId]);

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const beginDrag = useCallback((id: string, pointerId: number, target: HTMLElement, x: number, y: number) => {
    target.setPointerCapture(pointerId);
    dragRef.current = { pointerId, startX: x, startY: y, pointerType: "touch", target };
    setDragId(id);
    setDragDelta({ x: 0, y: 0 });
  }, []);

  const findDropTarget = (x: number, y: number, excludeId: string) => {
    const el = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest("[data-task-id]") as HTMLElement | null;
    const id = el?.getAttribute("data-task-id");
    if (!id || id === excludeId) return null;
    return id;
  };

  const onPointerMove = useCallback((e: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;

    if (dragId) {
      e.preventDefault();
      setDragDelta({ x: e.clientX - drag.startX, y: e.clientY - drag.startY });
      const targetId = findDropTarget(e.clientX, e.clientY, dragId);
      if (targetId) {
        setOrder((prev) => {
          const from = prev.indexOf(dragId);
          const to = prev.indexOf(targetId);
          if (from === -1 || to === -1 || from === to) return prev;
          const next = [...prev];
          next.splice(from, 1);
          next.splice(to, 0, dragId);
          return next;
        });
      }
      return;
    }

    if (drag.pointerType === "mouse" && drag.pendingId) {
      const dist = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
      if (dist > MOUSE_DRAG_THRESHOLD) {
        beginDrag(drag.pendingId, drag.pointerId, drag.target, drag.startX, drag.startY);
      }
    } else if (drag.pointerType !== "mouse" && drag.pendingId) {
      const dist = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
      if (dist > TOUCH_CANCEL_THRESHOLD) {
        clearHoldTimer();
        dragRef.current = null;
      }
    }
  }, [dragId, beginDrag]);

  const endDrag = useCallback(() => {
    clearHoldTimer();
    if (dragId) onReorder(order);
    dragRef.current = null;
    setDragId(null);
    setDragDelta({ x: 0, y: 0 });
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

  const getRowProps = (id: string) => ({
    "data-task-id": id,
    onPointerDown: (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return; // let checkbox/delete clicks through
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault(); // stops native text-selection carets/callout on long-press

      const target = e.currentTarget as HTMLElement;
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        pointerType: e.pointerType,
        pendingId: id,
        target,
      };

      if (e.pointerType === "mouse") return; // drag begins once movement passes the threshold

      holdTimerRef.current = setTimeout(() => {
        if (dragRef.current && dragRef.current.pendingId === id) {
          beginDrag(id, e.pointerId, target, e.clientX, e.clientY);
        }
      }, TOUCH_HOLD_MS);
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    style: {
      touchAction: "none" as const,
      userSelect: "none" as const,
      WebkitUserSelect: "none" as const,
      WebkitTouchCallout: "none" as const,
      WebkitTapHighlightColor: "transparent",
      cursor: dragId === id ? "grabbing" : "grab",
      position: dragId === id ? ("relative" as const) : undefined,
      zIndex: dragId === id ? 10 : undefined,
      boxShadow: dragId === id ? "0 8px 20px rgba(0,0,0,0.14)" : undefined,
      transform: dragId === id ? `translate(${dragDelta.x}px, ${dragDelta.y}px) scale(1.03)` : undefined,
      transition: dragId === id ? "none" : "transform 150ms ease",
    },
  });

  return { order, dragId, getRowProps };
}

export default function Tasks() {
  const tasks = useStore((s) => s.tasks);
  const addTask = useStore((s) => s.addTask);
  const toggleTask = useStore((s) => s.toggleTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const updateTask = useStore((s) => s.updateTask);
  const clearCompleted = useStore((s) => s.clearCompleted);
  // NOTE: add this action to useStore — see snippet in chat. It just rewrites each task's
  // `order` field to match the position it was dropped into.
  const reorderTasks = useStore((s) => s.reorderTasks);

  const [draft, setDraft] = useState("");
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editError, setEditError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const [lastDeleted, setLastDeleted] = useState<{ title: string; dateKey: string } | null>(null);
  const [toast, setToast] = useState("");

  const todayK = todayKey();

  const filtered = useMemo(
    () => [...tasks].sort((a, b) => a.order - b.order),
    [tasks]
  );

  const byId = useMemo(() => new Map(filtered.map((t) => [t.id, t])), [filtered]);
  const active = useMemo(() => filtered.filter((t) => !t.done), [filtered]);
  const done = useMemo(() => filtered.filter((t) => t.done), [filtered]);

  const activeIds = useMemo(() => active.map((t) => t.id), [active]);
  const doneIds = useMemo(() => done.map((t) => t.id), [done]);

  const activeDrag = useDragReorder(activeIds, reorderTasks);
  const doneDrag = useDragReorder(doneIds, reorderTasks);

  const submit = () => {
    if (!draft.trim()) return;
    addTask(draft, todayK);
    setDraft("");
  };

  const openEdit = (task: { id: string; title: string; dateKey: string }) => {
    setEditTaskId(task.id);
    setEditTitle(task.title);
    setEditDate(task.dateKey);
    setEditError("");
  };

  const closeEdit = useCallback(() => {
    setEditTaskId(null);
    setEditError("");
  }, []);

  const saveEdit = () => {
    if (!editTitle.trim()) {
      setEditError("Task name can't be empty.");
      return;
    }
    if (editTaskId) updateTask(editTaskId, { title: editTitle.trim(), dateKey: editDate });
    closeEdit();
  };

  useEffect(() => {
    if (!editTaskId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeEdit();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editTaskId, closeEdit]);

  const requestDelete = (task: { id: string; title: string }) => setPendingDelete(task);
  const confirmDelete = () => {
    if (!pendingDelete) return;
    const task = tasks.find((t) => t.id === pendingDelete.id);
    deleteTask(pendingDelete.id);
    if (task) setLastDeleted({ title: task.title, dateKey: task.dateKey });
    setToast(`Deleted "${pendingDelete.title}"`);
    setPendingDelete(null);
    setTimeout(() => setToast(""), 4000);
  };
  const undoDelete = () => {
    if (!lastDeleted) return;
    addTask(lastDeleted.title, lastDeleted.dateKey);
    setLastDeleted(null);
    setToast("");
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="heading text-2xl" style={{ color: "var(--text)" }}>Tasks</h1>
          <p className="muted mt-0.5 text-sm">Organize your day, gently. Press and hold a task to reorder it.</p>
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
          {/* Active */}
          {active.length > 0 && (
            <div>
              <h2 className="muted mb-3 text-xs font-semibold uppercase tracking-wide">Active · {active.length}</h2>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {activeDrag.order.map((id) => {
                  const t = byId.get(id);
                  if (!t) return null;
                  const rowProps = activeDrag.getRowProps(id);
                  return (
                    <div
                      key={id}
                      data-task-id={rowProps["data-task-id"]}
                      onPointerDown={rowProps.onPointerDown}
                      onContextMenu={rowProps.onContextMenu}
                      style={rowProps.style}
                      className="card flex items-start gap-3 !py-3 !px-4"
                    >
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => toggleTask(t.id)}
                        className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors"
                        style={{ borderColor: "var(--border)", background: "transparent" }}
                      >
                        <Check size={11} strokeWidth={3} style={{ color: "transparent" }} />
                      </button>
                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openEdit(t)}>
                        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{t.title}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                          <Calendar size={10} />
                          {t.dateKey === todayK ? "Today" : format(new Date(t.dateKey + "T00:00:00"), "MMM d, yyyy")}
                        </p>
                      </div>
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => requestDelete(t)}
                        className="icon-btn !h-7 !w-7 shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed */}
          {done.length > 0 && (
            <div>
              <h2 className="muted mb-3 text-xs font-semibold uppercase tracking-wide">Completed · {done.length}</h2>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {doneDrag.order.map((id) => {
                  const t = byId.get(id);
                  if (!t) return null;
                  const rowProps = doneDrag.getRowProps(id);
                  return (
                    <div
                      key={id}
                      data-task-id={rowProps["data-task-id"]}
                      onPointerDown={rowProps.onPointerDown}
                      onContextMenu={rowProps.onContextMenu}
                      style={{ opacity: 0.6, ...rowProps.style }}
                      className="card flex items-start gap-3 !py-3 !px-4"
                    >
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => toggleTask(t.id)}
                        className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors"
                        style={{ borderColor: "var(--accent)", background: "var(--accent)" }}
                      >
                        <Check size={11} strokeWidth={3} style={{ color: "var(--on-accent)" }} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm" style={{ color: "var(--text-muted)", textDecoration: "line-through" }}>{t.title}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                          <Calendar size={10} />
                          {t.dateKey === todayK ? "Today" : t.dateKey}
                        </p>
                      </div>
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => requestDelete(t)}
                        className="icon-btn !h-7 !w-7 shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editTaskId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={closeEdit}
        >
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Edit Task</h2>
              <button onClick={closeEdit} className="icon-btn !h-8 !w-8"><X size={18} /></button>
            </div>
            <input
              className="input mb-1"
              placeholder="Task name"
              value={editTitle}
              onChange={(e) => { setEditTitle(e.target.value); if (editError) setEditError(""); }}
              style={editError ? { borderColor: "var(--danger, #c04545)" } : undefined}
            />
            {editError && <p className="mb-3 text-xs" style={{ color: "var(--danger, #c04545)" }}>{editError}</p>}
            <p className="muted mb-1.5 text-xs font-semibold uppercase tracking-wide">DATE</p>
            <input className="input mb-6" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            <button onClick={saveEdit} className="btn w-full">Save</button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setPendingDelete(null)}
        >
          <div className="card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <p className="mb-1 text-[15px] font-semibold" style={{ color: "var(--text)" }}>Delete this task?</p>
            <p className="muted mb-4 text-sm">"{pendingDelete.title}" will be removed.</p>
            <div className="flex gap-2">
              <button onClick={() => setPendingDelete(null)} className="btn-soft flex-1 text-sm">Cancel</button>
              <button
                onClick={confirmDelete}
                className="flex-1 rounded-lg text-sm"
                style={{ height: 36, border: "none", background: "var(--danger, #c04545)", color: "#fff", cursor: "pointer" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Undo toast */}
      {toast && (
        <div
          className="fixed bottom-5 left-1/2 z-[60] flex items-center gap-3 rounded-lg text-sm"
          style={{ transform: "translateX(-50%)", background: "var(--text)", color: "var(--bg, #fff)", padding: "10px 16px" }}
        >
          {toast}
          <button onClick={undoDelete} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 600 }}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}