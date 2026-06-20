import { useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useStore } from "../store/useStore";
import { Card, PageTitle } from "../components/Card";
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

  return (
    <div>
      <PageTitle title="Settings" subtitle="Make it yours." />

      <div className="flex flex-col gap-5">
        <section>
          <Label>Your name</Label>
          <input
            className="input"
            placeholder="What should we call you?"
            value={settings.userName}
            onChange={(e) => updateSettings({ userName: e.target.value })}
          />
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
          </Card>
        </section>

        <section>
          <Label>Data</Label>
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
                  Erase everything
                </button>
                <button onClick={() => setConfirmReset(false)} className="btn-soft flex-1">
                  Keep my data
                </button>
              </div>
            </Card>
          ) : (
            <button onClick={() => setConfirmReset(true)} className="btn-soft w-full">
              Reset all data
            </button>
          )}
        </section>

        <p className="muted py-2 text-center text-xs">Pink Petals · made to feel calm</p>
      </div>
    </div>
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
          style={{ background: "var(--on-accent)", left: value ? "1.5rem" : "0.25rem" }}
        />
      </button>
    </div>
  );
}
