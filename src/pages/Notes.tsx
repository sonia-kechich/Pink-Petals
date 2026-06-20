import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useStore } from "../store/useStore";
import { Card, PageTitle, EmptyState } from "../components/Card";
import { shortDate } from "../lib/date";
import type { Note } from "../types";

export default function Notes() {
  const notes = useStore((s) => s.notes);
  const addNote = useStore((s) => s.addNote);

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <PageTitle title="Notes" subtitle="Quick thoughts, kept simple." />
        <button onClick={() => addNote()} aria-label="New note" className="btn mb-5 !px-4">
          <Plus size={18} /> New
        </button>
      </div>

      {notes.length === 0 ? (
        <EmptyState title="No notes yet" hint="Tap New to jot down a quiet thought." />
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteCard({ note }: { note: Note }) {
  const updateNote = useStore((s) => s.updateNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);

  return (
    <Card>
      <div className="mb-1 flex items-start gap-2">
        <input
          className="heading flex-1 bg-transparent text-lg outline-none placeholder:font-normal"
          style={{ color: "var(--text)" }}
          placeholder="Title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            updateNote(note.id, { title: e.target.value });
          }}
        />
        <button onClick={() => deleteNote(note.id)} aria-label="Delete note" className="icon-btn !h-8 !w-8">
          <Trash2 size={15} />
        </button>
      </div>
      <textarea
        className="w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none"
        style={{ color: "var(--text)" }}
        rows={Math.min(Math.max(body.split("\n").length, 2), 12)}
        placeholder="Write freely…"
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          updateNote(note.id, { body: e.target.value });
        }}
      />
      <p className="muted mt-1 text-[11px]">{shortDate(toKeyOf(note.updatedAt))}</p>
    </Card>
  );
}

function toKeyOf(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
