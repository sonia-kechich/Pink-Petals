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
} from "../types";
import { uid } from "../lib/utils";
import { todayKey, format } from "../lib/date";

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

  // Habits
  addHabit: (name: string) => void;
  renameHabit: (id: string, name: string) => void;
  toggleHabitDay: (id: string, dateKey: string) => void;
  deleteHabit: (id: string) => void;
  moveHabitToTop: (id: string) => void;
  moveHabitToBottom: (id: string) => void;

  // Notes
  addNote: () => string;
  updateNote: (id: string, patch: Partial<Pick<Note, "title" | "body">>) => void;
  deleteNote: (id: string) => void;
  moveNoteToTop: (id: string) => void;
  moveNoteToBottom: (id: string) => void;

  // Focus timer
  addSession: (minutes: number, mode: "focus" | "break", taskId?: string) => void;

  // Settings
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
            order: s.tasks.length,
            dateKey: dateKey || todayKey(),
          };
          return { tasks: [task, ...s.tasks] };
        }),

      toggleTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  done: !t.done,
                  completedAt: !t.done ? Date.now() : undefined,
                }
              : t
          ),
        })),

      deleteTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      renameTask: (id, title) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, title: title.trim() || t.title } : t
          ),
        })),

      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, ...patch } : t
          ),
        })),

      clearCompleted: () =>
        set((s) => ({ tasks: s.tasks.filter((t) => !t.done) })),

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

      reorderTasks: (orderedIds: string[]) =>
        set((state) => {
          const position = new Map(orderedIds.map((id, i) => [id, i]));
          return {
            tasks: state.tasks.map((t) =>
              position.has(t.id) ? { ...t, order: position.get(t.id)! } : t
            ),
          };
        }),

      // ---- Habits ----------------------------------------------------
      addHabit: (name) =>
        set((s) => {
          const n = name.trim();
          if (!n) return {};
          const habit: Habit = {
            id: uid(),
            name: n,
            createdAt: Date.now(),
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
            return { ...h, log };
          }),
        })),

      deleteHabit: (id) =>
        set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),

      moveHabitToTop: (id) =>
        set((s) => {
          const idx = s.habits.findIndex((h) => h.id === id);
          if (idx < 1) return {};
          const habits = [...s.habits];
          const [item] = habits.splice(idx, 1);
          habits.unshift(item);
          return { habits };
        }),

      moveHabitToBottom: (id) =>
        set((s) => {
          const idx = s.habits.findIndex((h) => h.id === id);
          if (idx < 0 || idx === s.habits.length - 1) return {};
          const habits = [...s.habits];
          const [item] = habits.splice(idx, 1);
          habits.push(item);
          return { habits };
        }),

      // ---- Notes -----------------------------------------------------
      addNote: () => {
        const id = uid();
        const now = Date.now();
        set((s) => ({
          notes: [
            { id, title: "", body: "", createdAt: now, updatedAt: now },
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
        set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

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
          return { sessions: [session, ...s.sessions].slice(0, 200) };
        }),

      // ---- Settings --------------------------------------------------
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

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
        })),

      resetAll: () => {
        try { localStorage.removeItem("calm-planner-v1"); } catch {}
        set({ ...initialState });
      },
    }),
    {
      name: "calm-planner-v1",
      version: 6,
      migrate: (persisted: any) => {
        if (!persisted || !persisted.tasks) return persisted;
        const tasks = persisted.tasks.map((t: any, i: number) => ({
          ...t,
          dateKey: t.dateKey || (t.createdAt ? format(t.createdAt, "yyyy-MM-dd") : todayKey()),
          order: t.order ?? i,
        }));
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
