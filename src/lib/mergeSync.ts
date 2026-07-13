/**
 * Entity-level merge for cloud sync — replaces last-write-wins on the whole
 * document. tasks/habits/notes are keyed by id and merged item-by-item:
 * the item with the newest `updatedAt` wins, and a tombstone (a delete) counts
 * as a write, so a newer delete beats an older edit and a newer edit beats an
 * older delete. Used on BOTH push and pull so concurrent edits converge.
 *
 * Tiebreak (equal timestamps): deterministic & commutative — pick the value
 * whose canonical JSON string is lexicographically greater. For an item vs a
 * tombstone at the exact same ms, the delete wins (`deletedAt >= updatedAt`).
 *
 * All functions here are pure (no Date.now, no I/O) so they're trivially
 * testable; time-based GC takes `now` as an argument.
 */
import type {
  Task,
  Habit,
  Note,
  FocusSession,
  Settings,
  SoundState,
  SyncData,
} from "../types";
import { SCHEMA_VERSION, decideSyncApply } from "./schema";

/** Tombstones older than this are garbage-collected (assumes devices sync
 *  within the window; longer-offline deletes may resurrect — documented). */
export const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Local fallbacks so this module stays decoupled from the store. Must mirror
// the store's defaults; only used for malformed/legacy remote docs.
const FALLBACK_SETTINGS: Settings = {
  userName: "",
  pomodoroFocus: 25,
  pomodoroBreak: 5,
  soundOnComplete: true,
  notifyOnComplete: false,
  showTasks: true,
  showHabits: true,
  showNotes: true,
  showCalendar: false,
  showTimer: false,
  showDashboard: true,
};
const FALLBACK_SOUND: SoundState = {
  selectedId: null,
  playing: false,
  volume: 0.6,
  favorites: [],
};

/** JSON with recursively sorted object keys → stable across key ordering
 *  (e.g. jsonb round-trips), so sync signatures compare reliably. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortValue((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/** Coerce an arbitrary stored document into a full SyncData, backfilling the
 *  fields older clients didn't write (per-item `updatedAt`, tombstones, etc.). */
export function normalizeSyncData(raw: unknown): SyncData {
  const d = (raw ?? {}) as Partial<SyncData>;
  const stamp = <T extends { createdAt?: number; updatedAt?: number }>(item: T): T => ({
    ...item,
    updatedAt: item.updatedAt ?? item.createdAt ?? 0,
  });
  return {
    tasks: (d.tasks ?? []).map(stamp) as Task[],
    habits: (d.habits ?? []).map(stamp) as Habit[],
    notes: (d.notes ?? []).map(stamp) as Note[],
    sessions: (d.sessions ?? []) as FocusSession[],
    settings: (d.settings as Settings) ?? FALLBACK_SETTINGS,
    sound: (d.sound as SoundState) ?? FALLBACK_SOUND,
    deletedIds: d.deletedIds ?? {},
    settingsUpdatedAt: d.settingsUpdatedAt ?? 0,
    soundUpdatedAt: d.soundUpdatedAt ?? 0,
    focusTotals: d.focusTotals ?? { ms: 0, sessions: 0 },
    // Normalizing fills the current shape, so the doc is now at SCHEMA_VERSION.
    schemaVersion: SCHEMA_VERSION,
  };
}

/**
 * Decide how to treat a raw remote doc by its schemaVersion, then bring it
 * forward when safe. Migrate-then-merge: callers must run this BEFORE
 * `mergeUserData` so both sides share a version.
 *   • "migrated"/"applied" → `doc` is a normalized SyncData ready to merge.
 *   • "skipped" → remote is NEWER than this client; `doc` is null, the caller
 *     must keep local data and surface an out-of-date state (never apply).
 */
export function migrateSyncDoc(raw: unknown): {
  status: "migrated" | "applied" | "skipped";
  doc: SyncData | null;
} {
  const v =
    raw && typeof raw === "object" && "schemaVersion" in raw
      ? Number((raw as { schemaVersion?: unknown }).schemaVersion) || 0
      : 0;
  const decision = decideSyncApply(v);
  if (decision === "skip") return { status: "skipped", doc: null };
  return {
    status: decision === "migrate" ? "migrated" : "applied",
    doc: normalizeSyncData(raw),
  };
}

/** Pick the newer of two values by timestamp; ties → lexicographically-greater
 *  canonical JSON (symmetric, so the choice is independent of argument order). */
function pickNewer<T>(a: T, ta: number, b: T, tb: number): T {
  if (ta !== tb) return ta > tb ? a : b;
  return stableStringify(a) >= stableStringify(b) ? a : b;
}

type Keyed = { id: string; updatedAt: number; order?: number; createdAt?: number };

function mergeCollection<T extends Keyed>(
  local: T[],
  remote: T[],
  deletedIds: Record<string, number>,
  compare: (a: T, b: T) => number
): T[] {
  const byId = new Map<string, T>();
  for (const item of local) byId.set(item.id, item);
  for (const item of remote) {
    const existing = byId.get(item.id);
    byId.set(
      item.id,
      existing ? pickNewer(existing, existing.updatedAt, item, item.updatedAt) : item
    );
  }
  const result: T[] = [];
  for (const item of byId.values()) {
    const deletedAt = deletedIds[item.id];
    // A delete wins when it's at least as new as the surviving edit.
    if (deletedAt !== undefined && deletedAt >= item.updatedAt) continue;
    result.push(item);
  }
  return result.sort(compare);
}

/** Sessions are append-only: union by id, newest-first, capped like the store. */
function mergeSessions(local: FocusSession[], remote: FocusSession[]): FocusSession[] {
  const byId = new Map<string, FocusSession>();
  for (const s of local) byId.set(s.id, s);
  for (const s of remote) if (!byId.has(s.id)) byId.set(s.id, s);
  return [...byId.values()].sort((a, b) => b.startedAt - a.startedAt).slice(0, 200);
}

function mergeDeleted(
  a: Record<string, number>,
  b: Record<string, number>
): Record<string, number> {
  const out: Record<string, number> = { ...a };
  for (const [id, t] of Object.entries(b)) out[id] = Math.max(out[id] ?? 0, t);
  return out;
}

/** Drop tombstones older than the TTL so the map can't grow unbounded. */
export function gcTombstones(
  deletedIds: Record<string, number>,
  now: number
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, t] of Object.entries(deletedIds)) {
    if (now - t <= TOMBSTONE_TTL_MS) out[id] = t;
  }
  return out;
}

/** Merge two sync documents into one, converging concurrent edits. Pure. */
export function mergeUserData(local: SyncData, remote: SyncData): SyncData {
  const deletedIds = mergeDeleted(local.deletedIds ?? {}, remote.deletedIds ?? {});
  return {
    tasks: mergeCollection(
      local.tasks ?? [],
      remote.tasks ?? [],
      deletedIds,
      (a, b) => a.order - b.order || a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1)
    ),
    habits: mergeCollection(
      local.habits ?? [],
      remote.habits ?? [],
      deletedIds,
      (a, b) =>
        (a.order ?? 0) - (b.order ?? 0) ||
        a.createdAt - b.createdAt ||
        (a.id < b.id ? -1 : 1)
    ),
    notes: mergeCollection(
      local.notes ?? [],
      remote.notes ?? [],
      deletedIds,
      (a, b) =>
        (a.order ?? 0) - (b.order ?? 0) ||
        b.createdAt - a.createdAt ||
        (a.id < b.id ? -1 : 1)
    ),
    sessions: mergeSessions(local.sessions ?? [], remote.sessions ?? []),
    settings: pickNewer(
      local.settings,
      local.settingsUpdatedAt ?? 0,
      remote.settings,
      remote.settingsUpdatedAt ?? 0
    ),
    sound: pickNewer(
      local.sound,
      local.soundUpdatedAt ?? 0,
      remote.sound,
      remote.soundUpdatedAt ?? 0
    ),
    deletedIds,
    settingsUpdatedAt: Math.max(local.settingsUpdatedAt ?? 0, remote.settingsUpdatedAt ?? 0),
    soundUpdatedAt: Math.max(local.soundUpdatedAt ?? 0, remote.soundUpdatedAt ?? 0),
    // Lifetime focus aggregate. `max` (monotonic) avoids double-counting the
    // shared history that both devices already saw; the tradeoff is that a
    // device's independent offline additions may lag until the other catches
    // up. (A precise count would need per-session-id accounting.)
    focusTotals: {
      ms: Math.max(local.focusTotals?.ms ?? 0, remote.focusTotals?.ms ?? 0),
      sessions: Math.max(local.focusTotals?.sessions ?? 0, remote.focusTotals?.sessions ?? 0),
    },
    // Both sides were migrated to a common version before merging.
    schemaVersion: SCHEMA_VERSION,
  };
}
