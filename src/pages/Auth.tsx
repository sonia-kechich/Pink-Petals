import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Flower2, Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "../store/useAuth";
import { FloatingPetals } from "../components/FloatingPetals";
import { fadeSlide } from "../lib/motion";

type Mode = "signin" | "signup" | "verify" | "forgot";

export default function Auth() {
  const recovering = useAuth((s) => s.recovering);
  const reduce = !!useReducedMotion();

  const [mode, setMode] = useState<Mode>("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const auth = useAuth;

  useEffect(() => {
    const params = new URLSearchParams(
      (window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash) ||
        window.location.search.slice(1)
    );
    const desc = params.get("error_description");
    if (desc) {
      setError(desc.replace(/\+/g, " "));
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const go = (m: Mode) => {
    setError(null);
    setInfo(null);
    setMode(m);
  };

  const wrap = async (fn: () => Promise<{ error?: string } | void>) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = (await fn()) ?? {};
      if ("error" in res && res.error) setError(res.error);
      return res;
    } finally {
      setBusy(false);
    }
  };

  const onSignUp = () =>
    wrap(async () => {
      if (!isValidEmail(email)) return { error: "Please enter a valid email address." };
      if (password.length < 8) return { error: "Please choose a password with at least 8 characters." };
      if (password !== confirm) return { error: "Those passwords don't match." };
      const res = await auth.getState().signUp(email, password, remember);
      if (!res.error && res.pendingVerification) setMode("verify");
      return res;
    });

  const onSignIn = () =>
    wrap(async () => {
      if (!isValidEmail(email)) return { error: "Please enter a valid email address." };
      const res = await auth.getState().signIn(email, password, remember);
      if (res.error && /confirm|verify/i.test(res.error)) {
        await auth.getState().resendSignup(email);
        setMode("verify");
        setInfo("We sent a fresh 6-digit code to your email.");
        return {};
      }
      return res;
    });

  const onVerify = (code: string) =>
    wrap(async () => {
      if (!/^\d{6}$/.test(code.trim()))
        return { error: "Please enter the 6-digit code from your email." };
      return auth.getState().verifyOtp(email, code);
    });

  const onResend = () =>
    wrap(async () => {
      const res = await auth.getState().resendSignup(email);
      if (!res.error) setInfo("A fresh code is on its way. 💌");
      return res;
    });

  const onForgot = () =>
    wrap(async () => {
      if (!isValidEmail(email)) return { error: "Please enter a valid email address." };
      const res = await auth.getState().sendPasswordReset(email);
      if (!res.error) setInfo("If an account exists, a reset link is on its way. 💌");
      return res;
    });

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <FloatingPetals count={6} />

      <div className="relative z-10 w-full max-w-sm">
        <Brand />

        <div className="card p-6">
          {recovering ? (
            <ResetPasswordView error={error} info={info} setError={setError} setInfo={setInfo} />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={mode} {...fadeSlide(reduce)}>
                {mode === "signin" && (
                  <Form
                    title="Welcome back"
                    subtitle="Your garden has been waiting. 🌸"
                    submitLabel="Sign in"
                    onSubmit={onSignIn}
                    busy={busy}
                    error={error}
                    info={info}
                  >
                    <Field icon={Mail} type="email" placeholder="Email" value={email} onChange={setEmail} autoComplete="email" />
                    <PasswordField value={password} onChange={setPassword} show={showPw} toggle={() => setShowPw((v) => !v)} autoComplete="current-password" />
                    <div className="flex items-center justify-between">
                      <RememberRow remember={remember} setRemember={setRemember} />
                      <Link onClick={() => go("forgot")}>Forgot password?</Link>
                    </div>
                    <p className="muted mt-4 text-center text-sm">
                      New here? <Link onClick={() => go("signup")}>Create an account</Link>
                    </p>
                  </Form>
                )}

                {mode === "signup" && (
                  <Form
                    title="Create your account"
                    subtitle="A calm place to bloom — just for you."
                    submitLabel="Create account"
                    onSubmit={onSignUp}
                    busy={busy}
                    error={error}
                    info={info}
                    back={() => go("signin")}
                  >
                    <Field icon={Mail} type="email" placeholder="Email" value={email} onChange={setEmail} autoComplete="email" />
                    <PasswordField value={password} onChange={setPassword} show={showPw} toggle={() => setShowPw((v) => !v)} hint="At least 8 characters" autoComplete="new-password" />
                    <PasswordField value={confirm} onChange={setConfirm} show={showPw} toggle={() => setShowPw((v) => !v)} placeholder="Confirm password" autoComplete="new-password" />
                    <RememberRow remember={remember} setRemember={setRemember} />
                    <p className="muted mt-4 text-center text-sm">
                      Already have an account? <Link onClick={() => go("signin")}>Sign in</Link>
                    </p>
                  </Form>
                )}

                {mode === "verify" && (
                  <VerifyView
                    email={email}
                    busy={busy}
                    error={error}
                    info={info}
                    onVerify={onVerify}
                    onResend={onResend}
                    back={() => go("signin")}
                  />
                )}

                {mode === "forgot" && (
                  <Form
                    title="Reset your password"
                    subtitle="We'll email you a secure reset link."
                    submitLabel="Send reset link"
                    onSubmit={onForgot}
                    busy={busy}
                    error={error}
                    info={info}
                    back={() => go("signin")}
                  >
                    <Field icon={Mail} type="email" placeholder="Email" value={email} onChange={setEmail} autoComplete="email" />
                  </Form>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <p className="muted mt-6 text-center text-xs">
          Protected by encrypted sign-in · your data stays yours
        </p>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="mb-6 flex flex-col items-center text-center">
      <span
        className="mb-3 grid h-16 w-16 place-items-center rounded-3xl"
        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))", boxShadow: "0 12px 30px -12px var(--accent)" }}
      >
        <Flower2 size={30} style={{ color: "var(--on-accent)" }} />
      </span>
      <h1 className="heading text-3xl" style={{ color: "var(--text)" }}>
        Pink Petals
      </h1>
      <p className="muted mt-1 text-sm">A calm place to plan, focus, and bloom.</p>
    </div>
  );
}

function ResetPasswordView({
  error, info, setError, setInfo,
}: {
  error: string | null;
  info: string | null;
  setError: (v: string | null) => void;
  setInfo: (v: string | null) => void;
}) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setInfo(null);
    if (pw.length < 8) return setError("Please choose a password with at least 8 characters.");
    if (pw !== confirm) return setError("Those passwords don't match.");
    setBusy(true);
    const res = await useAuth.getState().updatePassword(pw);
    setBusy(false);
    if (res.error) setError(res.error);
    else setInfo("Password updated — you're all set. 🌸");
  };

  return (
    <div>
      <div className="mb-4 text-center">
        <h2 className="heading text-xl" style={{ color: "var(--text)" }}>Choose a new password</h2>
        <p className="muted mt-1 text-sm">Make it something only you would know.</p>
      </div>
      <div className="flex flex-col gap-3">
        <PasswordField value={pw} onChange={setPw} show={show} toggle={() => setShow((v) => !v)} hint="At least 8 characters" autoComplete="new-password" />
        <PasswordField value={confirm} onChange={setConfirm} show={show} toggle={() => setShow((v) => !v)} placeholder="Confirm password" autoComplete="new-password" />
      </div>
      <Banner error={error} info={info} />
      <button onClick={submit} disabled={busy} className="btn mt-4 w-full !py-3">
        {busy ? <Loader2 size={18} className="animate-spin" /> : "Update password"}
      </button>
    </div>
  );
}

function VerifyView({
  email, busy, error, info, onVerify, onResend, back,
}: {
  email: string;
  busy: boolean;
  error: string | null;
  info: string | null;
  onVerify: (code: string) => void;
  onResend: () => void;
  back: () => void;
}) {
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [resends, setResends] = useState(0);
  const MAX_RESENDS = 5;

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const resend = () => {
    if (busy || cooldown > 0 || resends >= MAX_RESENDS) return;
    setResends((r) => r + 1);
    setCooldown(45);
    onResend();
  };

  return (
    <div>
      <BackButton onClick={back} />
      <div className="mb-4 text-center">
        <h2 className="heading text-xl" style={{ color: "var(--text)" }}>Check your email</h2>
        <p className="muted mt-1 text-sm">
          We sent a 6-digit code to{" "}
          <span className="font-semibold" style={{ color: "var(--text)" }}>{email || "your inbox"}</span>.
          Enter it below to confirm your account.
        </p>
      </div>

      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onKeyDown={(e) => e.key === "Enter" && code.length === 6 && onVerify(code)}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="6-digit verification code"
        placeholder="••••••"
        className="input text-center text-2xl font-semibold tracking-[0.6em]"
      />

      <Banner error={error} info={info} />

      <button
        type="button"
        onClick={() => onVerify(code)}
        disabled={busy || code.length !== 6}
        className="btn mt-4 w-full !py-3"
        style={{ opacity: code.length !== 6 ? 0.6 : 1 }}
      >
        {busy ? <Loader2 size={18} className="animate-spin" /> : "Verify & continue"}
      </button>

      <p className="muted mt-4 text-center text-sm">
        Didn't get it?{" "}
        {resends >= MAX_RESENDS ? (
          <span>Please try again in a little while.</span>
        ) : (
          <button
            type="button"
            onClick={resend}
            disabled={busy || cooldown > 0}
            className="font-semibold disabled:opacity-60"
            style={{ color: "var(--accent)" }}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
        )}
      </p>
      <p className="muted mt-2 text-center text-xs">
        Check your spam folder if it doesn't arrive within a minute.
      </p>
    </div>
  );
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function Form({
  title, subtitle, submitLabel, onSubmit, busy, error, info, back, children,
}: {
  title: string;
  subtitle: string;
  submitLabel: string;
  onSubmit: () => void;
  busy: boolean;
  error: string | null;
  info: string | null;
  back?: () => void;
  children: React.ReactNode;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {back && <BackButton onClick={back} />}
      <div className="mb-4 text-center">
        <h2 className="heading text-xl" style={{ color: "var(--text)" }}>{title}</h2>
        <p className="muted mt-1 text-sm">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
      <Banner error={error} info={info} />
      <button type="submit" disabled={busy} className="btn mt-4 w-full !py-3">
        {busy ? <Loader2 size={18} className="animate-spin" /> : submitLabel}
      </button>
    </form>
  );
}

function Field({
  icon: Icon, value, onChange, type = "text", placeholder, autoComplete,
}: {
  icon: typeof Mail;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder: string;
  autoComplete?: string;
}) {
  return (
    <label className="relative block">
      <Icon size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete={autoComplete}
        className="input !pl-11"
      />
    </label>
  );
}

function PasswordField({
  value, onChange, show, toggle, placeholder = "Password", hint, autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  toggle: () => void;
  placeholder?: string;
  hint?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="relative block">
        <Lock size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          autoComplete={autoComplete}
          className="input !px-11"
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--text-muted)" }}
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </label>
      {hint && <p className="muted mt-1 px-1 text-xs">{hint}</p>}
    </div>
  );
}

function RememberRow({ remember, setRemember }: { remember: boolean; setRemember: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => setRemember(!remember)}
      className="flex items-center gap-2 text-sm"
      style={{ color: "var(--text-muted)" }}
    >
      <span
        className="grid h-5 w-5 place-items-center rounded-md transition-colors"
        style={{
          background: remember ? "var(--accent)" : "transparent",
          border: `1.5px solid ${remember ? "var(--accent)" : "var(--text-muted)"}`,
          color: "var(--on-accent)",
        }}
      >
        {remember && "✓"}
      </span>
      Remember me
    </button>
  );
}

function Banner({ error, info }: { error: string | null; info: string | null }) {
  if (!error && !info) return null;
  const isError = !!error;
  return (
    <div
      className="mt-3 rounded-2xl px-3 py-2 text-sm"
      style={{
        background: isError ? "rgba(176,138,134,0.16)" : "rgba(120,170,130,0.16)",
        color: isError ? "#b0635f" : "#5c8a63",
      }}
      role={isError ? "alert" : "status"}
    >
      {typeof (error ?? info) === "string" ? error ?? info : ""}
    </div>
  );
}

function Link({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="font-semibold" style={{ color: "var(--accent)" }}>
      {children}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Back" className="mb-2 -ml-1 flex items-center gap-1 text-sm" style={{ color: "var(--text-muted)" }}>
      <ArrowLeft size={16} /> Back
    </button>
  );
}
