/**
 * Authentication state + operations, backed by Supabase Auth.
 *
 * A small Zustand store holds the reactive session/profile; the operation
 * methods wrap the Supabase SDK and return `{ error }` with *friendly*,
 * non-technical messages suited to the Pink Petals tone. Server-side, Supabase
 * handles password hashing (bcrypt), JWT sessions, OTP expiry and rate
 * limiting; we add client-side niceties (resend cooldown, attempt caps) in the
 * UI on top of that.
 */
import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, setRememberMe, isSupabaseConfigured, generateOtpCode, verifyOtpCode, deliverOtpByEmail } from "../lib/supabase";

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

type Status = "loading" | "signed-in" | "signed-out";

interface AuthResult {
  error?: string;
  /** True when sign-up created an account that still needs email confirmation
   *  (i.e. "Confirm email" is still ON in Supabase). Off → user is signed in. */
  pendingVerification?: boolean;
  /** The generated OTP code, returned by the DB function. */
  code?: string;
}

interface AuthState {
  status: Status;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** True while the user is completing a password-reset (recovery) link. */
  recovering: boolean;

  init: () => void;
  signUp: (email: string, password: string, remember: boolean) => Promise<AuthResult>;
  signIn: (email: string, password: string, remember: boolean) => Promise<AuthResult>;
  sendOtp: (email: string, remember: boolean) => Promise<AuthResult>;
  verifyOtp: (email: string, token: string, remember: boolean) => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  clearRecovering: () => void;
}

/** Translate Supabase/network errors into gentle, human messages. */
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
  if (m.includes("schema cache") || m.includes("could not find the function"))
    return "The database needs to be set up first. Run the schema from supabase/schema.sql in your Supabase SQL Editor.";
  if (m.includes("network") || m.includes("fetch")) return "We couldn't reach the server. Check your connection.";
  return message || "Something went wrong. Please try again.";
}

let initialized = false;

export const useAuth = create<AuthState>((set) => ({
  status: "loading",
  session: null,
  user: null,
  profile: null,
  recovering: false,

  init: () => {
    if (initialized) return;
    initialized = true;

    if (!supabase) {
      // Local-only mode — no backend configured.
      set({ status: "signed-out" });
      return;
    }

    const loadProfile = async (user: User | null) => {
      if (!user || !supabase) return set({ profile: null });
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

    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      set({ session, user: session?.user ?? null, status: session ? "signed-in" : "signed-out" });
      if (session?.user) void loadProfile(session.user);
    });

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") set({ recovering: true });
      set({
        session,
        user: session?.user ?? null,
        status: session ? "signed-in" : "signed-out",
      });
      if (session?.user) void loadProfile(session.user);
      else set({ profile: null });
    });
  },

  signUp: async (email, password, remember) => {
    if (!supabase) return { error: "Authentication isn't configured." };
    setRememberMe(remember);
    // When "Confirm email" is OFF in Supabase, signUp returns a session and the
    // auth listener signs the user straight in. When it's ON, there's no
    // session yet — we surface that as pendingVerification.
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) return { error: friendly(error.message) };
    return { pendingVerification: !data.session };
  },

  signIn: async (email, password, remember) => {
    if (!supabase) return { error: "Authentication isn't configured." };
    setRememberMe(remember);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? { error: friendly(error.message) } : {};
  },

  sendOtp: async (email, remember) => {
    if (!supabase) return { error: "Authentication isn't configured." };
    setRememberMe(remember);
    try {
      const code = await generateOtpCode(email);
      if (code) {
        if (import.meta.env.DEV) console.log("[OTP] Generated code for", email, "→", code);
        const sent = await deliverOtpByEmail(email, code);
        if (!sent) return { error: "Could not send the email. Check your SMTP settings or try again later." };
      }
      return { pendingVerification: true, code: code ?? undefined };
    } catch (e: any) {
      return { error: friendly(e?.message) };
    }
  },

  verifyOtp: async (email, token, remember) => {
    if (!supabase) return { error: "Authentication isn't configured." };
    setRememberMe(remember);
    try {
      const valid = await verifyOtpCode(email, token);
      if (!valid) return { error: "That code isn't correct or has expired. Please try again." };

      // Code verified — sign the user in. We use the OTP code as a one-time
      // password: on first use signUp creates the account, on subsequent
      // uses signInWithPassword finds it already there.
      const { error: pwError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: token.trim(),
      });

      // If the account doesn't exist yet, create it with the OTP as password.
      if (pwError) {
        const { error: upError } = await supabase.auth.signUp({
          email: email.trim(),
          password: token.trim(),
        });
        if (upError) return { error: friendly(upError.message) };
      }

      return {};
    } catch (e: any) {
      return { error: friendly(e?.message) };
    }
  },

  sendPasswordReset: async (email) => {
    if (!supabase) return { error: "Authentication isn't configured." };
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    return error ? { error: friendly(error.message) } : {};
  },

  updatePassword: async (password) => {
    if (!supabase) return { error: "Authentication isn't configured." };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: friendly(error.message) };
    set({ recovering: false });
    return {};
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, status: "signed-out" });
  },

  clearRecovering: () => set({ recovering: false }),
}));


