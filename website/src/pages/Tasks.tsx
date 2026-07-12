import { useMemo, useState } from "react";
import { Plus, Calendar, Trash2, Check, X, Filter } from "lucide-react";
import { useStore } from "../store/useStore";
import { todayKey, format } from "../lib/date";

export default function Tasks() {
  const tasks = useStore((s) => s.tasks);
  const addTask = useStore((s) => s.addTask);
  const toggleTask = useStore((s) => s.toggleTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const updateTask = useStore((s) => s.updateTask);
  const clearCompleted = useStore((s) => s.clearCompleted);

  const [draft, setDraft] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");

  const todayK = todayKey();

  const filtered = useMemo(() => {
    let result = [...tasks];
    if (filterDate) {
      result = result.filter((t) => t.dateKey === filterDate);
    }
    return result.sort((a, b) => b.createdAt - a.createdAt);
  }, [tasks, filterDate]);

  const active = useMemo(() => filtered.filter((t) => !t.done), [filtered]);
  const done = useMemo(() => filtered.filter((t) => t.done), [filtered]);

  const submit = () => {
    if (!draft.trim()) return;
    addTask(draft, filterDate || todayK);
    setDraft("");
  };

  const openEdit = (task: { id: string; title: string; dateKey: string }) => {
    setEditTaskId(task.id); setEditTitle(task.title); setEditDate(task.dateKey);
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
          {/* Active */}
          {active.length > 0 && (
            <div>
              <h2 className="muted mb-3 text-xs font-semibold uppercase tracking-wide">Active · {active.length}</h2>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {active.map((t) => (
                  <div key={t.id} className="card flex items-start gap-3 !py-3 !px-4">
                    <button
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
                    <button onClick={() => deleteTask(t.id)} className="icon-btn !h-7 !w-7 shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {done.length > 0 && (
            <div>
              <h2 className="muted mb-3 text-xs font-semibold uppercase tracking-wide">Completed · {done.length}</h2>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {done.map((t) => (
                  <div key={t.id} className="card flex items-start gap-3 !py-3 !px-4" style={{ opacity: 0.6 }}>
                    <button
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
                    <button onClick={() => deleteTask(t.id)} className="icon-btn !h-7 !w-7 shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
