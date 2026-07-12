import { useMemo } from "react";

import { format } from "date-fns";
import { ListChecks, Flame, Clock, TrendingUp, CalendarDays, Brain, Notebook, Award } from "lucide-react";
import { useStore } from "../store/useStore";
import { greeting, quoteOfDay } from "../lib/content";
import { todayKey, toKey, currentStreak, longestStreak } from "../lib/date";

export default function Dashboard() {
  const tasks = useStore((s) => s.tasks);
  const habits = useStore((s) => s.habits);
  const notes = useStore((s) => s.notes);
  const sessions = useStore((s) => s.sessions);

  const key = todayKey();
  const hour = new Date().getHours();
  const now = new Date();

  const activeTasks = useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => t.done), [tasks]);
  const habitsDone = habits.filter((h) => h.log[key]).length;
  const focusMinutesToday = sessions
    .filter((s) => s.mode === "focus" && toKey(new Date(s.startedAt)) === key)
    .reduce((sum, s) => sum + s.minutes, 0);

  const totalFocus = sessions.filter((s) => s.mode === "focus").reduce((sum, s) => sum + s.minutes, 0);
  const totalSessions = sessions.filter((s) => s.mode === "focus").length;

  const weeklyData = useMemo(() => {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const k = toKey(d);
      const focusMin = sessions
        .filter((s) => s.mode === "focus" && toKey(new Date(s.startedAt)) === k)
        .reduce((sum, s) => sum + s.minutes, 0);
      return { day: format(d, "EEE"), focusMin, isToday: k === key };
    });
  }, [sessions, key]);

  const maxFocus = Math.max(...weeklyData.map((d) => d.focusMin), 1);

  const currentHabitStreak = habits.length > 0 ? Math.max(...habits.map((h) => currentStreak(h.log))) : 0;
  const bestHabitStreak = habits.length > 0 ? Math.max(...habits.map((h) => longestStreak(h.log))) : 0;

  const totalFocusHours = Math.floor(totalFocus / 60);
  const totalFocusRemainder = totalFocus % 60;
  const avgDailyFocus = totalSessions > 0 ? Math.round(totalFocus / 7) : 0;

  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="heading text-3xl" style={{ color: "var(--text)" }}>
          {greeting(hour)}.
        </h1>
        <p className="muted mt-1 text-sm">{quoteOfDay(key)}</p>
        <div className="mt-3 flex items-center gap-2">
          <CalendarDays size={16} style={{ color: "var(--accent)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
            {format(now, "EEEE, MMMM d, yyyy")}
          </span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card flex items-center gap-4 p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: "var(--surface-2)", color: "var(--accent)" }}>
            <ListChecks size={22} />
          </span>
          <div>
            <p className="heading text-xl" style={{ color: "var(--text)" }}>{activeTasks.length}</p>
            <p className="muted text-[10px] font-semibold uppercase tracking-wide">Active Tasks</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: "var(--surface-2)", color: "var(--accent)" }}>
            <Flame size={22} />
          </span>
          <div>
            <p className="heading text-xl" style={{ color: "var(--text)" }}>{currentHabitStreak}d</p>
            <p className="muted text-[10px] font-semibold uppercase tracking-wide">Habit Streak</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: "var(--surface-2)", color: "var(--accent)" }}>
            <Clock size={22} />
          </span>
          <div>
            <p className="heading text-xl" style={{ color: "var(--text)" }}>{focusMinutesToday}m</p>
            <p className="muted text-[10px] font-semibold uppercase tracking-wide">Focus Today</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: "var(--surface-2)", color: "var(--accent)" }}>
            <TrendingUp size={22} />
          </span>
          <div>
            <p className="heading text-xl" style={{ color: "var(--text)" }}>{totalFocusHours}h {totalFocusRemainder}m</p>
            <p className="muted text-[10px] font-semibold uppercase tracking-wide">Total Focus Time</p>
          </div>
        </div>
      </div>

      {/* Weekly Overview */}
      <div className="card p-5">
        <h2 className="muted mb-4 text-xs font-semibold uppercase tracking-wide">Weekly Overview</h2>
        <div className="flex items-end justify-between gap-2" style={{ height: 120 }}>
          {weeklyData.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-2 h-full">
              <span className="text-[10px] tabular-nums font-medium" style={{ color: d.isToday ? "var(--accent)" : "var(--text-muted)" }}>
                {d.focusMin > 0 ? `${d.focusMin}m` : ""}
              </span>
              <div
                className="w-full rounded-full transition-all"
                style={{
                  height: Math.max(4, (d.focusMin / maxFocus) * 80),
                  background: d.isToday ? "var(--accent)" : "var(--surface-2)",
                  minHeight: 4,
                }}
              />
              <span
                className="text-[10px] font-semibold"
                style={{ color: d.isToday ? "var(--accent)" : "var(--text-muted)" }}
              >
                {d.day}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Statistics */}
      <div>
        <h2 className="muted mb-4 text-xs font-semibold uppercase tracking-wide">Detailed Statistics</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Tasks */}
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <ListChecks size={16} style={{ color: "var(--accent)" }} />
              <h3 className="heading text-sm">Tasks</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="muted text-xs">Total Tasks</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{tasks.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="muted text-xs">Completed Tasks</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{completedTasks.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="muted text-xs">Pending Tasks</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{activeTasks.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="muted text-xs">Completion Rate</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--accent)" }}>{completionRate}%</span>
              </div>
            </div>
          </div>

          {/* Habits */}
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Flame size={16} style={{ color: "var(--accent)" }} />
              <h3 className="heading text-sm">Habits</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="muted text-xs">Total Habits</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{habits.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="muted text-xs">Current Streak</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{currentHabitStreak}d</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="muted text-xs">Longest Streak</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{bestHabitStreak}d</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="muted text-xs">Completed Today</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--accent)" }}>{habitsDone}/{habits.length}</span>
              </div>
            </div>
          </div>

          {/* Focus */}
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Brain size={16} style={{ color: "var(--accent)" }} />
              <h3 className="heading text-sm">Focus</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="muted text-xs">Total Sessions</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{totalSessions}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="muted text-xs">Total Focus Time</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{totalFocusHours}h {totalFocusRemainder}m</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="muted text-xs">Avg Daily Focus</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{avgDailyFocus}m</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Notebook size={16} style={{ color: "var(--accent)" }} />
              <h3 className="heading text-sm">Notes</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="muted text-xs">Total Notes</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{notes.length}</span>
              </div>
            </div>
          </div>

          {/* Productivity Score */}
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Award size={16} style={{ color: "var(--accent)" }} />
              <h3 className="heading text-sm">Productivity Score</h3>
            </div>
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="relative h-20 w-20">
                <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="var(--surface-2)" strokeWidth="8" />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="8"
                    strokeDasharray={`${(completionRate / 100) * 213.6} 213.6`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 grid place-items-center heading text-lg" style={{ color: "var(--text)" }}>
                  {completionRate}%
                </span>
              </div>
              <p className="muted text-xs text-center">Completed vs Total Tasks</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
