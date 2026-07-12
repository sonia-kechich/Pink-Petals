/**
 * JSON backup export/import — a local-first safety net and GDPR-style data
 * portability.
 *
 * Export wraps the synced shape (`exportSyncData()`) in a small, versioned
 * envelope. Import runs the file through the SAME version gate + merge path the
 * cloud uses (`migrateSyncDoc` → `mergeUserData`), i.e. MIGRATE-THEN-MERGE, so:
 *   • an old-schema backup is migrated forward before it touches live data;
 *   • importing never blows away newer data (it merges per-item, newest wins);
 *   • a backup from a NEWER app version is rejected (we can't safely apply it),
 *     reusing the exact same guard as sync.
 *
 * `buildBackup` and `parseBackup` are pure so they're trivially unit-testable.
 */
import type { SyncData } from "../types";
import { SCHEMA_VERSION } from "./schema";
import { migrateSyncDoc, mergeUserData } from "./mergeSync";

export const BACKUP_APP_ID = "pink-petals-planner";

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  schemaVersion: number;
  exportedAt: string;
  data: SyncData;
}

/** Wrap a sync snapshot in a versioned, timestamped backup envelope. Pure
 *  (the timestamp is passed in so callers control it / tests are deterministic). */
export function buildBackup(data: SyncData, exportedAt: string): BackupFile {
  return {
    app: BACKUP_APP_ID,
    schemaVersion: data.schemaVersion ?? SCHEMA_VERSION,
    exportedAt,
    data,
  };
}

/** A filesystem-safe filename like `pink-petals-backup-2026-06-30T12-00-00.json`. */
export function backupFilename(date: Date): string {
  const stamp = date.toISOString().replace(/[:.]/g, "-").replace(/-\d{3}Z$/, "Z");
  return `pink-petals-backup-${stamp}.json`;
}

export type ParseResult =
  | { ok: true; data: SyncData }
  | { ok: false; reason: "malformed" | "newer" };

/** Extract a candidate sync document from either a wrapped backup envelope or a
 *  bare SyncData blob (tolerant of older/hand-made exports). */
function extractRaw(parsed: unknown): unknown | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  if (obj.data && typeof obj.data === "object") return obj.data; // envelope
  if (Array.isArray(obj.tasks) || Array.isArray(obj.notes) || Array.isArray(obj.habits)) {
    return obj; // bare SyncData
  }
  return null;
}

/**
 * Parse + validate a backup's raw JSON text, returning a sync document ready to
 * merge. Rejects malformed input and unknown-newer schema versions (`newer`),
 * mirroring the cloud version guard. Pure.
 */
export function parseBackup(json: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const raw = extractRaw(parsed);
  if (!raw) return { ok: false, reason: "malformed" };

  const { status, doc } = migrateSyncDoc(raw);
  if (status === "skipped" || !doc) return { ok: false, reason: "newer" };
  return { ok: true, data: doc };
}

/** Merge an imported (already gated) backup into the current local snapshot,
 *  newest-per-item wins. Pure — returns the merged doc to apply. */
export function mergeBackup(local: SyncData, imported: SyncData): SyncData {
  return mergeUserData(local, imported);
}
