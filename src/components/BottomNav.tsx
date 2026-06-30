import { NavLink } from "react-router-dom";
import { Sun, ListChecks, CalendarCheck, NotebookPen, Timer } from "lucide-react";
import { useT, type TranslationKey } from "../lib/i18n";

const ITEMS: { to: string; labelKey: TranslationKey; icon: typeof Sun }[] = [
  { to: "/", labelKey: "nav.today", icon: Sun },
  { to: "/tasks", labelKey: "nav.tasks", icon: ListChecks },
  { to: "/habits", labelKey: "nav.habits", icon: CalendarCheck },
  { to: "/notes", labelKey: "nav.notes", icon: NotebookPen },
  { to: "/timer", labelKey: "nav.timer", icon: Timer },
];

export function BottomNav() {
  const t = useT();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.4rem)] pt-2 backdrop-blur-xl md:hidden"
      style={{ background: "var(--surface)", borderColor: "var(--glass-border)" }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {ITEMS.map(({ to, labelKey, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            aria-label={t(labelKey)}
            className="flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 transition-colors"
          >
            {({ isActive }) => (
              <span
                className="flex flex-col items-center gap-1"
                style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }}
              >
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
