/**
 * English catalog — the SOURCE OF TRUTH for i18n. Every user-facing string the
 * i18n layer knows about lives here; `fr` and `ar` mirror these keys (see
 * fr.ts / ar.ts) and fall back to these values until translated.
 *
 * Keys are dot-namespaced by area. Use `{name}`-style placeholders for
 * interpolation (see `t()` in ../index.tsx).
 */
export const en = {
  // ── App shell / navigation ────────────────────────────────────────────────
  "app.name": "Pink Petals",
  "nav.today": "Today",
  "nav.tasks": "Tasks",
  "nav.habits": "Habits",
  "nav.notes": "Notes",
  "nav.timer": "Timer",
  "nav.settings": "Settings",

  // ── Common actions ────────────────────────────────────────────────────────
  "common.add": "Add",
  "common.new": "New",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.export": "Export",
  "common.import": "Import",

  // ── Tasks ─────────────────────────────────────────────────────────────────
  "tasks.addPlaceholder": "Add a task…",
  "tasks.addLabel": "New task title",
  "tasks.add": "Add task",
  "tasks.options": "Task options",
  "tasks.descriptionPlaceholder": "Description (optional)",
  "tasks.descriptionLabel": "Task description",

  // ── Habits ────────────────────────────────────────────────────────────────
  "habits.addPlaceholder": "Add a habit…",
  "habits.addLabel": "New habit name",
  "habits.add": "Add habit",

  // ── Notes ─────────────────────────────────────────────────────────────────
  "notes.titlePlaceholder": "Title",
  "notes.titleLabel": "Note title",
  "notes.bodyPlaceholder": "Write freely…",
  "notes.bodyLabel": "Note body",

  // ── Timer ─────────────────────────────────────────────────────────────────
  "timer.newTaskPlaceholder": "New task to focus on…",
  "timer.newTaskLabel": "New task to focus on",

  // ── Settings ──────────────────────────────────────────────────────────────
  "settings.title": "Settings",
  "settings.subtitle": "Make it yours.",
  "settings.yourName": "Your name",
  "settings.namePlaceholder": "What should we call you?",
  "settings.nameLabel": "Your name",
  "settings.language": "Language",
  "settings.languageLabel": "Choose language",
  "settings.data": "Data",
  "settings.exportBackup": "Export a backup",
  "settings.exportHint": "Download all your data as a JSON file.",
  "settings.importBackup": "Import a backup",
  "settings.importHint": "Restore from a JSON file — it merges with your current data.",
  "settings.importInvalid": "That file isn't a valid Pink Petals backup.",
  "settings.importNewer":
    "That backup was made by a newer version of the app. Please update first.",
  "settings.importSuccess": "Backup imported and merged. 🌸",
  "settings.resetAll": "Reset all data",
  "settings.resetConfirm": "Erase all tasks, habits, and notes? This can't be undone.",
  "settings.eraseEverything": "Erase everything",
  "settings.keepData": "Keep my data",
  "settings.dangerZone": "Danger zone",
  "settings.deleteAccount": "Delete account & data",
  "settings.deleteAccountHint":
    "Permanently erase your data on this device and in the cloud, then sign out. This cannot be undone.",
  "settings.deleteConfirmPrompt": "Type {word} to confirm.",
  "settings.deleteConfirmWord": "DELETE",
  "settings.deleteConfirmButton": "Permanently delete everything",
  "settings.deleting": "Deleting…",
  "settings.deleteServerNote":
    "Your login itself is removed by a secure server step if configured; otherwise your data is erased and you're signed out.",
  "settings.emailUnverified":
    "Your email isn't verified yet. Some features may be limited until you confirm it.",

  // ── Sync status ───────────────────────────────────────────────────────────
  "sync.idle": "Not synced",
  "sync.syncing": "Syncing…",
  "sync.synced": "Synced",
  "sync.offline": "Offline — changes saved locally",
  "sync.error": "Sync error",
  "sync.outdated": "Please update the app to sync",
} as const;

export type TranslationKey = keyof typeof en;
export type Catalog = Record<TranslationKey, string>;
