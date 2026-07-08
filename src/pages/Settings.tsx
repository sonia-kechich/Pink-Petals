import { useState } from "react";
import { Moon, Monitor, LogOut, User, Timer, Shield, Trash2 } from "lucide-react";
import { useStore } from "../store/useStore";
import { useAuth } from "../store/useAuth";
import { Card, PageTitle } from "../components/Card";
import type { ThemeMode, AccentColor } from "../types";

const THEMES: { id: ThemeMode; label: string; icon: typeof Moon }[] = [
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

const ACCENTS: { id: AccentColor; label: string; color: string }[] = [
  { id: "pink", label: "Pink", color: "#cd7ba2" },
  { id: "blue", label: "Blue", color: "#6da9d4" },
  { id: "green", label: "Green", color: "#7bb88a" },
  { id: "gray", label: "Gray", color: "#9a8a9a" },
];

export default function Settings() {
  const settings = useStore((s) => s.settings);
  const sessions = useStore((s) => s.sessions);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetAll = useStore((s) => s.resetAll);
  const [confirmReset, setConfirmReset] = useState(false);

  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);

  const totalSessions = sessions.filter((s) => s.mode === "focus").length;

  return (
    <div>
      <PageTitle title="Settings" subtitle="Make it yours." />

      <div className="flex flex-col gap-6">
        {/* Account */}
        <section>
          <SectionLabel>& Account</SectionLabel>
          <Card className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--surface-2)" }}>
                <User size={18} style={{ color: "var(--text)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  Your account
                </p>
                <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
                  {user?.email ?? "No account"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--accent)" }}>
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
              Cloud sync enabled
            </div>
            <div className="flex items-center justify-between" style={{ color: "var(--text)" }}>
              <span className="heading text-2xl">{totalSessions}</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>sessions completed</span>
            </div>
            <button
              onClick={signOut}
              className="btn-soft flex items-center justify-center gap-2 text-sm"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </Card>
        </section>

        {/* Profile > Appearance */}
        <section>
          <SectionLabel>& Profile</SectionLabel>
          <div className="flex flex-col gap-3">
            <Label>APPEARANCE</Label>
            <Card className="flex flex-col gap-4">
              <div>
                <Label>Your name</Label>
                <input
                  className="input"
                  placeholder="What should we call you?"
                  value={settings.userName}
                  onChange={(e) => updateSettings({ userName: e.target.value })}
                />
              </div>
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
              <div>
                <Label>ACCENT COLOR</Label>
                <div className="flex gap-3">
                  {ACCENTS.map(({ id, label, color }) => {
                    const active = settings.accentColor === id;
                    return (
                      <button
                        key={id}
                        onClick={() => updateSettings({ accentColor: id })}
                        className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl py-3 text-sm font-semibold transition-colors"
                        style={{
                          background: active ? color : "var(--surface)",
                          color: active ? "#fff" : "var(--text-muted)",
                          border: active ? "2px solid transparent" : "1px solid var(--border)",
                        }}
                      >
                        <span
                          className="h-5 w-5 rounded-full"
                          style={{ background: color }}
                        />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Layout */}
        <section>
          <SectionLabel>& Layout</SectionLabel>
          <Card>
            <Toggle
              label="Show Calendar page"
              value={settings.showCalendar}
              onChange={(v) => updateSettings({ showCalendar: v })}
            />
          </Card>
        </section>

        {/* Timer */}
        <section>
          <SectionLabel>
            <Timer size={14} /> Timer
          </SectionLabel>
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
              label="Chime on completion"
              value={settings.soundOnComplete}
              onChange={(v) => updateSettings({ soundOnComplete: v })}
            />
            <Toggle
              label="Notify when focus ends"
              value={settings.notifyOnComplete}
              onChange={(v) => updateSettings({ notifyOnComplete: v })}
            />
          </Card>
        </section>

        {/* Privacy */}
        <section>
          <SectionLabel>
            <Shield size={14} /> Privacy
          </SectionLabel>
          <Card>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              All data is stored locally on your device. Cloud sync is optional and encrypted.
            </p>
          </Card>
        </section>

        {/* Data */}
        <section>
          <Label>DATA</Label>
          {confirmReset ? (
            <Card className="flex flex-col gap-3">
              <p className="text-sm" style={{ color: "var(--text)" }}>
                Erase all tasks, habits, and notes? This can't be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    resetAll();
                    setConfirmReset(false);
                  }}
                  className="btn flex-1"
                  style={{ background: "#b08a86", color: "#fff" }}
                >
                  <Trash2 size={15} />
                  Erase everything
                </button>
                <button onClick={() => setConfirmReset(false)} className="btn-soft flex-1">
                  Keep my data
                </button>
              </div>
            </Card>
          ) : (
            <button onClick={() => setConfirmReset(true)} className="btn-soft flex w-full items-center justify-center gap-2">
              <Trash2 size={15} />
              Reset all data
            </button>
          )}
        </section>

        <p className="muted py-2 text-center text-xs">Pink Petals . made to feel calm</p>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="muted mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide">
      {children}
    </h2>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="muted mb-1.5 text-xs font-semibold uppercase tracking-wide">
      {children}
    </p>
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
          style={{ background: "var(--on-accent)", left: value ? "1.5rem" : "0.25rem" }}
        />
      </button>
    </div>
  );
}
