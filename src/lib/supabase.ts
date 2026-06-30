import type { SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(url && anonKey);

const REMEMBER_KEY = "pp-remember-me";

export function setRememberMe(remember: boolean): void {
  try {
    window.localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
  } catch {
  }
}

function remembering(): boolean {
  try {
    return window.localStorage.getItem(REMEMBER_KEY) !== "0";
  } catch {
    return true;
  }
}

const rememberAwareStorage = {
  getItem: (key: string): string | null => {
    try {
      return window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      const target = remembering() ? window.localStorage : window.sessionStorage;
      const other = remembering() ? window.sessionStorage : window.localStorage;
      target.setItem(key, value);
      other.removeItem(key);
    } catch {
    }
  },
  removeItem: (key: string): void => {
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {
    }
  },
};

/**
 * Lazily-created singleton Supabase client.
 *
 * The heavy `@supabase/supabase-js` SDK (~120 KB min) is loaded via a DYNAMIC
 * import so it stays out of the entry chunk — it's fetched only when sync is
 * configured AND something actually needs the client (auth boot, sync, account
 * deletion). The `import type` above is erased at build time, so this module
 * itself pulls nothing into the bundle.
 *
 * Singleton integrity: the in-flight import promise is cached in `clientPromise`
 * at module scope, so every caller — via any import path — awaits the same
 * promise and shares ONE client instance (no double-init, one auth listener,
 * one realtime connection). Returns null when sync isn't configured.
 */
let clientPromise: Promise<SupabaseClient | null> | null = null;

export function getSupabase(): Promise<SupabaseClient | null> {
  if (!clientPromise) {
    clientPromise = isSupabaseConfigured
      ? import("@supabase/supabase-js").then(({ createClient }) =>
          createClient(url!, anonKey!, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
              flowType: "implicit",
              storage: rememberAwareStorage,
              storageKey: "pp-auth",
            },
          })
        )
      : // Unconfigured: cache a resolved-null so the SDK is never imported and
        // every caller still shares one stable promise (singleton).
        Promise.resolve(null);
  }
  return clientPromise;
}
