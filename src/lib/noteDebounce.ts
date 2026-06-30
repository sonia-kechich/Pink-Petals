/**
 * Per-note debounce for cloud pushes. Each note id gets its own timer so edits
 * to different notes coalesce independently. Every fire/flush funnels into the
 * shared `requestSyncPush`/`flushSyncPush` (the merge-based, echo-guarded push)
 * — never a second push path.
 *
 * Lifecycle the callers must drive:
 *   • `scheduleNotePush(id)` on each edit,
 *   • `flushNotePush(id)` on note blur/close and on unmount,
 *   • `cancelNotePush(id)` when a note is deleted (clears the timer, no push),
 *   • `flushAllNotes()` before the app is hidden/closed.
 */
import { flushSyncPush, requestSyncPush } from "./syncPush";

export const NOTE_DEBOUNCE_MS = 900;

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleNotePush(id: string, delay: number = NOTE_DEBOUNCE_MS): void {
  const existing = timers.get(id);
  if (existing) clearTimeout(existing);
  timers.set(
    id,
    setTimeout(() => {
      timers.delete(id);
      requestSyncPush();
    }, delay)
  );
}

/** Flush a note's pending edit immediately (still via the echo-guarded push). */
export function flushNotePush(id: string): void {
  const t = timers.get(id);
  if (!t) return;
  clearTimeout(t);
  timers.delete(id);
  flushSyncPush();
}

/** Clear a note's timer without pushing (e.g. the note was deleted). */
export function cancelNotePush(id: string): void {
  const t = timers.get(id);
  if (!t) return;
  clearTimeout(t);
  timers.delete(id);
}

/** Flush every pending note (app hide/close). One push covers the whole doc. */
export function flushAllNotes(): void {
  if (timers.size === 0) return;
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
  flushSyncPush();
}

/** Test/introspection helper. */
export function pendingNoteCount(): number {
  return timers.size;
}
