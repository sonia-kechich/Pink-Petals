import { useRef, useState } from "react";
import { Sun, Moon, Monitor, LogOut, Flower2, Download, Upload, AlertTriangle } from "lucide-react";
import { useStore } from "../store/useStore";
import { useAuth, isSupabaseConfigured } from "../store/useAuth";
import { getSupabase } from "../lib/supabase";
import { Card, PageTitle } from "../components/Card";
import { SyncStatus } from "../components/SyncStatus";
import { useI18n, useT, LOCALES, type Locale } from "../lib/i18n";
import { buildBackup, backupFilename, parseBackup, mergeBackup } from "../lib/backup";
import { deleteAccount } from "../lib/account";
import type { ThemeMode } from "../types";

const THEMES: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

export default function Settings() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetAll = useStore((s) => s.resetAll);
  const [confirmReset, setConfirmReset] = useState(false);

  const t = useT();
  const { locale, setLocale } = useI18n();

  const profile = useAuth((s) => s.profile);
  const user = useAuth((s) => s.user);
  const signedIn = useAuth((s) => s.status === "signed-in");
  const signOut = useAuth((s) => s.signOut);

  const accountName = profile?.display_name || settings.userName || "Your account";
  const accountEmail = profile?.email || user?.email || "";
  // Safe-degrade guard: until "Confirm email" is re-enabled in the auth
  // dashboard, surface unverified accounts rather than silently trusting them.
  const emailUnverified = Boolean(user && !user.email_confirmed_at);

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <div className="flex flex-col gap-5">
        {isSupabaseConfigured && signedIn && (
          <section>
            <Label>Account</Label>
            <Card className="flex items-center gap-3">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))", color: "var(--on-accent)" }}
              >
                <Flower2 size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold" style={{ color: "var(--text)" }}>
                  {accountName}
                </p>
                {accountEmail && <p className="muted truncate text-xs">{accountEmail}</p>}
                <div className="mt-1.5">
                  <SyncStatus />
                </div>
              </div>
              <button onClick={signOut} aria-label="Sign out" className="btn-soft !px-3 !py-2">
                <LogOut size={16} />
              </button>
            </Card>
            {emailUnverified && (
              <p
                className="mt-2 flex items-start gap-2 rounded-2xl px-3 py-2 text-xs"
                role="status"
                style={{ background: "rgba(199,154,79,0.16)", color: "#9a7636" }}
              >
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                {t("settings.emailUnverified")}
              </p>
            )}
          </section>
        )}

        <section>
          <Label>{t("settings.yourName")}</Label>
          <input
            className="input"
            placeholder={t("settings.namePlaceholder")}
            aria-label={t("settings.nameLabel")}
            value={settings.userName}
            onChange={(e) => updateSettings({ userName: e.target.value })}
          />
        </section>

        <section>
          <Label>{t("settings.language")}</Label>
          <div className="flex gap-2">
            {LOCALES.map(({ id, label }) => {
              const active = locale === id;
              return (
                <button
                  key={id}
                  onClick={() => setLocale(id as Locale)}
                  aria-pressed={active}
                  className="flex-1 rounded-2xl py-3 text-sm font-semibold transition-colors"
                  style={{
                    background: active ? "var(--accent)" : "var(--surface)",
                    color: active ? "var(--on-accent)" : "var(--text-muted)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <Label>Appearance</Label>
          <div className="flex gap-2">
            {THEMES.map(({ id, label, icon: Icon }) => {
              const active = settings.theme === id;
              return (
                <button
                  key={id}
                  onClick={() => updateSettings({ theme: id })}
                  className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl py-3 text-sm font-semibold transition-colors"
                  style={{
                    background: active ? "var(--accent)" : "var(--surface)",
                    color: active ? "var(--on-accent)" : "var(--text-muted)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <Icon size={18} />
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <Label>Timer</Label>
          <Card className="flex flex-col gap-4">
            <Stepper
              label="Focus length"
              value={settings.pomodoroFocus}
              suffix="min"
              min={5}
              max={90}
              step={5}
              onChange={(v) => updateSettings({ pomodoroFocus: v })}
            />
            <div className="h-px" style={{ background: "var(--border)" }} />
            <Stepper
              label="Break length"
              value={settings.pomodoroBreak}
              suffix="min"
              min={1}
              max={30}
              step={1}
              onChange={(v) => updateSettings({ pomodoroBreak: v })}
            />
            <div className="h-px" style={{ background: "var(--border)" }} />
            <Toggle
              label="Gentle chime when a timer ends"
              value={settings.soundOnComplete}
              onChange={(v) => updateSettings({ soundOnComplete: v })}
            />
            <div className="h-px" style={{ background: "var(--border)" }} />
            <Toggle
              label="Notify me when a focus session ends"
              value={settings.notifyOnComplete}
              onChange={(v) => updateSettings({ notifyOnComplete: v })}
            />
          </Card>
        </section>

        <section>
          <Label>{t("settings.data")}</Label>
          <BackupControls />
        </section>

        <section>
          <Label>Reset</Label>
          {confirmReset ? (
            <Card className="flex flex-col gap-3">
              <p className="text-sm" style={{ color: "var(--text)" }}>
                {t("settings.resetConfirm")}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    resetAll();
                    setConfirmReset(false);
                  }}
                  className="btn flex-1"
                  style={{ background: "var(--danger)", color: "#fff" }}
                >
                  {t("settings.eraseEverything")}
                </button>
                <button onClick={() => setConfirmReset(false)} className="btn-soft flex-1">
                  {t("settings.keepData")}
                </button>
              </div>
            </Card>
          ) : (
            <button onClick={() => setConfirmReset(true)} className="btn-soft w-full">
              {t("settings.resetAll")}
            </button>
          )}
        </section>

        {isSupabaseConfigured && signedIn && <DangerZone />}

        <p className="muted py-2 text-center text-xs">Pink Petals · made to feel calm</p>
      </div>
    </div>
  );
}

/** Export to / import from a JSON backup file. */
function BackupControls() {
  const t = useT();
  const exportSyncData = useStore((s) => s.exportSyncData);
  const applySyncData = useStore((s) => s.applySyncData);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const onExport = () => {
    const backup = buildBackup(exportSyncData(), new Date().toISOString());
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = backupFilename(new Date());
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onImportFile = async (file: File) => {
    setMsg(null);
    const text = await file.text();
    const parsed = parseBackup(text);
    if (!parsed.ok) {
      setMsg({
        ok: false,
        text: parsed.reason === "newer" ? t("settings.importNewer") : t("settings.importInvalid"),
      });
      return;
    }
    // Migrate-then-merge: the parsed doc is already at the current schema; merge
    // it into local so importing an old backup never clobbers newer data.
    const merged = mergeBackup(exportSyncData(), parsed.data);
    applySyncData(merged);
    setMsg({ ok: true, text: t("settings.importSuccess") });
  };

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm" style={{ color: "var(--text)" }}>
            {t("settings.exportBackup")}
          </span>
          <button onClick={onExport} className="btn-soft !px-3 !py-2">
            <Download size={16} /> {t("common.export")}
          </button>
        </div>
        <p className="muted text-xs">{t("settings.exportHint")}</p>
      </div>

      <div className="h-px" style={{ background: "var(--border)" }} />

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm" style={{ color: "var(--text)" }}>
            {t("settings.importBackup")}
          </span>
          <button onClick={() => fileRef.current?.click()} className="btn-soft !px-3 !py-2">
            <Upload size={16} /> {t("common.import")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label={t("settings.importBackup")}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onImportFile(file);
              e.target.value = ""; // allow re-importing the same file
            }}
          />
        </div>
        <p className="muted text-xs">{t("settings.importHint")}</p>
      </div>

      {msg && (
        <p
          role={msg.ok ? "status" : "alert"}
          className="rounded-2xl px-3 py-2 text-xs"
          style={{
            background: msg.ok ? "rgba(120,170,130,0.16)" : "rgba(176,138,134,0.16)",
            color: msg.ok ? "#5c8a63" : "#b0635f",
          }}
        >
          {msg.text}
        </p>
      )}
    </Card>
  );
}

/** Irreversible, type-to-confirm account + data deletion. */
function DangerZone() {
  const t = useT();
  const userId = useAuth((s) => s.user?.id ?? null);
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const word = t("settings.deleteConfirmWord");
  const armed = confirmText.trim().toUpperCase() === word;

  const onDelete = async () => {
    if (!armed || busy) return;
    setBusy(true);
    setWarning(null);
    const client = await getSupabase();
    const res = await deleteAccount(client, userId);
    // Local data is wiped regardless; reload to a clean signed-out app.
    if (res.warnings.length > 0 && !res.authAccountDeleted) {
      // Show briefly, then still reload (data is gone; auth row may persist).
      setWarning(res.warnings.join(" "));
      window.setTimeout(() => window.location.reload(), 1800);
    } else {
      window.location.reload();
    }
  };

  return (
    <section>
      <Label>{t("settings.dangerZone")}</Label>
      {open ? (
        <Card className="flex flex-col gap-3">
          <p className="text-sm" style={{ color: "var(--text)" }}>
            {t("settings.deleteAccountHint")}
          </p>
          <p className="muted text-xs">{t("settings.deleteServerNote")}</p>
          <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            {t("settings.deleteConfirmPrompt", { word })}
          </label>
          <input
            className="input"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={word}
            aria-label={t("settings.deleteConfirmPrompt", { word })}
            autoComplete="off"
          />
          {warning && (
            <p role="alert" className="rounded-2xl px-3 py-2 text-xs" style={{ background: "rgba(176,138,134,0.16)", color: "#b0635f" }}>
              {warning}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={onDelete}
              disabled={!armed || busy}
              className="btn flex-1"
              style={{ background: "#b0635f", color: "#fff", opacity: !armed || busy ? 0.55 : 1 }}
            >
              {busy ? t("settings.deleting") : t("settings.deleteConfirmButton")}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setConfirmText("");
                setWarning(null);
              }}
              disabled={busy}
              className="btn-soft flex-1"
            >
              {t("common.cancel")}
            </button>
          </div>
        </Card>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="btn-soft w-full"
          style={{ color: "#b0635f" }}
        >
          <AlertTriangle size={16} /> {t("settings.deleteAccount")}
        </button>
      )}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="muted mb-2 px-1 text-xs font-semibold uppercase tracking-wide">
      {children}
    </h2>
  );
}

function Stepper({
  label,
  value,
  suffix,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: "var(--text)" }}>
        {label}
      </span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          aria-label={`Decrease ${label}`}
          className="icon-btn"
          style={{ background: "var(--surface-2)" }}
        >
          –
        </button>
        <span className="w-16 text-center text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>
          {value} {suffix}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          aria-label={`Increase ${label}`}
          className="icon-btn"
          style={{ background: "var(--surface-2)" }}
        >
          +
        </button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm" style={{ color: "var(--text)" }}>
        {label}
      </span>
      <button
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        aria-label={label}
        className="relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200"
        style={{ background: value ? "var(--accent)" : "var(--surface-2)" }}
      >
        <span
          className="absolute top-1 h-5 w-5 rounded-full transition-all duration-200"
          style={{ background: "var(--on-accent)", insetInlineStart: value ? "1.5rem" : "0.25rem" }}
        />
      </button>
    </div>
  );
}
