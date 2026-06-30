import { NavLink, Link } from "react-router-dom";
import {
  Sun,
  ListChecks,
  CalendarCheck,
  NotebookPen,
  Timer,
  Settings,
  Flower2,
} from "lucide-react";
import { SyncStatus } from "./SyncStatus";
import { useT, type TranslationKey } from "../lib/i18n";

export const NAV_ITEMS = [
  { to: "/", label: "Today", labelKey: "nav.today", icon: Sun, hint: "1" },
  { to: "/tasks", label: "Tasks", labelKey: "nav.tasks", icon: ListChecks, hint: "2" },
  { to: "/habits", label: "Habits", labelKey: "nav.habits", icon: CalendarCheck, hint: "3" },
  { to: "/notes", label: "Notes", labelKey: "nav.notes", icon: NotebookPen, hint: "4" },
  { to: "/timer", label: "Timer", labelKey: "nav.timer", icon: Timer, hint: "5" },
  { to: "/settings", label: "Settings", labelKey: "nav.settings", icon: Settings, hint: "6" },
] as const;

export function Sidebar() {
  return (
    <aside
      className="sticky top-0 z-30 hidden h-screen w-64 shrink-0 flex-col px-4 py-6 backdrop-blur-xl md:flex"
      style={{ background: "var(--surface)", borderInlineEnd: "1px solid var(--glass-border)" }}
    >
      <Link to="/" className="flex items-center gap-2 px-2">
        <span
          className="grid h-9 w-9 place-items-center rounded-2xl"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            color: "var(--on-accent)",
          }}
        >
          <Flower2 size={19} />
        </span>
        <span className="heading text-lg" style={{ color: "var(--accent)" }}>
          Pink Petals
        </span>
      </Link>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.slice(0, 5).map((item) => (
          <SideLink key={item.to} {...item} />
        ))}

        <div className="mt-auto flex flex-col gap-1">
          <SideLink {...NAV_ITEMS[5]} />
          <div className="px-1 pt-3">
            <SyncStatus />
          </div>
        </div>
      </nav>
    </aside>
  );
}

function SideLink({
  to,
  labelKey,
  icon: Icon,
  hint,
}: {
  to: string;
  /** English label (kept for reference; display goes through `labelKey`). */
  label?: string;
  labelKey: TranslationKey;
  icon: typeof Sun;
  hint: string;
}) {
  const t = useT();
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] font-semibold transition-colors"
      style={({ isActive }) => ({
        background: isActive ? "var(--surface-2)" : "transparent",
        color: isActive ? "var(--accent)" : "var(--text-muted)",
      })}
    >
      {({ isActive }) => (
        <>
          <Icon size={19} strokeWidth={isActive ? 2.4 : 1.9} />
          <span className="flex-1">{t(labelKey)}</span>
          <kbd
            className="rounded-md px-1.5 py-0.5 text-[10px] font-bold opacity-0 transition-opacity group-hover:opacity-60"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
          >
            {hint}
          </kbd>
        </>
      )}
    </NavLink>
  );
}
