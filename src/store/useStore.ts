import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AppState,
  SyncData,
  Task,
  Habit,
  Note,
  FocusSession,
  Settings,
  SoundSettings,
  TimerState,
} from "../types";
import { uid } from "../lib/utils";
import { todayKey, format, nextOccurrence } from "../lib/date";
import { SCHEMA_VERSION } from "../lib/schema";

interface Actions {
  // Tasks
  addTask: (title: string, dateKey?: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  renameTask: (id: string, title: string) => void;
  updateTask: (id: string, patch: Partial<Pick<Task, "title" | "dateKey">>) => void;
  clearCompleted: () => void;
  moveTaskToTop: (id: string) => void;
  moveTaskToBottom: (id: string) => void;
  moveTask: (id: string, toIndex: number) => void;
  reorderTasks: (orderedIds: string[]) => void;

  addHabit: (name: string) => void;
  renameHabit: (id: string, name: string) => void;
  toggleHabitDay: (id: string, dateKey: string) => void;
  updateHabit: (id: string, patch: Partial<Pick<Habit, "name" | "description">>) => void;
  deleteHabit: (id: string) => void;
  moveHabit: (id: string, toIndex: number) => void;
  moveHabitToTop: (id: string) => void;
  moveHabitToBottom: (id: string) => void;

  addNote: () => string;
  updateNote: (id: string, patch: Partial<Pick<Note, "title" | "body">>) => void;
  deleteNote: (id: string) => void;
  moveNoteToTop: (id: string) => void;
  moveNoteToBottom: (id: string) => void;

  // Focus timer
  addSession: (minutes: number, mode: "focus" | "break", taskId?: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;

  // Sound
  selectSound: (id: string) => void;
  toggleSoundPlaying: () => void;
  setSoundVolume: (volume: number) => void;
  toggleFavoriteSound: (id: string) => void;
  stopSound: () => void;

  // Sync
  exportSyncData: () => SyncData;
  applySyncData: (data: Partial<SyncData>) => void;

  resetAll: () => void;
}

const defaultSound: SoundSettings = {
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
  settings: {
    userName: "",
    pomodoroFocus: 25,
    pomodoroBreak: 5,
    soundOnComplete: true,
    notifyOnComplete: false,
    showTasks: true,
    showHabits: true,
    showNotes: true,
    showCalendar: false,
    showTimer: false,
    showDashboard: true,
  },
  sound: { ...defaultSound },
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
    (set, get) => ({
      ...initialState,

      // ---- Tasks -----------------------------------------------------
      addTask: (title, dateKey) =>
        set((s) => {
          const t = title.trim();
          if (!t) return {};
          const task: Task = {
            id: uid(),
            title: t,
            done: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            order: s.tasks.length,
            dateKey: dateKey || todayKey(),
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
              createdAt: now,
              updatedAt: now,
              order: topOrder(s.tasks),
              dateKey: nextDue,
              dueDate: nextDue,
              repeat: target.repeat,
              seriesId: target.seriesId ?? target.id,
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
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, ...patch } : t
          ),
        })),

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      clearCompleted: () =>
        set((s) => {
          const now = Date.now();
          const deletedIds = { ...s.deletedIds };
          for (const t of s.tasks) if (t.done) deletedIds[t.id] = now;
          return { tasks: s.tasks.filter((t) => !t.done), deletedIds };
        }),

      reorderTasks: (orderedIds: string[]) =>
        set((state) => {
          const position = new Map(orderedIds.map((id, i) => [id, i]));
          return {
            tasks: state.tasks.map((t) =>
              position.has(t.id) ? { ...t, order: position.get(t.id)! } : t
            ),
          };
        }),

      moveTaskToTop: (id) =>
        set((s) => {
          const idx = s.tasks.findIndex((t) => t.id === id);
          if (idx < 1) return {};
          const tasks = [...s.tasks];
          const [item] = tasks.splice(idx, 1);
          tasks.unshift(item);
          return { tasks };
        }),

      moveTaskToBottom: (id) =>
        set((s) => {
          const idx = s.tasks.findIndex((t) => t.id === id);
          if (idx < 0 || idx === s.tasks.length - 1) return {};
          const tasks = [...s.tasks];
          const [item] = tasks.splice(idx, 1);
          tasks.push(item);
          return { tasks };
        }),

      moveTask: (id, toIndex) =>
        set((s) => {
          const tasks = [...s.tasks];
          const fromIndex = tasks.findIndex((t) => t.id === id);
          if (fromIndex < 0) return {};
          const [item] = tasks.splice(fromIndex, 1);
          const clamped = Math.max(0, Math.min(toIndex, tasks.length));
          tasks.splice(clamped, 0, item);
          return { tasks };
        }),

      // ---- Habits ----------------------------------------------------
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

      renameHabit: (id, name) =>
        set((s) => ({
          habits: s.habits.map((h) =>
            h.id === id ? { ...h, name: name.trim() || h.name } : h
          ),
        })),

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

      reorderHabits: (orderedIds: string[]) =>
        set((s) => {
          const rank = new Map(orderedIds.map((id, i) => [id, i]));
          return {
            habits: s.habits.map((h) => {
              const order = rank.get(h.id);
              return order !== undefined ? { ...h, order, updatedAt: Date.now() } : h;
            }),
          };
        }),

      moveHabit: (id, toIndex) =>
        set((state) => {
          const habits = [...state.habits];
          const fromIndex = habits.findIndex((h) => h.id === id);
          if (fromIndex === -1) return state;
          const [moved] = habits.splice(fromIndex, 1);
          habits.splice(toIndex, 0, moved);
          return { habits };
        }),

      moveHabitToTop: (id) =>
        set((state) => {
          const habits = [...state.habits];
          const idx = habits.findIndex((h) => h.id === id);
          if (idx < 1) return {};
          const [moved] = habits.splice(idx, 1);
          habits.unshift(moved);
          return { habits };
        }),

      moveHabitToBottom: (id) =>
        set((state) => {
          const habits = [...state.habits];
          const idx = habits.findIndex((h) => h.id === id);
          if (idx < 0 || idx === habits.length - 1) return {};
          const [moved] = habits.splice(idx, 1);
          habits.push(moved);
          return { habits };
        }),

      // ---- Notes -----------------------------------------------------
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

      moveNoteToTop: (id) =>
        set((s) => {
          const idx = s.notes.findIndex((n) => n.id === id);
          if (idx < 1) return {};
          const notes = [...s.notes];
          const [item] = notes.splice(idx, 1);
          notes.unshift(item);
          return { notes };
        }),

      moveNoteToBottom: (id) =>
        set((s) => {
          const idx = s.notes.findIndex((n) => n.id === id);
          if (idx < 0 || idx === s.notes.length - 1) return {};
          const notes = [...s.notes];
          const [item] = notes.splice(idx, 1);
          notes.push(item);
          return { notes };
        }),

      // ---- Focus -----------------------------------------------------
      addSession: (minutes, mode, taskId) =>
        set((s) => {
          const session: FocusSession = {
            id: uid(),
            startedAt: Date.now(),
            minutes,
            mode,
            taskId,
          };
          return { sessions: [...s.sessions, session] };
        }),

      setTimerTask: (_taskId: string) => set(() => ({})),

      // ---- Sound -----------------------------------------------------
      selectSound: (id) =>
        set((s) => ({
          sound: { ...s.sound, selectedId: id, playing: true },
        })),

      toggleSoundPlaying: () =>
        set((s) => ({
          sound: { ...s.sound, playing: !s.sound.playing },
        })),

      setSoundVolume: (volume) =>
        set((s) => ({
          sound: { ...s.sound, volume: Math.max(0, Math.min(1, volume)) },
        })),

      toggleFavoriteSound: (id) =>
        set((s) => {
          const favs = s.sound.favorites;
          const next = favs.includes(id)
            ? favs.filter((f) => f !== id)
            : [...favs, id];
          return { sound: { ...s.sound, favorites: next } };
        }),

      stopSound: () =>
        set((s) => ({
          sound: { ...s.sound, playing: false },
        })),

      // ---- Sync ------------------------------------------------------
      exportSyncData: () => {
        const s = get();
        return {
          tasks: s.tasks,
          habits: s.habits,
          notes: s.notes,
          sessions: s.sessions,
          settings: s.settings,
          sound: s.sound,
          deletedIds: s.deletedIds ?? {},
          settingsUpdatedAt: s.settingsUpdatedAt ?? 0,
          soundUpdatedAt: s.soundUpdatedAt ?? 0,
          focusTotals: s.focusTotals ?? { ms: 0, sessions: 0 },
          schemaVersion: SCHEMA_VERSION,
        };
      },

      applySyncData: (data) =>
        set((s) => ({
          tasks: data.tasks ?? s.tasks,
          habits: data.habits ?? s.habits,
          notes: data.notes ?? s.notes,
          sessions: data.sessions ?? s.sessions,
          settings: data.settings ?? s.settings,
          sound: data.sound ?? s.sound,
          deletedIds: (data as SyncData).deletedIds ?? s.deletedIds,
          settingsUpdatedAt: (data as SyncData).settingsUpdatedAt ?? s.settingsUpdatedAt,
          soundUpdatedAt: (data as SyncData).soundUpdatedAt ?? s.soundUpdatedAt,
          focusTotals: (data as SyncData).focusTotals ?? s.focusTotals,
        })),

      resetAll: () => {
        try { localStorage.removeItem("calm-planner-v1"); } catch {}
        set({ ...initialState });
      },
    }),
    {
      name: "calm-planner-v1",
      version: 4,
      migrate: (persisted: any) => {
        if (!persisted || !persisted.tasks) return persisted;
        const tasks = persisted.tasks.map((t: any) => ({
          ...t,
          dateKey: t.dateKey || (t.createdAt ? format(t.createdAt, "yyyy-MM-dd") : todayKey()),
        }));
        // Ensure old settings get new fields
        if (persisted.settings) {
          persisted.settings = {
            userName: persisted.settings.userName || "",
            pomodoroFocus: persisted.settings.pomodoroFocus ?? 25,
            pomodoroBreak: persisted.settings.pomodoroBreak ?? 5,
            soundOnComplete: persisted.settings.soundOnComplete ?? true,
            notifyOnComplete: persisted.settings.notifyOnComplete ?? false,
            showTasks: persisted.settings.showTasks ?? true,
            showHabits: persisted.settings.showHabits ?? true,
            showNotes: persisted.settings.showNotes ?? true,
            showCalendar: persisted.settings.showCalendar ?? false,
            showTimer: persisted.settings.showTimer ?? false,
            showDashboard: persisted.settings.showDashboard ?? true,
          };
        }
        return { ...persisted, tasks };
      },
      storage: createJSONStorage(() => {
        try {
          const test = "__storage_test__";
          localStorage.setItem(test, test);
          localStorage.removeItem(test);
          return localStorage;
        } catch {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
      }),
    }
  )
);

export function timerElapsed(t: TimerState): number {
  return elapsedOf(t);
}
