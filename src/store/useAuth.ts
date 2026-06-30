import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, setRememberMe, isSupabaseConfigured } from "../lib/supabase";

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

type Status = "loading" | "signed-in" | "signed-out";

interface AuthResult {
  error?: string;
  pendingVerification?: boolean;
}

interface AuthState {
  status: Status;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  recovering: boolean;

  init: () => void;
  signUp: (email: string, password: string, remember: boolean) => Promise<AuthResult>;
  signIn: (email: string, password: string, remember: boolean) => Promise<AuthResult>;
  verifyOtp: (email: string, token: string) => Promise<AuthResult>;
  resendSignup: (email: string) => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  clearRecovering: () => void;
}

function friendly(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login credentials")) return "That email or password doesn't look right.";
  if (m.includes("email not confirmed")) return "Please verify your email first — check your inbox for the code.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "An account with this email already exists. Try signing in instead.";
  if (m.includes("token has expired") || m.includes("expired"))
    return "That code has expired. Tap resend to get a fresh one.";
  if (m.includes("invalid") && m.includes("otp")) return "That code isn't correct. Please try again.";
  if (m.includes("password should be at least") || m.includes("password"))
    return "Please choose a password with at least 8 characters.";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("for security purposes"))
    return "A little too fast — please wait a moment and try again.";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "Please enter a valid email address.";
  if (m.includes("network") || m.includes("fetch")) return "We couldn't reach the server. Check your connection.";
  // The backend couldn't deliver the verification email (bad/throttled SMTP,
  // built-in mailer rate limit, or a template error). Don't leak the raw 500.
  if (
    m.includes("error sending") ||
    m.includes("confirmation email") ||
    (m.includes("sending") && m.includes("email")) ||
    m.includes("unexpected_failure") ||
    m.includes("database error")
  )
    return "We couldn't send your verification email right now. Please try again in a few minutes.";
  // Final guard: never surface an empty, JSON-ish, or non-human message
  // (e.g. a raw "{}" body) to the user.
  const human =
    !!message &&
    /[a-zA-Z]/.test(message) &&
    !message.trim().startsWith("{") &&
    !message.trim().startsWith("[");
  return human ? message : "Something went wrong. Please try again.";
}

/**
 * Where auth emails (password reset, confirmation link) should send the user.
 * On the web this is the current origin. Inside the Capacitor app the origin is
 * `http://localhost`, which isn't in Supabase's redirect allow-list, so the
 * link can't return to the app — there we fall back to the deployed web URL
 * (set via `VITE_PUBLIC_APP_URL`) so the user finishes in a real browser.
 */
function authRedirectUrl(): string {
  const isNative = Boolean(
    (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
  );
  const configured = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  if (isNative && configured) return configured;
  return window.location.origin;
}

let initialized = false;
/** Kept so the auth listener can be torn down if ever needed (and to make the
 *  app-lifetime subscription explicit rather than dangling). */
let authSubscription: { unsubscribe: () => void } | null = null;

export const useAuth = create<AuthState>((set) => ({
  status: "loading",
  session: null,
  user: null,
  profile: null,
  recovering: false,

  init: () => {
    if (initialized) return;
    initialized = true;

    if (!isSupabaseConfigured) {
      set({ status: "signed-out" });
      return;
    }

    // Lazy-load the client on boot when sync IS configured, then restore any
    // persisted session. This runs at app start (App calls init() in an effect),
    // so an already-logged-in user is still signed back in automatically —
    // "lazy" means "skip the SDK entirely when sync is unconfigured", not
    // "defer session restore until a manual action".
    void (async () => {
      const supabase = await getSupabase();
      if (!supabase) {
        set({ status: "signed-out" });
        return;
      }

      const loadProfile = async (user: User | null) => {
        if (!user) return set({ profile: null });
        const { data } = await supabase
          .from("profiles")
          .select("id, email, display_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        set({
          profile:
            (data as Profile) ?? {
              id: user.id,
              email: user.email ?? null,
              display_name: (user.user_metadata?.display_name as string) ?? null,
              avatar_url: null,
            },
        });
      };

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      set({ session, user: session?.user ?? null, status: session ? "signed-in" : "signed-out" });
      if (session?.user) void loadProfile(session.user);

      authSubscription?.unsubscribe();
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY") set({ recovering: true });
        set({
          session,
          user: session?.user ?? null,
          status: session ? "signed-in" : "signed-out",
        });
        if (session?.user) void loadProfile(session.user);
        else set({ profile: null });
      });
      authSubscription = data.subscription;
    })();
  },

  signUp: async (email, password, remember) => {
    const supabase = await getSupabase();
    if (!supabase) return { error: "Authentication isn't configured." };
    setRememberMe(remember);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: authRedirectUrl() },
    });
    if (error) return { error: friendly(error.message) };
    return { pendingVerification: !data.session };
  },

  signIn: async (email, password, remember) => {
    const supabase = await getSupabase();
    if (!supabase) return { error: "Authentication isn't configured." };
    setRememberMe(remember);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? { error: friendly(error.message) } : {};
  },

  verifyOtp: async (email, token) => {
    const supabase = await getSupabase();
    if (!supabase) return { error: "Authentication isn't configured." };
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: "signup",
    });
    return error ? { error: friendly(error.message) } : {};
  },

  resendSignup: async (email) => {
    const supabase = await getSupabase();
    if (!supabase) return { error: "Authentication isn't configured." };
    const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
    return error ? { error: friendly(error.message) } : {};
  },

  sendPasswordReset: async (email) => {
    const supabase = await getSupabase();
    if (!supabase) return { error: "Authentication isn't configured." };
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: authRedirectUrl(),
    });
    return error ? { error: friendly(error.message) } : {};
  },

  updatePassword: async (password) => {
    const supabase = await getSupabase();
    if (!supabase) return { error: "Authentication isn't configured." };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: friendly(error.message) };
    set({ recovering: false });
    return {};
  },

  signOut: async () => {
    const supabase = await getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, status: "signed-out" });
  },

  clearRecovering: () => set({ recovering: false }),
}));

export { isSupabaseConfigured };
