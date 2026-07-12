import { useAuth } from "../store/useAuth";
import { useStore } from "../store/useStore";
import { Mail, Calendar, Shield, LogOut, User, Flower2 } from "lucide-react";

export default function Profile() {
  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const signOut = useAuth((s) => s.signOut);
  const tasks = useStore((s) => s.tasks);
  const habits = useStore((s) => s.habits);
  const notes = useStore((s) => s.notes);
  const sessions = useStore((s) => s.sessions);

  const completedTasks = tasks.filter((t) => t.done).length;
  const totalFocusMin = sessions.filter((s) => s.mode === "focus").reduce((sum, s) => sum + s.minutes, 0);
  const totalSessions = sessions.filter((s) => s.mode === "focus").length;

  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long" }) : "Unknown";

  return (
    <div>
      <div className="mb-6">
        <h1 className="heading text-2xl" style={{ color: "var(--text)" }}>Profile</h1>
        <p className="muted mt-0.5 text-sm">You, beautifully.</p>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Profile card */}
        <div className="card overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div
                className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl text-3xl font-bold"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))", color: "var(--on-accent)" }}
              >
                {user?.email?.charAt(0).toUpperCase() || <Flower2 size={32} />}
              </div>
              <div className="text-center sm:text-left">
                <h2 className="heading text-2xl" style={{ color: "var(--text)" }}>
                  {profile?.display_name || user?.email?.split("@")[0] || "Local User"}
                </h2>
                <div className="mt-1 flex items-center justify-center gap-2 sm:justify-start">
                  <Mail size={14} style={{ color: "var(--text-muted)" }} />
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>{user?.email || "No email"}</span>
                </div>
                <div className="mt-1 flex items-center justify-center gap-2 sm:justify-start">
                  <Calendar size={14} style={{ color: "var(--text-muted)" }} />
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>Member since {memberSince}</span>
                </div>
              </div>
              <div className="sm:ml-auto">
                <div
                  className="rounded-2xl px-4 py-2 text-center"
                  style={{ background: "var(--surface-2)" }}
                >
                  <p className="heading text-lg" style={{ color: "var(--accent)" }}>
                    {totalSessions}
                  </p>
                  <p className="muted text-[10px]">Sessions</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card flex flex-col items-center p-5 text-center">
            <p className="heading text-3xl" style={{ color: "var(--accent)" }}>{completedTasks}</p>
            <p className="muted text-xs font-semibold uppercase tracking-wide">Tasks Done</p>
            <p className="muted text-[10px]">out of {tasks.length}</p>
          </div>
          <div className="card flex flex-col items-center p-5 text-center">
            <p className="heading text-3xl" style={{ color: "var(--accent)" }}>{habits.length}</p>
            <p className="muted text-xs font-semibold uppercase tracking-wide">Habits</p>
            <p className="muted text-[10px]">tracking</p>
          </div>
          <div className="card flex flex-col items-center p-5 text-center">
            <p className="heading text-3xl" style={{ color: "var(--accent)" }}>{Math.round(totalFocusMin / 60)}h</p>
            <p className="muted text-xs font-semibold uppercase tracking-wide">Focus Time</p>
            <p className="muted text-[10px]">{totalFocusMin % 60}m total</p>
          </div>
        </div>

        {/* Notes count */}
        <div className="card p-5">
          <h2 className="muted mb-3 text-xs font-semibold uppercase tracking-wide">Activity Summary</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-lg font-bold tabular-nums" style={{ color: "var(--text)" }}>{tasks.length}</p>
              <p className="muted text-[10px]">Total tasks</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums" style={{ color: "var(--text)" }}>{notes.length}</p>
              <p className="muted text-[10px]">Notes written</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums" style={{ color: "var(--text)" }}>{habits.length}</p>
              <p className="muted text-[10px]">Habits created</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums" style={{ color: "var(--text)" }}>{totalSessions}</p>
              <p className="muted text-[10px]">Focus sessions</p>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <Shield size={20} style={{ color: "var(--accent)" }} />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Cloud Sync</p>
              <p className="muted text-xs">{user ? "Your data is synced across devices." : "Running in local-only mode."}</p>
            </div>
          </div>
          <button onClick={signOut} className="btn-soft mt-4 flex w-full items-center justify-center gap-2">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
