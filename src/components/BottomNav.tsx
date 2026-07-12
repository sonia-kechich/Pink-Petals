import { NavLink } from "react-router-dom";
import { Sun, ListChecks, CalendarCheck, CalendarDays, NotebookPen, Timer, User } from "lucide-react";
import { useStore } from "../store/useStore";

export function BottomNav() {
  const s = useStore((s) => s.settings);
  const items = [
    { to: "/", label: "Today", icon: Sun, show: s.showDashboard },
    { to: "/tasks", label: "Tasks", icon: ListChecks, show: s.showTasks },
    { to: "/habits", label: "Habits", icon: CalendarCheck, show: s.showHabits },
    { to: "/calendar", label: "Calendar", icon: CalendarDays, show: s.showCalendar },
    { to: "/notes", label: "Notes", icon: NotebookPen, show: s.showNotes },
    { to: "/timer", label: "Timer", icon: Timer, show: s.showTimer },
    { to: "/profile", label: "Profile", icon: User, show: true },
  ].filter((i) => i.show);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.4rem)] pt-2 backdrop-blur-xl"
      style={{ background: "var(--surface)", borderColor: "var(--glass-border)" }}>
      <div className="mx-auto flex max-w-md items-center justify-around">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"} aria-label={label}
            className="flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 transition-colors">
            {({ isActive }) => (
              <span className="flex flex-col items-center gap-1" style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }}>
                <Icon size={21} strokeWidth={isActive ? 2.4 : 1.9} />
                <span className="text-[11px] font-semibold">{t(labelKey)}</span>
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
