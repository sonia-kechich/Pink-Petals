import { describe, expect, it } from "vitest";
import {
  BACKUP_APP_ID,
  backupFilename,
  buildBackup,
  mergeBackup,
  parseBackup,
} from "./backup";
import { SCHEMA_VERSION } from "./schema";
import type { SyncData, Task } from "../types";

const task = (id: string, updatedAt: number, over: Partial<Task> = {}): Task => ({
  id,
  title: id,
  done: false,
  focused: false,
  createdAt: 0,
  updatedAt,
  order: 0,
  focusSeconds: 0,
  ...over,
});

const sync = (over: Partial<SyncData> = {}): SyncData => ({
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
    notifyOnComplete: false,
  },
  sound: { selectedId: null, playing: false, volume: 0.6, favorites: [] },
  deletedIds: {},
  settingsUpdatedAt: 0,
  soundUpdatedAt: 0,
  focusTotals: { ms: 0, sessions: 0 },
  schemaVersion: SCHEMA_VERSION,
  ...over,
});

describe("buildBackup / backupFilename", () => {
  it("wraps data in a versioned, timestamped envelope", () => {
    const b = buildBackup(sync({ tasks: [task("a", 1)] }), "2026-06-30T12:00:00.000Z");
    expect(b.app).toBe(BACKUP_APP_ID);
    expect(b.schemaVersion).toBe(SCHEMA_VERSION);
    expect(b.exportedAt).toBe("2026-06-30T12:00:00.000Z");
    expect(b.data.tasks.map((t) => t.id)).toEqual(["a"]);
  });

  it("produces a filesystem-safe filename", () => {
    const name = backupFilename(new Date("2026-06-30T12:00:00.000Z"));
    expect(name).toBe("pink-petals-backup-2026-06-30T12-00-00Z.json");
    expect(name).not.toMatch(/[:]/);
  });
});

describe("parseBackup", () => {
  it("round-trips an exported backup", () => {
    const data = sync({ tasks: [task("a", 5), task("b", 9)] });
    const json = JSON.stringify(buildBackup(data, "2026-06-30T12:00:00.000Z"));
    const res = parseBackup(json);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.tasks.map((t) => t.id).sort()).toEqual(["a", "b"]);
  });

  it("migrates an old-schema backup forward", () => {
    const old = buildBackup(sync({ tasks: [task("a", 1)], schemaVersion: 1 }), "t");
    // Force the inner doc to advertise the old version too.
    old.data.schemaVersion = 1;
    const res = parseBackup(JSON.stringify(old));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("rejects a backup from a newer app version", () => {
    const newer = buildBackup(sync({ schemaVersion: SCHEMA_VERSION + 99 }), "t");
    newer.data.schemaVersion = SCHEMA_VERSION + 99;
    const res = parseBackup(JSON.stringify(newer));
    expect(res).toEqual({ ok: false, reason: "newer" });
  });

  it("rejects malformed input", () => {
    expect(parseBackup("not json").ok).toBe(false);
    expect(parseBackup("{}").ok).toBe(false);
    expect(parseBackup("12").ok).toBe(false);
  });

  it("accepts a bare SyncData blob (no envelope)", () => {
    const res = parseBackup(JSON.stringify(sync({ tasks: [task("x", 1)] })));
    expect(res.ok).toBe(true);
  });
});

describe("mergeBackup", () => {
  it("importing an older edit does not blow away newer local data", () => {
    const local = sync({ tasks: [task("a", 30, { title: "local-new" })] });
    const imported = sync({ tasks: [task("a", 20, { title: "backup-old" })] });
    const merged = mergeBackup(local, imported);
    expect(merged.tasks[0].title).toBe("local-new");
  });

  it("a newer backup edit wins over older local data", () => {
    const local = sync({ tasks: [task("a", 10, { title: "local-old" })] });
    const imported = sync({ tasks: [task("a", 40, { title: "backup-new" })] });
    expect(mergeBackup(local, imported).tasks[0].title).toBe("backup-new");
  });

  it("merges disjoint items from both sides", () => {
    const local = sync({ tasks: [task("a", 10)] });
    const imported = sync({ tasks: [task("b", 10)] });
    expect(mergeBackup(local, imported).tasks.map((t) => t.id).sort()).toEqual(["a", "b"]);
  });
});
