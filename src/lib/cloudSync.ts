/**
 * Per-user cloud sync with entity-level merge (no whole-document clobber) and
 * schema-version gating.
 *
 * Every read-modify-write goes through `migrateSyncDoc` (version gate) then
 * `mergeUserData`, so concurrent edits on different devices converge instead of
 * overwriting, and a doc written by a NEWER app version is never blindly applied:
 *   • PULL (sign-in) / REALTIME (other device) → gate remote, merge into local,
 *     apply, and write the merge back if local contributed anything remote lacked.
 *   • PUSH (debounced on change, or flushed per-note) → re-read + gate remote,
 *     merge local into it, write.
 *   • RECONNECT (online) → if local differs from what we last synced, push.
 *   • REMOTE NEWER than this client → pause sync, keep local data, flag
 *     `outdated` (non-fatal "please update"), and never push over the newer doc.
 *
 * Signatures use `stableStringify` (sorted keys) so jsonb key-ordering can't
 * defeat the echo-guard; `lastSyncedJson` is the last doc we agreed on with the
 * cloud; `applyingRemote` suppresses the echo push a local apply would trigger.
 */
import { useEffect, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { useStore } from "../store/useStore";
import { useAuth } from "../store/useAuth";
import { useSync } from "../store/useSync";
import { mergeUserData, migrateSyncDoc, gcTombstones, stableStringify } from "./mergeSync";
import { registerSyncPush } from "./syncPush";
import type { SyncData } from "../types";

const TABLE = "user_data";
const PUSH_DEBOUNCE_MS = 900;

export function useCloudSync(): void {
  const userId = useAuth((s) => s.user?.id ?? null);
  const status = useAuth((s) => s.status);

  const applyingRemote = useRef(false);
  const lastSyncedJson = useRef<string | null>(null);
  const hydrated = useRef(false);
  const outdated = useRef(false);
  const pushTimer = useRef<number | null>(null);

  // Forget sync bookkeeping on sign-out so the next login re-pulls cleanly.
  useEffect(() => {
    if (status === "signed-out") {
      lastSyncedJson.current = null;
      hydrated.current = false;
      outdated.current = false;
      if (isSupabaseConfigured) {
        useSync.getState().setOutdated(false);
        useSync.getState().setStatus("idle");
      }
    }
  }, [status]);

  useEffect(() => {
    if (!isSupabaseConfigured || status !== "signed-in" || !userId) return;
    let cancelled = false;
    let channel: ReturnType<SupabaseClient["channel"]> | null = null;
    let unsub: (() => void) | null = null;
    let detachListeners: (() => void) | null = null;
    let activeClient: SupabaseClient | null = null;
    hydrated.current = false;
    outdated.current = false;

    // Acquire the lazily-loaded client (already resolved if auth booted it),
    // then wire up sync. Everything below mirrors the original setup; it just
    // runs once the client is available.
    void (async () => {
      const client = await getSupabase();
      if (!client || cancelled) return;
      activeClient = client;

    const online = () => navigator.onLine;

    const flagOutdated = () => {
      outdated.current = true;
      useSync.getState().setOutdated(true);
      // Non-fatal: keep local data intact, pause sync until the app is updated.
      console.warn(
        "[sync] Cloud data uses a newer schema than this app version. Sync paused; local data preserved. Please update the app."
      );
    };

    const fetchRemoteRaw = async (): Promise<unknown | null> => {
      const { data, error } = await client
        .from(TABLE)
        .select("data")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      const raw = data?.data ?? null;
      if (!raw || (typeof raw === "object" && Object.keys(raw).length === 0)) return null;
      return raw;
    };

    const writeRemote = async (data: SyncData) => {
      const { error } = await client.from(TABLE).upsert({ user_id: userId, data });
      if (error) throw error;
    };

    /** Merge a (already version-gated) remote doc into local, apply, set guard. */
    const applyMerged = (remote: SyncData): SyncData => {
      const local = useStore.getState().exportSyncData();
      const m = mergeUserData(local, remote);
      const merged: SyncData = { ...m, deletedIds: gcTombstones(m.deletedIds, Date.now()) };
      applyingRemote.current = true;
      useStore.getState().applySyncData(merged);
      applyingRemote.current = false;
      lastSyncedJson.current = stableStringify(useStore.getState().exportSyncData());
      return merged;
    };

    /** Read-modify-write: gate + merge local into the latest remote, write. */
    const pushNow = async () => {
      if (outdated.current) return; // never clobber a newer cloud doc
      try {
        useSync.getState().setStatus(online() ? "syncing" : "offline");
        const raw = await fetchRemoteRaw();
        if (cancelled) return;
        if (raw == null) {
          const local = useStore.getState().exportSyncData();
          await writeRemote(local);
          lastSyncedJson.current = stableStringify(local);
          useSync.getState().markSynced();
          return;
        }
        const { status: gate, doc } = migrateSyncDoc(raw);
        if (gate === "skipped" || !doc) {
          flagOutdated();
          return;
        }
        const merged = applyMerged(doc);
        await writeRemote(merged);
        lastSyncedJson.current = stableStringify(merged);
        useSync.getState().markSynced();
      } catch {
        useSync.getState().setStatus(online() ? "error" : "offline");
      }
    };

    const schedulePush = () => {
      if (outdated.current) return;
      if (pushTimer.current) window.clearTimeout(pushTimer.current);
      pushTimer.current = window.setTimeout(() => void pushNow(), PUSH_DEBOUNCE_MS);
    };

    // Let other modules (per-note debounce) funnel into this same push.
    registerSyncPush({ schedule: schedulePush, flush: () => void pushNow() });

    // ---- initial pull -------------------------------------------------
    useSync.getState().setStatus(online() ? "syncing" : "offline");
    (async () => {
      try {
        const raw = await fetchRemoteRaw();
        if (cancelled) return;
        if (raw == null) {
          const local = useStore.getState().exportSyncData();
          await writeRemote(local);
          lastSyncedJson.current = stableStringify(local);
          useSync.getState().markSynced();
        } else {
          const { status: gate, doc } = migrateSyncDoc(raw);
          if (gate === "skipped" || !doc) {
            flagOutdated(); // remote newer → keep local, don't apply/push
          } else {
            const merged = applyMerged(doc);
            if (stableStringify(merged) !== stableStringify(doc)) {
              await writeRemote(merged);
              lastSyncedJson.current = stableStringify(merged);
            }
            useSync.getState().markSynced();
          }
        }
      } catch {
        useSync.getState().setStatus("error");
      } finally {
        if (!cancelled) hydrated.current = true;
      }
    })();

    // ---- realtime: writes from this user's other devices --------------
    channel = client
      .channel(`user_data:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE, filter: `user_id=eq.${userId}` },
        (payload) => {
          const raw = (payload.new as { data?: unknown } | null)?.data;
          if (!raw) return;
          const { status: gate, doc } = migrateSyncDoc(raw);
          if (gate === "skipped" || !doc) {
            flagOutdated();
            return;
          }
          if (stableStringify(doc) === lastSyncedJson.current) return; // our own echo
          const merged = applyMerged(doc);
          if (stableStringify(merged) !== stableStringify(doc)) {
            void writeRemote(merged)
              .then(() => {
                lastSyncedJson.current = stableStringify(merged);
                useSync.getState().markSynced();
              })
              .catch(() => useSync.getState().setStatus("error"));
          } else {
            useSync.getState().markSynced();
          }
        }
      )
      .subscribe();

    // ---- push on local change (debounced) -----------------------------
    unsub = useStore.subscribe(() => {
      if (!hydrated.current || applyingRemote.current || outdated.current) return;
      const json = stableStringify(useStore.getState().exportSyncData());
      if (json === lastSyncedJson.current) return; // nothing meaningful changed
      useSync.getState().setStatus(online() ? "syncing" : "offline");
      schedulePush();
    });

    // ---- connectivity: re-push edits stranded while offline -----------
    const onOffline = () => useSync.getState().setStatus("offline");
    const onOnline = () => {
      if (!hydrated.current || outdated.current) return;
      const json = stableStringify(useStore.getState().exportSyncData());
      if (json !== lastSyncedJson.current) {
        useSync.getState().setStatus("syncing");
        schedulePush();
      } else {
        useSync.getState().markSynced();
      }
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    detachListeners = () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
    if (!online()) useSync.getState().setStatus("offline");
    })();

    return () => {
      cancelled = true;
      registerSyncPush(null);
      if (activeClient && channel) void activeClient.removeChannel(channel);
      unsub?.();
      detachListeners?.();
      if (pushTimer.current) window.clearTimeout(pushTimer.current);
    };
  }, [userId, status]);
}
