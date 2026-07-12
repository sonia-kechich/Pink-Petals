import { create } from "zustand";

export type SyncStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "offline"
  | "error";

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
  /** True when the cloud holds a NEWER schema than this client can apply —
   *  a non-fatal "please update the app" state; sync is paused, data is safe. */
  outdated: boolean;
  setStatus: (status: SyncStatus) => void;
  markSynced: () => void;
  setOutdated: (outdated: boolean) => void;
}

export const useSync = create<SyncState>((set) => ({
  status: "idle",
  lastSyncedAt: null,
  outdated: false,
  setStatus: (status) => set({ status }),
  markSynced: () => set({ status: "synced", lastSyncedAt: Date.now() }),
  setOutdated: (outdated) => set({ outdated }),
}));
