/**
 * Per-user cloud sync.
 *
 * Strategy (last-write-wins on a single jsonb document per user):
 *   • On sign-in, PULL the user's `user_data` row.
 *       – if it has data, it becomes the source of truth (other devices win),
 *       – if it's empty (brand-new account), PUSH the current local state up,
 *         migrating anything created in local-only mode into the cloud.
 *   • After hydration, every store change is debounced and PUSHED.
 *
 * The ephemeral `timer` slice is intentionally excluded (see exportSyncData),
 * so a running countdown never teleports between devices.
 */
import { useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { useStore } from "../store/useStore";
import type { SyncData } from "../types";
import { useAuth } from "../store/useAuth";

const TABLE = "user_data";
const PUSH_DEBOUNCE_MS = 1200;

export function useCloudSync(): void {
  const userId = useAuth((s) => s.user?.id ?? null);
  const status = useAuth((s) => s.status);

  // userId for which we've completed the initial pull — guards against pushing
  // local state up before we've pulled (which would clobber the cloud).
  const hydratedFor = useRef<string | null>(null);
  const pushTimer = useRef<number | null>(null);

  // PULL on sign-in / user change.
  useEffect(() => {
    if (!supabase || status !== "signed-in" || !userId) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase!
        .from(TABLE)
        .select("data")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;

      const cloud = (data?.data ?? null) as Partial<SyncData> | null;
      if (cloud && Object.keys(cloud).length > 0) {
        useStore.getState().applySyncData(cloud);
      } else {
        await supabase!
          .from(TABLE)
          .upsert({ user_id: userId, data: useStore.getState().exportSyncData() });
      }
      hydratedFor.current = userId;
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, status]);

  // PUSH (debounced) on any store change, once hydrated for this user.
  useEffect(() => {
    if (!supabase) return;
    const unsub = useStore.subscribe(() => {
      if (!userId || hydratedFor.current !== userId) return;
      if (pushTimer.current) window.clearTimeout(pushTimer.current);
      pushTimer.current = window.setTimeout(() => {
        void supabase!
          .from(TABLE)
          .upsert({ user_id: userId, data: useStore.getState().exportSyncData() });
      }, PUSH_DEBOUNCE_MS);
    });
    return () => {
      unsub();
      if (pushTimer.current) window.clearTimeout(pushTimer.current);
    };
  }, [userId]);

  // Forget hydration on sign-out so the next login re-pulls cleanly.
  useEffect(() => {
    if (status === "signed-out") hydratedFor.current = null;
  }, [status]);
}
