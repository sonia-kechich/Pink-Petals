export type ThemeMode = "light" | "dark" | "system";

export interface Task {
  id: string;
  title: string;
  done: boolean;
  /** Marked as one of today's (max 3) focus tasks. */
  focused: boolean;
  createdAt: number;
  completedAt?: number;
  order: number;
}

export interface Habit {
  id: string;
  name: string;
  createdAt: number;
  /** dateKey (yyyy-MM-dd) -> completed */
  log: Record<string, boolean>;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

export interface FocusSession {
  id: string;
  startedAt: number;
  minutes: number;
  mode: "focus" | "break";
}

export interface Settings {
  theme: ThemeMode;
  userName: string;
  pomodoroFocus: number;
  pomodoroBreak: number;
  soundOnComplete: boolean;
}

export interface AppState {
  tasks: Task[];
  habits: Habit[];
  notes: Note[];
  sessions: FocusSession[];
  settings: Settings;
}

/** At most 3 tasks may be focused at once. */
export const MAX_FOCUS = 3;
