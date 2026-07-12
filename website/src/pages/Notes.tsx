import { useState } from "react";
import { Plus, Trash2, Search, Pin } from "lucide-react";
import { useStore } from "../store/useStore";


export default function Notes() {
  const notes = useStore((s) => s.notes);
  const addNote = useStore((s) => s.addNote);
  const updateNote = useStore((s) => s.updateNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? notes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()) || n.body.toLowerCase().includes(search.toLowerCase()))
    : notes;

  const sorted = [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="heading text-2xl" style={{ color: "var(--text)" }}>Notes</h1>
          <p className="muted mt-0.5 text-sm">Quick thoughts, kept simple.</p>
        </div>
        <button onClick={() => addNote()} className="btn !px-4">
          <Plus size={18} /> New Note
        </button>
      </div>

      {notes.length > 0 && (
        <div className="relative mb-5">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input className="input !pl-10" placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-16 text-center">
          <p className="heading text-lg" style={{ color: "var(--text)" }}>
            {search ? "No matching notes" : "No notes yet"}
          </p>
          <p className="muted text-sm">
            {search ? "Try a different search." : "Tap New Note to jot down a quiet thought."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sorted.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              onUpdate={(patch) => updateNote(n.id, patch)}
              onDelete={() => deleteNote(n.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteCard({
  note, onUpdate, onDelete,
}: {
  note: { id: string; title: string; body: string; updatedAt: number };
  onUpdate: (patch: { title?: string; body?: string }) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [expanded, setExpanded] = useState(false);

  const bodyPreview = body.length > 120 ? body.slice(0, 120) + "..." : body;

  return (
    <div
      className="card cursor-pointer transition-all hover:shadow-soft-lg"
      onClick={() => !expanded && setExpanded(true)}
    >
      <div className="flex items-start gap-2">
        <input
          className="heading min-w-0 flex-1 bg-transparent text-base outline-none"
          style={{ color: "var(--text)" }}
          placeholder="Title"
          value={title}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => { setTitle(e.target.value); onUpdate({ title: e.target.value }); }}
        />
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="icon-btn !h-7 !w-7 shrink-0">
          <Trash2 size={13} />
        </button>
      </div>

      {expanded ? (
        <textarea
          className="mt-2 w-full resize-none bg-transparent p-3 text-sm leading-relaxed outline-none"
          style={{ color: "var(--text)" }}
          rows={Math.max(body.split("\n").length, 6)}
          placeholder="Write freely..."
          value={body}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => { setBody(e.target.value); onUpdate({ body: e.target.value }); }}
        />
      ) : (
        <p className="mt-2 line-clamp-4 text-sm leading-relaxed" style={{ color: "var(--text)" }}>
          {body || <span className="muted">Write freely...</span>}
        </p>
      )}

      <p className="muted mt-2 text-[10px]">{new Date(note.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
    </div>
  );
}
