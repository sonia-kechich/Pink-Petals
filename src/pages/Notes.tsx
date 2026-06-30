import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useStore } from "../store/useStore";
import { Card, PageTitle, EmptyState } from "../components/Card";
import { SortableList } from "../components/SortableList";
import { shortDate, toKey } from "../lib/date";
import { useT } from "../lib/i18n";
import {
  scheduleNotePush,
  flushNotePush,
  cancelNotePush,
  flushAllNotes,
} from "../lib/noteDebounce";
import type { Note } from "../types";

export default function Notes() {
  const notes = useStore((s) => s.notes);
  const addNote = useStore((s) => s.addNote);
  const reorderNotes = useStore((s) => s.reorderNotes);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Render in the user's manual drag order (seeded newest-first).
  const ordered = useMemo(
    () => [...notes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [notes]
  );

  useEffect(() => {
    if (selectedId && !notes.some((n) => n.id === selectedId)) setSelectedId(null);
  }, [notes, selectedId]);

  // Flush pending per-note pushes before the app is hidden/closed (and when
  // leaving the Notes screen) so the last keystrokes aren't lost.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushAllNotes();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushAllNotes);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flushAllNotes);
      flushAllNotes();
    };
  }, []);

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <PageTitle title="Notes" subtitle="Quick thoughts, kept simple." />
        <button
          onClick={() => setSelectedId(addNote())}
          aria-label="New note"
          className="btn mb-5 !px-4"
        >
          <Plus size={18} /> New
        </button>
      </div>

      {notes.length === 0 ? (
        <EmptyState title="No notes yet" hint="Tap New to jot down a quiet thought." />
      ) : (
        <div className="lg:grid lg:grid-cols-[320px_1fr] lg:items-start lg:gap-6">
          <SortableList
            items={ordered}
            onReorder={reorderNotes}
            className="flex flex-col gap-2"
            renderItem={(n) => (
              <NoteListItem
                note={n}
                selected={n.id === selectedId}
                onSelect={() => setSelectedId((cur) => (cur === n.id ? null : n.id))}
              />
            )}
          />

          <div className="mt-4 lg:mt-0 lg:sticky lg:top-7">
            {selected ? (
              <NoteEditor key={selected.id} note={selected} onDeleted={() => setSelectedId(null)} />
            ) : (
              <Card className="hidden min-h-[16rem] place-items-center text-center lg:grid">
                <p className="muted text-sm">Select a note to edit, or create a new one.</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NoteListItem({
  note,
  selected,
  onSelect,
}: {
  note: Note;
  selected: boolean;
  onSelect: () => void;
}) {
  const preview = (note.body.split("\n").find((l) => l.trim()) ?? "").trim();
  const displayTitle = note.title.trim() || "Untitled";

  return (
    <button
      onClick={onSelect}
      className="card flex w-full items-start gap-3 px-4 py-3 text-left transition-colors"
      style={{
        background: selected ? "var(--surface-2)" : "var(--surface)",
        borderColor: selected ? "var(--ring)" : "var(--glass-border)",
      }}
    >
      <span className="min-w-0 flex-1">
        <span
          className="heading block truncate text-[15px]"
          style={{ color: note.title.trim() ? "var(--text)" : "var(--text-muted)" }}
        >
          {displayTitle}
        </span>
        <span className="muted block truncate text-xs">{preview || "Empty note"}</span>
      </span>
    </button>
  );
}

function NoteEditor({ note, onDeleted }: { note: Note; onDeleted: () => void }) {
  const updateNote = useStore((s) => s.updateNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const t = useT();
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);

  // Flush this note's pending cloud push when switching notes or unmounting.
  useEffect(() => () => flushNotePush(note.id), [note.id]);

  return (
    <Card>
      <input
        className="heading w-full bg-transparent text-xl outline-none placeholder:font-normal"
        style={{ color: "var(--text)" }}
        placeholder={t("notes.titlePlaceholder")}
        aria-label={t("notes.titleLabel")}
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          updateNote(note.id, { title: e.target.value });
          scheduleNotePush(note.id);
        }}
      />
      <textarea
        className="mt-2 w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none"
        style={{ color: "var(--text)" }}
        rows={Math.min(Math.max(body.split("\n").length, 8), 22)}
        placeholder={t("notes.bodyPlaceholder")}
        aria-label={t("notes.bodyLabel")}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          updateNote(note.id, { body: e.target.value });
          scheduleNotePush(note.id);
        }}
      />
      <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--border)" }}>
        <p className="muted text-[11px]">Created {shortDate(toKey(new Date(note.createdAt)))}</p>
        <button
          onClick={() => {
            cancelNotePush(note.id);
            deleteNote(note.id);
            onDeleted();
          }}
          aria-label="Delete note"
          className="icon-btn !h-9 !w-9"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </Card>
  );
}
