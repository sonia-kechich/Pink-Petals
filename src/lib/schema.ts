/**
 * Schema version carried INSIDE the synced document (separate from zustand's
 * persist meta-version) so clients can reason about cloud docs written by other
 * app versions. Bump this whenever the synced shape changes.
 */
export const SCHEMA_VERSION = 7;

export type ApplyDecision = "migrate" | "apply" | "skip";

/**
 * Decide how to handle a remote doc given its `schemaVersion`:
 *   • older than us  → "migrate" (bring it forward, then merge),
 *   • equal          → "apply" (merge as-is),
 *   • newer than us  → "skip" (this client can't migrate forward; don't apply
 *     unknown-newer data or we'd corrupt it — guard and stay out of date).
 */
export function decideSyncApply(
  remoteVersion: number,
  clientVersion: number = SCHEMA_VERSION
): ApplyDecision {
  if (remoteVersion > clientVersion) return "skip";
  if (remoteVersion < clientVersion) return "migrate";
  return "apply";
}
