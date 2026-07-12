import { useMemo } from "react";

import { format } from "date-fns";
import {
  ListTodo,
  Flame,
  Timer,
  StickyNote,
  Clock,
  Zap,
  Award,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { Card } from "../components/Card";
import { greeting, quoteOfDay } from "../lib/content";
import { todayKey, toKey, currentStreak, longestStreak } from "../lib/date";

export default function Today() {
  const tasks = useStore((s) => s.tasks);
  const habits = useStore((s) => s.habits);
  const notes = useStore((s) => s.notes);
  const sessions = useStore((s) => s.sessions);
  const name = useStore((s) => s.settings.userName);

  const key = todayKey();
  const hour = new Date().getHours();

  const activeTasks = useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => t.done), [tasks]);
  const pendingTasks = activeTasks;

  const habitsDoneToday = habits.filter((h) => h.log[key]).length;
  const focusSessionsToday = useMemo(
    () =>
      sessions.filter(
        (s) => s.mode === "focus" && toKey(new Date(s.startedAt)) === key
      ),
    [sessions, key]
  );
  const focusMinutesToday = focusSessionsToday.reduce(
    (sum, s) => sum + s.minutes,
    0
  );

  const totalFocusSessions = useMemo(
    () => sessions.filter((s) => s.mode === "focus"),
    [sessions]
  );
  const totalFocusMinutes = totalFocusSessions.reduce(
    (sum, s) => sum + s.minutes,
    0
  );

  const combinedHabitLog = useMemo(() => {
    const merged: Record<string, boolean> = {};
    for (const h of habits) {
      for (const [day, done] of Object.entries(h.log)) {
        if (done) merged[day] = true;
      }
    }
    return merged;
  }, [habits]);

  const weekDays = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, []);

  const dayMinutes = useMemo(() => {
    return weekDays.map((d) => {
      const k = toKey(d);
      return sessions
        .filter(
          (s) => s.mode === "focus" && toKey(new Date(s.startedAt)) === k
        )
        .reduce((sum, s) => sum + s.minutes, 0);
    });
  }, [sessions, weekDays]);

  const maxDayMinutes = Math.max(...dayMinutes, 1);

  const completionRate =
    tasks.length > 0
      ? Math.round((completedTasks.length / tasks.length) * 100)
      : 0;

  const avgDailyFocus =
    totalFocusMinutes > 0
      ? Math.round(
          totalFocusMinutes /
            Math.max(
              new Set(sessions.map((s) => toKey(new Date(s.startedAt)))).size,
              1
            )
        )
      : 0;

  return (
    <div>
      {/* Greeting */}
      <header className="mb-5 mt-1">
        <h1
          className="heading text-[1.7rem] leading-tight"
          style={{ color: "var(--text)" }}
        >
          {greeting(hour)}
          {name ? `, ${name}` : ""}.
        </h1>
        <p className="muted mt-1 text-sm">{quoteOfDay(key)}</p>
        <p
          className="muted mt-0.5 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          {format(new Date(), "EEEE, MMMM d")}
        </p>
      </header>

      {/* Stats 2x2 Grid */}
      <div className="mb-6 grid grid-cols-2 gap-2">
        <Card className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl"
            style={{ background: "var(--surface-2)" }}
          >
            <ListTodo size={18} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <p className="heading text-lg" style={{ color: "var(--text)" }}>
              {activeTasks.length}
            </p>
            <p className="muted text-xs">Active Tasks</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl"
            style={{ background: "var(--surface-2)" }}
          >
            <Flame size={18} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <p className="heading text-lg" style={{ color: "var(--text)" }}>
              {currentStreak(combinedHabitLog)}
            </p>
            <p className="muted text-xs">Habit Streak</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl"
            style={{ background: "var(--surface-2)" }}
          >
            <Zap size={18} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <p className="heading text-lg" style={{ color: "var(--text)" }}>
              {focusMinutesToday}m
            </p>
            <p className="muted text-xs">Focus Today</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl"
            style={{ background: "var(--surface-2)" }}
          >
            <Clock size={18} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <p className="heading text-lg" style={{ color: "var(--text)" }}>
              {totalFocusMinutes}m
            </p>
            <p className="muted text-xs">Total Focus Time</p>
          </div>
        </Card>
      </div>

      {/* Weekly Overview */}
      <section className="mb-6">
        <h2 className="muted mb-3 px-1 text-xs font-semibold uppercase tracking-wide">
          Weekly Overview
        </h2>
        <Card>
          <div className="flex items-end justify-between gap-1.5 py-2">
            {weekDays.map((d, i) => {
              const minutes = dayMinutes[i];
              const h = Math.max(Math.round((minutes / maxDayMinutes) * 80), 4);
              const isToday = toKey(d) === key;
              return (
                <div
                  key={i}
                  className="flex flex-1 flex-col items-center gap-1.5"
                >
                  <span
                    className="text-[10px] font-semibold"
                    style={{
                      color: isToday ? "var(--accent)" : "var(--text-muted)",
                    }}
                  >
                    {format(d, "EEE")}
                  </span>
                  <div
                    className="w-full rounded-full transition-all"
                    style={{
                      height: h,
                      background: isToday ? "var(--accent)" : "var(--surface-2)",
                      minHeight: 4,
                    }}
                  />
                  <span
                    className="text-[10px] tabular-nums"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {minutes}m
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      {/* Detailed Statistics */}
      <section className="mb-6">
        <h2 className="muted mb-3 px-1 text-xs font-semibold uppercase tracking-wide">
          Detailed Statistics
        </h2>

        {/* Tasks */}
        <Card className="mb-3">
          <div className="flex items-center gap-2 mb-3">
            <ListTodo size={16} style={{ color: "var(--accent)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Tasks</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><span className="muted text-xs">Total Tasks</span><span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{tasks.length}</span></div>
            <div className="flex items-center justify-between"><span className="muted text-xs">Completed</span><span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{completedTasks.length}</span></div>
            <div className="flex items-center justify-between"><span className="muted text-xs">Pending</span><span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{pendingTasks.length}</span></div>
            <div className="flex items-center justify-between"><span className="muted text-xs">Completion Rate</span><span className="text-sm font-semibold tabular-nums" style={{ color: "var(--accent)" }}>{completionRate}%</span></div>
          </div>
        </Card>

        {/* Habits */}
        <Card className="mb-3">
          <div className="flex items-center gap-2 mb-3">
            <Flame size={16} style={{ color: "var(--accent)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Habits</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><span className="muted text-xs">Total Habits</span><span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{habits.length}</span></div>
            <div className="flex items-center justify-between"><span className="muted text-xs">Current Streak</span><span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{currentStreak(combinedHabitLog)} days</span></div>
            <div className="flex items-center justify-between"><span className="muted text-xs">Longest Streak</span><span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{longestStreak(combinedHabitLog)} days</span></div>
            <div className="flex items-center justify-between"><span className="muted text-xs">Done Today</span><span className="text-sm font-semibold tabular-nums" style={{ color: "var(--accent)" }}>{habitsDoneToday}</span></div>
          </div>
        </Card>

        {/* Focus */}
        <Card className="mb-3">
          <div className="flex items-center gap-2 mb-3">
            <Timer size={16} style={{ color: "var(--accent)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Focus</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><span className="muted text-xs">Total Sessions</span><span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{totalFocusSessions.length}</span></div>
            <div className="flex items-center justify-between"><span className="muted text-xs">Total Time</span><span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{totalFocusMinutes}m</span></div>
            <div className="flex items-center justify-between"><span className="muted text-xs">Avg Daily</span><span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{avgDailyFocus}m</span></div>
          </div>
        </Card>

        {/* Notes */}
        <Card className="mb-3">
          <div className="flex items-center gap-2 mb-3">
            <StickyNote size={16} style={{ color: "var(--accent)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Notes</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><span className="muted text-xs">Total Notes</span><span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{notes.length}</span></div>
          </div>
        </Card>

        {/* Productivity Score */}
        <Card>
          <div className="flex items-center gap-2">
            <Award size={16} style={{ color: "var(--accent)" }} />
            <span className="text-sm font-semibold flex-1" style={{ color: "var(--text)" }}>Productivity Score</span>
            <span className="heading text-lg" style={{ color: "var(--accent)" }}>{completionRate}%</span>
          </div>
        </Card>
      </section>
    </div>
  );
}


