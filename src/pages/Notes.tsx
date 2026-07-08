import { useState, useRef, useCallback } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { useStore } from "../store/useStore";
import { Card, PageTitle, EmptyState } from "../components/Card";
import { shortDate, toKey } from "../lib/date";
import type { Note } from "../types";

export default function Notes() {
  const notes = useStore((s) => s.notes);
  const addNote = useStore((s) => s.addNote);
  const moveNoteToTop = useStore((s) => s.moveNoteToTop);
  const moveNoteToBottom = useStore((s) => s.moveNoteToBottom);
  const [heldId, setHeldId] = useState<string | null>(null);

  const holdTimer = useRef<number | null>(null);

  const startHold = useCallback((id: string) => {
    holdTimer.current = window.setTimeout(() => {
      setHeldId(id);
    }, 500);
  }, []);

  const endHold = useCallback(() => {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

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
            <NoteCard
              key={n.id}
              note={n}
              held={heldId === n.id}
              onHold={startHold}
              onHoldEnd={endHold}
              onMoveTop={() => { moveNoteToTop(n.id); setHeldId(null); }}
              onMoveBottom={() => { moveNoteToBottom(n.id); setHeldId(null); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteCard({
  note,
  held,
  onHold,
  onHoldEnd,
  onMoveTop,
  onMoveBottom,
}: {
  note: Note;
  held: boolean;
  onHold: (id: string) => void;
  onHoldEnd: () => void;
  onMoveTop: () => void;
  onMoveBottom: () => void;
}) {
  const updateNote = useStore((s) => s.updateNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative" onClick={() => !expanded && setExpanded(true)}>
      <Card
        className="p-4"
        onPointerDown={() => onHold(note.id)}
        onPointerUp={onHoldEnd}
        onPointerLeave={onHoldEnd}
        onTouchStart={() => onHold(note.id)}
        onTouchEnd={onHoldEnd}
        onTouchCancel={onHoldEnd}
      >
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
          <button onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }} aria-label="Delete note" className="icon-btn !h-8 !w-8">
            <Trash2 size={15} />
          </button>
        </div>
        {expanded ? (
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
        ) : (
          <p className="line-clamp-2 cursor-pointer text-[15px] leading-relaxed" style={{ color: "var(--text)" }}>
            {body || <span className="muted">Write freely…</span>}
          </p>
        )}
        <p className="muted mt-1 text-[11px]">{shortDate(toKey(new Date(note.updatedAt)))}</p>
      </Card>

      {held && (
        <div
          className="absolute -right-12 top-1/2 flex -translate-y-1/2 flex-col gap-1"
          style={{ zIndex: 10 }}
        >
          <button
            onClick={onMoveTop}
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            aria-label="Move to top"
          >
            <ChevronUp size={16} />
          </button>
          <button
            onClick={onMoveBottom}
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: "var(--accent-2)", color: "var(--on-accent)" }}
            aria-label="Move to bottom"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      )}
    </div>
  );
}


