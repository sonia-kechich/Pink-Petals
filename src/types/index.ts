export interface Task {
  id: string;
  title: string;
  description?: string;
  done: boolean;
  createdAt: number;
  /** Epoch ms of the last edit — the per-item merge key for cloud sync. */
  updatedAt: number;
  completedAt?: number;
  order: number;
  dateKey: string;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
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

export interface SyncData {
  tasks: Task[];
  habits: Habit[];
  notes: Note[];
  sessions: FocusSession[];
  settings: Settings;
  sound: SoundSettings;
}

export interface AppState {
  tasks: Task[];
  habits: Habit[];
  notes: Note[];
  sessions: FocusSession[];
  settings: Settings;
  sound: SoundSettings;
}
