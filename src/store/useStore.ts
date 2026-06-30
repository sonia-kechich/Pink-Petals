import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppState,
  Task,
  Habit,
  Note,
  FocusSession,
  Settings,
  TimerState,
  SoundState,
  SyncData,
  RepeatRule,
} from "../types";
import { MAX_FOCUS } from "../types";
import { uid } from "../lib/utils";
import { todayKey, toKey, nextOccurrence } from "../lib/date";
import { reorderTaskList, reorderList } from "../lib/tasks";
import { resolveTimerOnResume, type TimerResolution } from "../lib/timer";
import { SCHEMA_VERSION } from "../lib/schema";

/** Recent focus/break sessions kept raw for display; lifetime totals live in
 *  `focusTotals` so trimming here never loses the long-term stat. */
const MAX_SESSIONS = 200;

export interface NewTaskInput {
  title: string;
  description?: string;
  dueDate?: string;
  repeat?: RepeatRule;
}

export type { SyncData };

interface Actions {
  addTask: (input: NewTaskInput | string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  renameTask: (id: string, title: string) => void;
  updateTask: (
    id: string,
    patch: Partial<Pick<Task, "title" | "description" | "dueDate" | "repeat">>
  ) => void;
  toggleFocus: (id: string) => void;
  clearCompleted: () => void;
  reorderTasks: (orderedIds: string[]) => void;

  addHabit: (name: string) => void;
  toggleHabitDay: (id: string, dateKey: string) => void;
  updateHabit: (id: string, patch: Partial<Pick<Habit, "name" | "description">>) => void;
  deleteHabit: (id: string) => void;
  reorderHabits: (orderedIds: string[]) => void;

  addNote: () => string;
  updateNote: (id: string, patch: Partial<Pick<Note, "title" | "body">>) => void;
  deleteNote: (id: string) => void;
  reorderNotes: (orderedIds: string[]) => void;

  setTimerMode: (mode: "focus" | "break") => void;
  setTimerTask: (taskId: string | undefined) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  completeTimer: () => void;
  /** Resolve a running timer found past its total (reopen/background): record a
   *  genuine session (capped) or discard a clearly-stale one. Returns the call. */
  reconcileTimer: () => TimerResolution;

  updateSettings: (patch: Partial<Settings>) => void;

  exportSyncData: () => SyncData;
  applySyncData: (data: Partial<SyncData>) => void;

  selectSound: (id: string) => void;
  toggleSoundPlaying: () => void;
  stopSound: () => void;
  setSoundVolume: (volume: number) => void;
  toggleFavoriteSound: (id: string) => void;

  resetAll: () => void;
}

const defaultSettings: Settings = {
  theme: "system",
  userName: "",
  pomodoroFocus: 25,
  pomodoroBreak: 5,
  soundOnComplete: true,
  notifyOnComplete: false,
};

const initialTimer: TimerState = {
  mode: "focus",
  taskId: undefined,
  running: false,
  startedAt: null,
  baseElapsed: 0,
  duration: defaultSettings.pomodoroFocus * 60,
};

const initialSound: SoundState = {
  selectedId: null,
  playing: false,
  volume: 0.6,
  favorites: [],
};

const initialState: AppState = {
  tasks: [],
  habits: [],
  notes: [],
  sessions: [],
  settings: defaultSettings,
  timer: initialTimer,
  sound: initialSound,
  deletedIds: {},
  settingsUpdatedAt: 0,
  soundUpdatedAt: 0,
  focusTotals: { ms: 0, sessions: 0 },
};

function elapsedOf(t: TimerState): number {
  const live = t.running && t.startedAt ? (Date.now() - t.startedAt) / 1000 : 0;
  return t.baseElapsed + live;
}

// Items render sorted by `order` (ascending). A new item placed at the TOP gets
// an order just below the current minimum; at the BOTTOM, just above the max.
// A reduce/loop (not `Math.min/max(...spread)`) keeps this stack-safe for very
// large lists; an empty list returns the 0 sentinel, never ±Infinity.
export function topOrder<T extends { order?: number }>(items: T[]): number {
  if (items.length === 0) return 0;
  let min = items[0].order ?? 0;
  for (let i = 1; i < items.length; i++) {
    const order = items[i].order ?? 0;
    if (order < min) min = order;
  }
  return min - 1;
}

export function bottomOrder<T extends { order?: number }>(items: T[]): number {
  if (items.length === 0) return 0;
  let max = items[0].order ?? 0;
  for (let i = 1; i < items.length; i++) {
    const order = items[i].order ?? 0;
    if (order > max) max = order;
  }
  return max + 1;
}

export const useStore = create<AppState & Actions>()(
  persist(
    (set, get) => {
      // Finalize a running timer: record a focus session of `recordedMs`
      // (null/0 = discard, e.g. a stale reopen), bump lifetime focus totals,
      // credit the focused task, and roll to the next mode.
      const finalizeTimer = (recordedMs: number | null) => {
        const { timer, settings } = get();
        const nextMode: "focus" | "break" = timer.mode === "focus" ? "break" : "focus";
        const nextMinutes =
          nextMode === "focus" ? settings.pomodoroFocus : settings.pomodoroBreak;
        set((s) => {
          const rolled: TimerState = {
            ...s.timer,
            mode: nextMode,
            running: false,
            startedAt: null,
            baseElapsed: 0,
            duration: nextMinutes * 60,
          };
          if (recordedMs == null || recordedMs <= 0) return { timer: rolled };
          const isFocus = timer.mode === "focus";
          const focusedTask = isFocus ? s.tasks.find((t) => t.id === timer.taskId) : undefined;
          const session: FocusSession = {
            id: uid(),
            startedAt: Date.now() - recordedMs,
            minutes: Math.max(1, Math.round(recordedMs / 60000)),
            mode: timer.mode,
            taskId: focusedTask?.id,
            taskTitle: focusedTask?.title,
          };
          return {
            timer: rolled,
            sessions: [session, ...s.sessions].slice(0, MAX_SESSIONS),
            // Lifetime focus aggregate (focus mode only) — not truncated by the cap.
            focusTotals: isFocus
              ? { ms: s.focusTotals.ms + recordedMs, sessions: s.focusTotals.sessions + 1 }
              : s.focusTotals,
            tasks: focusedTask
              ? s.tasks.map((t) =>
                  t.id === focusedTask.id
                    ? {
                        ...t,
                        focusSeconds: (t.focusSeconds ?? 0) + Math.round(recordedMs / 1000),
                        updatedAt: Date.now(),
                      }
                    : t
                )
              : s.tasks,
          };
        });
      };

      return {
      ...initialState,

      addTask: (input) =>
        set((s) => {
          const data: NewTaskInput =
            typeof input === "string" ? { title: input } : input;
          const t = data.title.trim();
          if (!t) return {};
          const now = Date.now();
          const task: Task = {
            id: uid(),
            title: t,
            description: data.description?.trim() || undefined,
            done: false,
            focused: false,
            createdAt: now,
            updatedAt: now,
            order: topOrder(s.tasks),
            dueDate: data.dueDate ?? todayKey(),
            repeat:
              data.repeat && data.repeat.freq !== "none"
                ? data.repeat
                : undefined,
            focusSeconds: 0,
          };
          return { tasks: [task, ...s.tasks] };
        }),

      toggleTask: (id) =>
        set((s) => {
          const target = s.tasks.find((t) => t.id === id);
          if (!target) return {};
          const willBeDone = !target.done;

          const now = Date.now();
          const tasks = s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  done: willBeDone,
                  completedAt: willBeDone ? now : undefined,
                  updatedAt: now,
                }
              : t
          );

          if (willBeDone && target.repeat && target.repeat.freq !== "none") {
            const base = target.dueDate ?? todayKey();
            const nextDue = nextOccurrence(base, target.repeat);
            const next: Task = {
              id: uid(),
              title: target.title,
              description: target.description,
              done: false,
              focused: false,
              createdAt: now,
              updatedAt: now,
              order: topOrder(s.tasks),
              dueDate: nextDue,
              repeat: target.repeat,
              seriesId: target.seriesId ?? target.id,
              focusSeconds: 0,
            };
            return { tasks: [next, ...tasks] };
          }

          return { tasks };
        }),

      deleteTask: (id) =>
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== id),
          deletedIds: { ...s.deletedIds, [id]: Date.now() },
        })),

      renameTask: (id, title) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, title: title.trim() || t.title, updatedAt: Date.now() } : t
          ),
        })),

      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            const next = { ...t, ...patch, updatedAt: Date.now() };
            if (patch.title !== undefined) next.title = patch.title.trim() || t.title;
            if (patch.description !== undefined)
              next.description = patch.description.trim() || undefined;
            if (patch.repeat !== undefined)
              next.repeat = patch.repeat.freq === "none" ? undefined : patch.repeat;
            return next;
          }),
        })),

      toggleFocus: (id) =>
        set((s) => {
          const focusedCount = s.tasks.filter((t) => t.focused && !t.done).length;
          return {
            tasks: s.tasks.map((t) => {
              if (t.id !== id) return t;
              if (!t.focused && focusedCount >= MAX_FOCUS) return t;
              return { ...t, focused: !t.focused, updatedAt: Date.now() };
            }),
          };
        }),

      clearCompleted: () =>
        set((s) => {
          const now = Date.now();
          const deletedIds = { ...s.deletedIds };
          for (const t of s.tasks) if (t.done) deletedIds[t.id] = now;
          return { tasks: s.tasks.filter((t) => !t.done), deletedIds };
        }),

      reorderTasks: (orderedIds) =>
        set((s) => ({ tasks: reorderTaskList(s.tasks, orderedIds, Date.now()) })),

      addHabit: (name) =>
        set((s) => {
          const n = name.trim();
          if (!n) return {};
          const now = Date.now();
          const habit: Habit = {
            id: uid(),
            name: n,
            createdAt: now,
            updatedAt: now,
            order: bottomOrder(s.habits), // new habit goes to the end of the list
            log: {},
          };
          return { habits: [...s.habits, habit] };
        }),

      toggleHabitDay: (id, dateKey) =>
        set((s) => ({
          habits: s.habits.map((h) => {
            if (h.id !== id) return h;
            const log = { ...h.log };
            if (log[dateKey]) delete log[dateKey];
            else log[dateKey] = true;
            return { ...h, log, updatedAt: Date.now() };
          }),
        })),

      updateHabit: (id, patch) =>
        set((s) => ({
          habits: s.habits.map((h) => {
            if (h.id !== id) return h;
            const next = { ...h, ...patch, updatedAt: Date.now() };
            if (patch.name !== undefined) next.name = patch.name.trim() || h.name;
            if (patch.description !== undefined)
              next.description = patch.description.trim() || undefined;
            return next;
          }),
        })),

      deleteHabit: (id) =>
        set((s) => ({
          habits: s.habits.filter((h) => h.id !== id),
          deletedIds: { ...s.deletedIds, [id]: Date.now() },
        })),

      reorderHabits: (orderedIds) =>
        set((s) => ({ habits: reorderList(s.habits, orderedIds, Date.now()) })),

      addNote: () => {
        const id = uid();
        const now = Date.now();
        set((s) => ({
          notes: [
            { id, title: "", body: "", createdAt: now, updatedAt: now, order: topOrder(s.notes) },
            ...s.notes,
          ],
        }));
        return id;
      },

      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n
          ),
        })),

      deleteNote: (id) =>
        set((s) => ({
          notes: s.notes.filter((n) => n.id !== id),
          deletedIds: { ...s.deletedIds, [id]: Date.now() },
        })),

      reorderNotes: (orderedIds) =>
        set((s) => ({ notes: reorderList(s.notes, orderedIds, Date.now()) })),

      setTimerMode: (mode) =>
        set((s) => {
          const minutes =
            mode === "focus" ? s.settings.pomodoroFocus : s.settings.pomodoroBreak;
          return {
            timer: {
              ...s.timer,
              mode,
              running: false,
              startedAt: null,
              baseElapsed: 0,
              duration: minutes * 60,
            },
          };
        }),

      setTimerTask: (taskId) =>
        set((s) => ({ timer: { ...s.timer, taskId } })),

      startTimer: () =>
        set((s) => {
          const finished = s.timer.baseElapsed >= s.timer.duration;
          const minutes =
            s.timer.mode === "focus"
              ? s.settings.pomodoroFocus
              : s.settings.pomodoroBreak;
          return {
            timer: {
              ...s.timer,
              running: true,
              startedAt: Date.now(),
              baseElapsed: finished ? 0 : s.timer.baseElapsed,
              duration: s.timer.duration || minutes * 60,
            },
          };
        }),

      pauseTimer: () =>
        set((s) => ({
          timer: {
            ...s.timer,
            running: false,
            startedAt: null,
            baseElapsed: Math.min(elapsedOf(s.timer), s.timer.duration),
          },
        })),

      resetTimer: () =>
        set((s) => ({
          timer: {
            ...s.timer,
            running: false,
            startedAt: null,
            baseElapsed: 0,
          },
        })),

      completeTimer: () => finalizeTimer(get().timer.duration * 1000),

      reconcileTimer: () => {
        const { timer } = get();
        if (!timer.running || timer.startedAt == null) {
          return { record: false, recordedMs: 0, stale: false };
        }
        const res = resolveTimerOnResume({
          lastResumedAt: timer.startedAt,
          baseElapsedMs: timer.baseElapsed * 1000,
          totalMs: timer.duration * 1000,
          now: Date.now(),
        });
        if (res.record) finalizeTimer(res.recordedMs);
        else if (res.stale) finalizeTimer(null);
        // else: not finished — leave it running (it keeps counting from startedAt)
        return res;
      },

      updateSettings: (patch) =>
        set((s) => {
          const settings = { ...s.settings, ...patch };
          let timer = s.timer;
          if (!s.timer.running && s.timer.baseElapsed === 0) {
            const minutes =
              s.timer.mode === "focus"
                ? settings.pomodoroFocus
                : settings.pomodoroBreak;
            timer = { ...s.timer, duration: minutes * 60 };
          }
          return { settings, timer, settingsUpdatedAt: Date.now() };
        }),

      selectSound: (id) =>
        set((s) => ({
          sound: { ...s.sound, selectedId: id, playing: true },
          soundUpdatedAt: Date.now(),
        })),

      toggleSoundPlaying: () =>
        set((s) => {
          if (!s.sound.selectedId) return {};
          return { sound: { ...s.sound, playing: !s.sound.playing } };
        }),

      stopSound: () =>
        set((s) => (s.sound.playing ? { sound: { ...s.sound, playing: false } } : {})),

      setSoundVolume: (volume) =>
        set((s) => ({
          sound: { ...s.sound, volume: Math.max(0, Math.min(1, volume)) },
          soundUpdatedAt: Date.now(),
        })),

      toggleFavoriteSound: (id) =>
        set((s) => {
          const has = s.sound.favorites.includes(id);
          return {
            sound: {
              ...s.sound,
              favorites: has
                ? s.sound.favorites.filter((f) => f !== id)
                : [...s.sound.favorites, id],
            },
            soundUpdatedAt: Date.now(),
          };
        }),

      exportSyncData: () => {
        const s = get();
        return {
          tasks: s.tasks,
          habits: s.habits,
          notes: s.notes,
          sessions: s.sessions,
          settings: s.settings,
          sound: { ...s.sound, playing: false },
          deletedIds: s.deletedIds,
          settingsUpdatedAt: s.settingsUpdatedAt,
          soundUpdatedAt: s.soundUpdatedAt,
          focusTotals: s.focusTotals,
          schemaVersion: SCHEMA_VERSION,
        };
      },

      applySyncData: (data) =>
        set((s) => ({
          tasks: data.tasks ?? s.tasks,
          habits: data.habits ?? s.habits,
          notes: data.notes ?? s.notes,
          sessions: data.sessions ?? s.sessions,
          settings: { ...s.settings, ...(data.settings ?? {}) },
          sound: { ...s.sound, ...(data.sound ?? {}), playing: false },
          deletedIds: data.deletedIds ?? s.deletedIds,
          settingsUpdatedAt: data.settingsUpdatedAt ?? s.settingsUpdatedAt,
          soundUpdatedAt: data.soundUpdatedAt ?? s.soundUpdatedAt,
          focusTotals: data.focusTotals ?? s.focusTotals,
        })),

      resetAll: () =>
        set((s) => {
          // Tombstone everything so the erase syncs as deletions to other devices.
          const now = Date.now();
          const deletedIds = { ...s.deletedIds };
          for (const t of s.tasks) deletedIds[t.id] = now;
          for (const h of s.habits) deletedIds[h.id] = now;
          for (const n of s.notes) deletedIds[n.id] = now;
          return {
            ...initialState,
            settings: s.settings,
            sound: { ...s.sound, playing: false },
            deletedIds,
            settingsUpdatedAt: s.settingsUpdatedAt,
            soundUpdatedAt: s.soundUpdatedAt,
          };
        }),
      };
    },
    {
      name: "calm-planner-v1",
      version: SCHEMA_VERSION,
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<AppState>;
        if (version < 2) {
          state.settings = { ...defaultSettings, ...(state.settings ?? {}) };
          state.timer = initialTimer;
          state.tasks = (state.tasks ?? []).map((t) => ({
            ...t,
            dueDate: t.dueDate ?? toKey(new Date(t.createdAt)),
            focusSeconds: t.focusSeconds ?? 0,
          }));
        }
        if (version < 3) {
          state.sound = { ...initialSound, ...(state.sound ?? {}), playing: false };
        }
        if (version < 4) {
          // Manual drag-ordering introduced: seed `order` from the previous
          // due-date sort so the list starts exactly as the user last saw it.
          const tasks = state.tasks ?? [];
          const sorted = [...tasks].sort((a, b) => {
            const da = a.dueDate ?? "9999";
            const db = b.dueDate ?? "9999";
            if (da !== db) return da < db ? -1 : 1;
            return b.createdAt - a.createdAt;
          });
          const rank = new Map(sorted.map((t, i) => [t.id, i]));
          state.tasks = tasks.map((t) => ({ ...t, order: rank.get(t.id) ?? 0 }));
        }
        if (version < 5) {
          // Per-item merge sync: backfill `updatedAt` (default to createdAt so
          // existing data isn't treated as "newer" and clobber the cloud) and
          // seed the tombstone map + settings/sound merge timestamps.
          state.tasks = (state.tasks ?? []).map((t) => ({
            ...t,
            updatedAt: t.updatedAt ?? t.createdAt ?? 0,
          }));
          state.habits = (state.habits ?? []).map((h) => ({
            ...h,
            updatedAt: h.updatedAt ?? h.createdAt ?? 0,
          }));
          state.notes = (state.notes ?? []).map((n) => ({
            ...n,
            updatedAt: n.updatedAt ?? n.createdAt ?? 0,
          }));
          state.deletedIds = state.deletedIds ?? {};
          state.settingsUpdatedAt = state.settingsUpdatedAt ?? 0;
          state.soundUpdatedAt = state.soundUpdatedAt ?? 0;
        }
        if (version < 6) {
          // Lifetime focus aggregate introduced (survives the recent-session cap).
          state.focusTotals = state.focusTotals ?? { ms: 0, sessions: 0 };
        }
        if (version < 7) {
          // Manual drag-ordering for habits & notes: seed `order` from the
          // previous implicit sort (habits oldest→newest by createdAt; notes
          // newest→oldest) so each list starts exactly as the user last saw it.
          const habits = state.habits ?? [];
          const habitRank = new Map(
            [...habits].sort((a, b) => a.createdAt - b.createdAt).map((h, i) => [h.id, i])
          );
          state.habits = habits.map((h) => ({ ...h, order: h.order ?? habitRank.get(h.id) ?? 0 }));

          const notes = state.notes ?? [];
          const noteRank = new Map(
            [...notes].sort((a, b) => b.createdAt - a.createdAt).map((n, i) => [n.id, i])
          );
          state.notes = notes.map((n) => ({ ...n, order: n.order ?? noteRank.get(n.id) ?? 0 }));
        }
        return state as AppState;
      },
      // Resolve any timer left "running" across an app restart: record a
      // genuine (capped) session or discard a clearly-stale one — never log
      // phantom focus, and never leave running:true forever.
      onRehydrateStorage: () => () => {
        queueMicrotask(() => {
          try {
            useStore.getState().reconcileTimer();
          } catch {
            /* never let timer reconciliation break startup */
          }
        });
      },
    }
  )
);

export function timerElapsed(t: TimerState): number {
  return elapsedOf(t);
}
