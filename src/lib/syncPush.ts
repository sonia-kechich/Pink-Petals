/**
 * Tiny registry that lets any module ask the (single, merge-based, echo-guarded)
 * cloud-push to run, without creating a second push path. `useCloudSync`
 * registers its debounced `schedule` and immediate `flush`; callers (e.g. the
 * per-note debounce) funnel through here so everything still goes through
 * `mergeUserData` and the echo-guard.
 */
export interface SyncPushApi {
  /** Debounced push (coalesces with other changes). */
  schedule: () => void;
  /** Push as soon as possible (used by flush-on-blur/close). */
  flush: () => void;
}

let api: SyncPushApi | null = null;

export function registerSyncPush(next: SyncPushApi | null): void {
  api = next;
}

export function requestSyncPush(): void {
  api?.schedule();
}

export function flushSyncPush(): void {
  api?.flush();
}
