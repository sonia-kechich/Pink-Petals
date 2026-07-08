import { NavLink } from "react-router-dom";
import { Sun, ListChecks, CalendarCheck, CalendarDays, NotebookPen, Timer, Settings, Flower2 } from "lucide-react";
import { useStore } from "../store/useStore";

const BASE_ITEMS = [
  { to: "/", label: "Today", icon: Sun },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/habits", label: "Habits", icon: CalendarCheck },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/notes", label: "Notes", icon: NotebookPen },
  { to: "/timer", label: "Timer", icon: Timer },
];

export function Sidebar() {
  const showCalendar = useStore((s) => s.settings.showCalendar);
  const ITEMS = BASE_ITEMS.filter((item) => item.to !== "/calendar" || showCalendar);
  return (
    <aside className="fixed left-0 top-0 hidden h-full w-[240px] flex-col border-r backdrop-blur-xl lg:flex" style={{ background: "var(--surface)", borderColor: "var(--glass-border)" }}>
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}>
          <Flower2 size={20} style={{ color: "var(--on-accent)" }} />
        </span>
        <span className="heading text-lg" style={{ color: "var(--accent)" }}>
          Pink Petals
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors"
            style={({ isActive }) => ({
              background: isActive ? "var(--surface-2)" : "transparent",
              color: isActive ? "var(--accent)" : "var(--text-muted)",
            })}
          >
            <Icon size={18} strokeWidth={2.2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-5">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors"
          style={({ isActive }) => ({
            background: isActive ? "var(--surface-2)" : "transparent",
            color: isActive ? "var(--accent)" : "var(--text-muted)",
          })}
        >
          <Settings size={18} />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
