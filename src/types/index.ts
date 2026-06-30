export type ThemeMode = "light" | "dark" | "system";

export type RepeatFreq = "none" | "daily" | "weekly" | "monthly";

export interface RepeatRule {
  freq: RepeatFreq;
  weekdays?: number[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  done: boolean;
  focused: boolean;
  createdAt: number;
  /** Epoch ms of the last edit — the per-item merge key for cloud sync. */
  updatedAt: number;
  completedAt?: number;
  order: number;
  dueDate?: string;
  repeat?: RepeatRule;
  seriesId?: string;
  focusSeconds?: number;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  /** Epoch ms of the last edit — the per-item merge key for cloud sync. */
  updatedAt: number;
  /** Manual drag-order (ascending). Lower = earlier in the list. */
  order?: number;
  log: Record<string, boolean>;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
  /** Manual drag-order (ascending). Lower = earlier/newer-first in the list. */
  order?: number;
}

export interface FocusSession {
  id: string;
  startedAt: number;
  minutes: number;
  mode: "focus" | "break";
  taskId?: string;
  taskTitle?: string;
}

export interface TimerState {
  mode: "focus" | "break";
  taskId?: string;
  running: boolean;
  startedAt: number | null;
  baseElapsed: number;
  duration: number;
}

export interface Settings {
  theme: ThemeMode;
  userName: string;
  pomodoroFocus: number;
  pomodoroBreak: number;
  soundOnComplete: boolean;
  notifyOnComplete: boolean;
}

export interface SoundState {
  selectedId: string | null;
  playing: boolean;
  volume: number;
  favorites: string[];
}

/** Lifetime focus aggregate — survives raw-session trimming so long-term
 *  totals never undercount. Only focus-mode sessions count toward `ms`. */
export interface FocusTotals {
  ms: number;
  sessions: number;
}

export interface AppState {
  tasks: Task[];
  habits: Habit[];
  notes: Note[];
  sessions: FocusSession[];
  settings: Settings;
  timer: TimerState;
  sound: SoundState;
  /** Soft-delete tombstones: entity id → epoch ms of deletion. Lets a delete
   *  on one device win over a stale edit on another (and vice-versa). */
  deletedIds: Record<string, number>;
  /** Epoch ms of the last settings change (settings merge as one unit). */
  settingsUpdatedAt: number;
  /** Epoch ms of the last (synced) sound-preference change. */
  soundUpdatedAt: number;
  /** Lifetime focus totals (not truncated by the recent-sessions cap). */
  focusTotals: FocusTotals;
}

/** The slice of state that syncs to the cloud, per user. */
export interface SyncData {
  tasks: Task[];
  habits: Habit[];
  notes: Note[];
  sessions: FocusSession[];
  settings: Settings;
  sound: SoundState;
  deletedIds: Record<string, number>;
  settingsUpdatedAt: number;
  soundUpdatedAt: number;
  focusTotals: FocusTotals;
  /** Schema version of this document (see lib/schema.ts). */
  schemaVersion: number;
}

export const MAX_FOCUS = 3;
