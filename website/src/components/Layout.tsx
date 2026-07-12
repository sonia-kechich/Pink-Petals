import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard, CheckSquare, Calendar, Clock, Settings, User,
  Flower2, Menu, X, LogOut, Notebook, Heart,
} from "lucide-react";
import { useAuth } from "../store/useAuth";
import { useStore } from "../store/useStore";

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const signOut = useAuth((s) => s.signOut);
  const user = useAuth((s) => s.user);
  const s = useStore((s) => s.settings);

  const NAV_ITEMS = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard, show: s.showDashboard },
    { path: "/tasks", label: "Tasks", icon: CheckSquare, show: s.showTasks },
    { path: "/habits", label: "Habits", icon: Heart, show: s.showHabits },
    { path: "/calendar", label: "Calendar", icon: Calendar, show: s.showCalendar },
    { path: "/notes", label: "Notes", icon: Notebook, show: s.showNotes },
    { path: "/timer", label: "Timer", icon: Clock, show: s.showTimer },
    { path: "/settings", label: "Settings", icon: Settings, show: true },
    { path: "/profile", label: "Profile", icon: User, show: true },
  ].filter((i) => i.show);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "rgba(36, 26, 34, 0.95)", borderColor: "var(--border)", backdropFilter: "blur(20px)" }}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b px-5" style={{ borderColor: "var(--border)" }}>
          <span
            className="grid h-10 w-10 place-items-center rounded-2xl"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
          >
            <Flower2 size={22} color="var(--on-accent)" />
          </span>
          <div>
            <h1 className="heading text-lg" style={{ color: "var(--text)" }}>Pink Petals</h1>
            <p className="muted text-[10px] tracking-wide">A calm place to bloom.</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          {NAV_ITEMS.map(({ path, label, icon: Icon, show }) => {
            const active = path === "/" ? pathname === "/" : pathname.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => {
                  navigate(path);
                  setSidebarOpen(false);
                }}
                className="mb-1 flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all"
                style={{
                  background: active ? "var(--accent)" : "transparent",
                  color: active ? "var(--on-accent)" : "var(--text-muted)",
                }}
              >
                <Icon size={18} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t p-3" style={{ borderColor: "var(--border)" }}>
          <div className="mb-2 flex items-center gap-2 px-3 py-1">
            <div
              className="grid h-8 w-8 place-items-center rounded-full text-sm font-bold"
              style={{ background: "var(--surface-2)", color: "var(--accent)" }}
            >
              {user?.email?.charAt(0).toUpperCase() || "?"}
            </div>
            <span className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
              {user?.email || "Local"}
            </span>
          </div>
          <button
            onClick={signOut}
            className="btn-soft flex w-full items-center justify-center gap-2 text-xs"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header
          className="flex h-16 items-center gap-4 border-b px-4 lg:px-8"
          style={{ background: "rgba(36, 26, 34, 0.6)", borderColor: "var(--border)", backdropFilter: "blur(12px)" }}
        >
          <button onClick={() => setSidebarOpen(true)} className="icon-btn lg:hidden" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <span className="hidden sm:inline">Pink Petals</span>
            <span className="h-1 w-1 rounded-full" style={{ background: "var(--accent)" }} />
            <span>Web</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
            <div key={pathname} className="animate-fade-up">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
