/**
 * In-app account / data deletion.
 *
 * What a client CAN safely do with the anon key:
 *   • LOCAL  — wipe the persisted store + caches from this device.
 *   • CLOUD  — delete the user's row in `user_data` (requires the DELETE RLS
 *              policy added in supabase/schema.sql; without it the delete is a
 *              no-op blocked by RLS — we still succeed locally and sign out).
 *
 * What a client CANNOT do: delete its own auth.users row with the anon key.
 * That needs a privileged server step. We OPTIONALLY invoke an edge function
 * (`delete-account`, scaffolded in supabase/functions/delete-account/) which
 * uses the service-role key to call `auth.admin.deleteUser`. If that function
 * isn't deployed, deletion still erases data + signs the user out, and true
 * auth-row removal remains a MANUAL/server action (see docs/SECURITY_AND_OPS.md).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

const USER_DATA_TABLE = "user_data";
const DELETE_FUNCTION = "delete-account";

/** localStorage/sessionStorage keys this app owns (persisted store, auth,
 *  per-device prefs). Cleared on full account deletion. */
const APP_STORAGE_KEYS = [
  "calm-planner-v1", // zustand persisted store (see useStore persist name)
  "pp-auth", // supabase auth session
  "pp-remember-me",
  "pp-locale",
];

export interface DeleteAccountResult {
  cloudDataDeleted: boolean;
  authAccountDeleted: boolean;
  /** Non-fatal warnings (e.g. cloud delete blocked, edge fn absent). */
  warnings: string[];
}

/** Best-effort delete of the user's synced document. */
async function deleteCloudData(
  client: SupabaseClient,
  userId: string
): Promise<{ ok: boolean; warning?: string }> {
  const { error } = await client.from(USER_DATA_TABLE).delete().eq("user_id", userId);
  if (error) return { ok: false, warning: `Cloud data delete failed: ${error.message}` };
  return { ok: true };
}

/** Optionally invoke the privileged edge function to remove the auth user. */
async function deleteAuthAccount(
  client: SupabaseClient
): Promise<{ ok: boolean; warning?: string }> {
  try {
    const { error } = await client.functions.invoke(DELETE_FUNCTION, { body: {} });
    if (error) {
      return {
        ok: false,
        warning:
          "Auth account not deleted server-side (delete-account function unavailable). Data erased and signed out instead.",
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      warning:
        "Auth account not deleted server-side (delete-account function unavailable). Data erased and signed out instead.",
    };
  }
}

/** Remove all of this app's locally persisted data + caches. */
export function wipeLocalData(): void {
  try {
    for (const key of APP_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    }
  } catch {
    /* storage may be unavailable; reload below still resets in-memory state */
  }
  // Clear any service-worker caches (PWA) so stale data can't reappear.
  if (typeof caches !== "undefined") {
    void caches
      .keys()
      .then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .catch(() => {});
  }
}

/**
 * Full account deletion flow. Deletes cloud data, attempts privileged auth
 * deletion (if the edge function is deployed), signs out, and wipes local data.
 * Irreversible.
 */
export async function deleteAccount(
  client: SupabaseClient | null,
  userId: string | null
): Promise<DeleteAccountResult> {
  const warnings: string[] = [];
  let cloudDataDeleted = false;
  let authAccountDeleted = false;

  if (client && userId) {
    const cloud = await deleteCloudData(client, userId);
    cloudDataDeleted = cloud.ok;
    if (cloud.warning) warnings.push(cloud.warning);

    const auth = await deleteAuthAccount(client);
    authAccountDeleted = auth.ok;
    if (auth.warning) warnings.push(auth.warning);

    try {
      await client.auth.signOut();
    } catch {
      /* ignore — we wipe local regardless */
    }
  }

  wipeLocalData();
  return { cloudDataDeleted, authAccountDeleted, warnings };
}
