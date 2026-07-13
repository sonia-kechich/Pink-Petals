export interface Task {
  id: string;
  title: string;
  description?: string;
  done: boolean;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  order: number;
  dateKey: string;
  repeat?: RepeatRule;
  dueDate?: string;
  seriesId?: string;
  focusSeconds?: number;
  focused?: boolean;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  log: Record<string, boolean>;
  order?: number;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
  order?: number;
}

export interface FocusSession {
  id: string;
  startedAt: number;
  minutes: number;
  mode: "focus" | "break";
  taskId?: string;
}

export interface Settings {
  userName: string;
  pomodoroFocus: number;
  pomodoroBreak: number;
  soundOnComplete: boolean;
  notifyOnComplete: boolean;
  showTasks: boolean;
  showHabits: boolean;
  showNotes: boolean;
  showCalendar: boolean;
  showTimer: boolean;
  showDashboard: boolean;
}

export interface SoundSettings {
  selectedId: string | null;
  playing: boolean;
  volume: number;
  favorites: string[];
}

export type SoundState = SoundSettings;

export interface TimerState {
  running: boolean;
  startedAt?: number;
  baseElapsed: number;
}

export interface RepeatRule {
  freq: "daily" | "weekly" | "monthly" | "none";
  weekdays?: number[];
}

export interface FocusTotals {
  ms: number;
  sessions: number;
}

export interface SyncData {
  tasks: Task[];
  habits: Habit[];
  notes: Note[];
  sessions: FocusSession[];
  settings: Settings;
  sound: SoundSettings;
  deletedIds: Record<string, number>;
  settingsUpdatedAt: number;
  soundUpdatedAt: number;
  focusTotals: FocusTotals;
  schemaVersion: number;
}

export interface AppState {
  tasks: Task[];
  habits: Habit[];
  notes: Note[];
  sessions: FocusSession[];
  settings: Settings;
  sound: SoundSettings;
  deletedIds?: Record<string, number>;
  settingsUpdatedAt?: number;
  soundUpdatedAt?: number;
  focusTotals?: FocusTotals;
}
