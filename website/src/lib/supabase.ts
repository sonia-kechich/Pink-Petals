/**
 * Supabase client — the backend for authentication and per-user cloud sync.
 *
 * Auth is a *progressive enhancement*: when the two env vars are present the
 * app gates behind sign-in and syncs data to the cloud; when they're absent
 * (a fresh clone, CI, or someone who just wants the local PWA) `supabase` is
 * null and the app runs exactly as it always has — fully local, no account.
 *
 * See `.env.example` and the README "Authentication" section for setup.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/** True only when both credentials are configured. Drives the auth gate. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/* ------------------------------------------------------------------ *
 *  "Remember me" — persistent vs session-only token storage
 * ------------------------------------------------------------------ */

const REMEMBER_KEY = "pp-remember-me";

/** Record the user's "remember me" choice (read by the storage adapter). */
export function setRememberMe(remember: boolean): void {
  try {
    window.localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
  } catch {
    /* storage may be unavailable (private mode) — default to remembering */
  }
}

function remembering(): boolean {
  try {
    // Default to remembering unless the user explicitly opted out.
    return window.localStorage.getItem(REMEMBER_KEY) !== "0";
  } catch {
    return true;
  }
}

/**
 * Storage adapter that routes the session token to localStorage (persists
 * across restarts — "remember me") or sessionStorage (cleared when the tab
 * closes). Reads check both so an existing session is always found.
 */
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
      other.removeItem(key); // never leave a stale copy in the other store
    } catch {
      /* ignore */
    }
  },
  removeItem: (key: string): void => {
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

/**
 * Generate a 6-digit OTP code for the given email, stored in the database.
 * Returns the code so the UI can display it (local/demo mode) or send it via
 * your own channel. Returns null when Supabase isn't configured.
 */
export async function generateOtpCode(email: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("generate_otp", { p_email: email.trim() });
  if (error) throw error;
  return data as string;
}

/**
 * Verify an OTP code against the database. Consumes the code on success
 * so it cannot be replayed. Returns false when Supabase isn't configured.
 */
export async function verifyOtpCode(email: string, code: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("verify_otp", {
    p_email: email.trim(),
    p_code: code.trim(),
  });
  if (error) throw error;
  return data as boolean;
}

/**
 * Call the send-otp Edge Function to deliver the code via email.
 * Falls back silently when the function isn't deployed or Supabase is off.
 */
const EDGE_FUNCTIONS_URL: string | null = url
  ? `${url.replace(/\/+$/, "")}/functions/v1`
  : null;

export async function deliverOtpByEmail(email: string, code: string): Promise<boolean> {
  if (!EDGE_FUNCTIONS_URL) return false;
  try {
    const res = await fetch(`${EDGE_FUNCTIONS_URL}/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}` },
      body: JSON.stringify({ email, code }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn("[deliverOtpByEmail] Edge Function error:", res.status, text);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[deliverOtpByEmail] Network error:", err);
    return false;
  }
}

/** The shared client, or null when auth isn't configured (local-only mode). */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // parses the session from confirmation/recovery links
        // Implicit (not PKCE) so emailed links verify in ANY browser — PKCE
        // needs a code-verifier stored in the originating context, which an
        // email link opened elsewhere won't have, making the link "not work".
        flowType: "implicit",
        storage: rememberAwareStorage,
        storageKey: "pp-auth",
      },
    })
  : null;
