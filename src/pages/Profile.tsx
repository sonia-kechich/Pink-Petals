import { useAuth } from "../store/useAuth";
import { useStore } from "../store/useStore";
import { Mail, Calendar, Shield, LogOut, Flower2 } from "lucide-react";
import { Card, PageTitle } from "../components/Card";

export default function Profile() {
  const user = useAuth((s) => s.user);
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
      <PageTitle title="Profile" subtitle="You, beautifully." />
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:text-left">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-2xl font-bold" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))", color: "var(--on-accent)" }}>
            {user?.email?.charAt(0).toUpperCase() || <Flower2 size={24} />}
          </div>
          <div>
            <h2 className="heading text-lg" style={{ color: "var(--text)" }}>{user?.email?.split("@")[0] || "Local User"}</h2>
            <p className="muted flex items-center justify-center gap-1.5 text-xs sm:justify-start"><Mail size={12} />{user?.email || "No email"}</p>
            <p className="muted flex items-center justify-center gap-1.5 text-xs sm:justify-start"><Calendar size={12} />Member since {memberSince}</p>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Tasks Done" value={completedTasks.toString()} sub={`of ${tasks.length}`} />
          <StatBox label="Habits" value={habits.length.toString()} sub="tracking" />
          <StatBox label="Focus" value={`${Math.round(totalFocusMin / 60)}h`} sub={`${totalFocusMin % 60}m`} />
        </div>

        <Card className="flex flex-col gap-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div><p className="heading text-lg" style={{ color: "var(--text)" }}>{tasks.length}</p><p className="muted text-[10px]">Total tasks</p></div>
            <div><p className="heading text-lg" style={{ color: "var(--text)" }}>{notes.length}</p><p className="muted text-[10px]">Notes written</p></div>
            <div><p className="heading text-lg" style={{ color: "var(--text)" }}>{habits.length}</p><p className="muted text-[10px]">Habits created</p></div>
            <div><p className="heading text-lg" style={{ color: "var(--text)" }}>{totalSessions}</p><p className="muted text-[10px]">Focus sessions</p></div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Shield size={20} style={{ color: "var(--accent)" }} />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Cloud Sync</p>
              <p className="muted text-xs">{user ? "Your data is synced across devices." : "Running in local-only mode."}</p>
            </div>
          </div>
          <button onClick={signOut} className="btn-soft mt-4 flex w-full items-center justify-center gap-2"><LogOut size={15} /> Sign out</button>
        </Card>
      </div>
    </div>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl p-3 text-center" style={{ background: "var(--surface)" }}>
      <p className="heading text-xl" style={{ color: "var(--text)" }}>{value}</p>
      <p className="muted text-[10px] font-semibold uppercase tracking-wide">{label}</p>
      <p className="muted text-[10px]">{sub}</p>
    </div>
  );
}
