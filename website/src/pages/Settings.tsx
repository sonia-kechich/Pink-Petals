import { useState } from "react";
import { Timer, Shield, Trash2 } from "lucide-react";
import { useStore } from "../store/useStore";

export default function Settings() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetAll = useStore((s) => s.resetAll);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div>
      <div className="mb-6">
        <h1 className="heading text-2xl" style={{ color: "var(--text)" }}>Settings</h1>
        <p className="muted mt-0.5 text-sm">Make it yours.</p>
      </div>

      <div className="mx-auto max-w-2xl space-y-8">
        {/* Profile */}
        <section>
          <h2 className="muted mb-3 text-xs font-semibold uppercase tracking-wide">Profile</h2>
          <div className="card p-5">
            <p className="muted mb-1.5 text-xs font-semibold uppercase tracking-wide">Your name</p>
            <input className="input" placeholder="What should we call you?" value={settings.userName}
              onChange={(e) => updateSettings({ userName: e.target.value })} />
          </div>
        </section>

        {/* Visible Pages */}
        <section>
          <h2 className="muted mb-3 text-xs font-semibold uppercase tracking-wide">Visible Pages</h2>
          <div className="card divide-y p-5" style={{ borderColor: "var(--border)" }}>
            <div className="pb-4">
              <Toggle label="Dashboard" value={settings.showDashboard} onChange={(v) => updateSettings({ showDashboard: v })} />
            </div>
            <div className="py-4">
              <Toggle label="Tasks" value={settings.showTasks} onChange={(v) => updateSettings({ showTasks: v })} />
            </div>
            <div className="py-4">
              <Toggle label="Habits" value={settings.showHabits} onChange={(v) => updateSettings({ showHabits: v })} />
            </div>
            <div className="py-4">
              <Toggle label="Notes" value={settings.showNotes} onChange={(v) => updateSettings({ showNotes: v })} />
            </div>
            <div className="py-4">
              <Toggle label="Calendar" value={settings.showCalendar} onChange={(v) => updateSettings({ showCalendar: v })} />
            </div>
            <div className="py-4">
              <Toggle label="Timer" value={settings.showTimer} onChange={(v) => updateSettings({ showTimer: v })} />
            </div>
          </div>
        </section>

        {/* Timer */}
        <section>
          <h2 className="muted mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"><Timer size={14} /> Timer</h2>
          <div className="card divide-y p-5" style={{ borderColor: "var(--border)" }}>
            <div className="pb-4">
              <Stepper label="Focus length" value={settings.pomodoroFocus} suffix="min" min={5} max={90} step={5}
                onChange={(v) => updateSettings({ pomodoroFocus: v })} />
            </div>
            <div className="py-4">
              <Stepper label="Break length" value={settings.pomodoroBreak} suffix="min" min={1} max={30} step={1}
                onChange={(v) => updateSettings({ pomodoroBreak: v })} />
            </div>
            <div className="py-4">
              <Toggle label="Chime on completion" value={settings.soundOnComplete}
                onChange={(v) => updateSettings({ soundOnComplete: v })} />
            </div>
            <div className="pt-4">
              <Toggle label="Notify when focus ends" value={settings.notifyOnComplete}
                onChange={(v) => updateSettings({ notifyOnComplete: v })} />
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section>
          <h2 className="muted mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"><Shield size={14} /> Privacy</h2>
          <div className="card p-5">
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              All data is stored locally on your device. Cloud sync is optional and encrypted.
            </p>
          </div>
        </section>

        {/* Data */}
        <section>
          <h2 className="muted mb-3 text-xs font-semibold uppercase tracking-wide">Data</h2>
          {confirmReset ? (
            <div className="card flex flex-col gap-3 p-5">
              <p className="text-sm" style={{ color: "var(--text)" }}>Erase all tasks, habits, and notes? This can't be undone.</p>
              <div className="flex gap-2">
                <button onClick={() => { resetAll(); setConfirmReset(false); }} className="btn flex-1" style={{ background: "#b08a86", color: "#fff" }}>
                  <Trash2 size={15} /> Erase everything
                </button>
                <button onClick={() => setConfirmReset(false)} className="btn-soft flex-1">Keep my data</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmReset(true)} className="btn-soft flex w-full items-center justify-center gap-2">
              <Trash2 size={15} /> Reset all data
            </button>
          )}
        </section>

        <p className="muted py-4 text-center text-xs">Pink Petals · made to feel calm</p>
      </div>
    </div>
  );
}

function Stepper({ label, value, suffix, min, max, step, onChange }: { label: string; value: number; suffix: string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: "var(--text)" }}>{label}</span>
      <div className="flex items-center gap-3">
        <button onClick={() => onChange(Math.max(min, value - step))} className="icon-btn" style={{ background: "var(--surface-2)" }}>–</button>
        <span className="w-16 text-center text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{value} {suffix}</span>
        <button onClick={() => onChange(Math.min(max, value + step))} className="icon-btn" style={{ background: "var(--surface-2)" }}>+</button>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm" style={{ color: "var(--text)" }}>{label}</span>
      <button onClick={() => onChange(!value)} role="switch" aria-checked={value} aria-label={label}
        className="relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200"
        style={{ background: value ? "var(--accent)" : "var(--surface-2)" }}>
        <span className="absolute top-1 h-5 w-5 rounded-full transition-all duration-200" style={{ background: "var(--on-accent)", left: value ? "1.5rem" : "0.25rem" }} />
      </button>
    </div>
  );
}
