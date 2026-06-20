import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppState,
  Task,
  Habit,
  Note,
  FocusSession,
  Settings,
} from "../types";
import { MAX_FOCUS } from "../types";
import { uid } from "../lib/utils";

interface Actions {
  // Tasks
  addTask: (title: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  renameTask: (id: string, title: string) => void;
  toggleFocus: (id: string) => void;
  clearCompleted: () => void;

  // Habits
  addHabit: (name: string) => void;
  toggleHabitDay: (id: string, dateKey: string) => void;
  deleteHabit: (id: string) => void;

  // Notes
  addNote: () => string;
  updateNote: (id: string, patch: Partial<Pick<Note, "title" | "body">>) => void;
  deleteNote: (id: string) => void;

  // Focus timer
  addSession: (minutes: number, mode: "focus" | "break") => void;

  // Settings
  updateSettings: (patch: Partial<Settings>) => void;

  resetAll: () => void;
}

const initialState: AppState = {
  tasks: [],
  habits: [],
  notes: [],
  sessions: [],
  settings: {
    theme: "system",
    userName: "",
    pomodoroFocus: 25,
    pomodoroBreak: 5,
    soundOnComplete: true,
  },
};

export const useStore = create<AppState & Actions>()(
  persist(
    (set) => ({
      ...initialState,

      // ---- Tasks -----------------------------------------------------
      addTask: (title) =>
        set((s) => {
          const t = title.trim();
          if (!t) return {};
          const task: Task = {
            id: uid(),
            title: t,
            done: false,
            focused: false,
            createdAt: Date.now(),
            order: s.tasks.length,
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

      toggleFocus: (id) =>
        set((s) => {
          const focusedCount = s.tasks.filter((t) => t.focused && !t.done).length;
          return {
            tasks: s.tasks.map((t) => {
              if (t.id !== id) return t;
              if (!t.focused && focusedCount >= MAX_FOCUS) return t; // gently cap
              return { ...t, focused: !t.focused };
            }),
          };
        }),

      clearCompleted: () =>
        set((s) => ({ tasks: s.tasks.filter((t) => !t.done) })),

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

      // ---- Focus -----------------------------------------------------
      addSession: (minutes, mode) =>
        set((s) => {
          const session: FocusSession = {
            id: uid(),
            startedAt: Date.now(),
            minutes,
            mode,
          };
          return { sessions: [session, ...s.sessions].slice(0, 200) };
        }),

      // ---- Settings --------------------------------------------------
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      resetAll: () => set({ ...initialState }),
    }),
    {
      name: "calm-planner-v1",
      version: 1,
    }
  )
);
