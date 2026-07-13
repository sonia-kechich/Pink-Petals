import { describe, expect, it } from "vitest";
import {
  TOMBSTONE_TTL_MS,
  gcTombstones,
  mergeUserData,
  stableStringify,
} from "./mergeSync";
import type { SyncData, Task } from "../types";

const baseSync = (over: Partial<SyncData> = {}): SyncData => ({
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
  sound: { selectedId: null, playing: false, volume: 0.6, favorites: [] },
  deletedIds: {},
  settingsUpdatedAt: 0,
  soundUpdatedAt: 0,
  focusTotals: { ms: 0, sessions: 0 },
  schemaVersion: 7,
  ...over,
});

const task = (id: string, updatedAt: number, over: Partial<Task> = {}): Task => ({
  id,
  title: id,
  done: false,
  createdAt: 0,
  updatedAt,
  order: 0,
  dateKey: "",
  ...over,
});

const ids = (d: SyncData) => d.tasks.map((t) => t.id).sort();

describe("stableStringify", () => {
  it("is independent of object key order", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
  });
  it("differs when a value changes", () => {
    expect(stableStringify({ a: 1 })).not.toBe(stableStringify({ a: 2 }));
  });
});

describe("mergeUserData", () => {
  it("keeps concurrent edits to different items (both survive)", () => {
    const local = baseSync({ tasks: [task("a", 10)] });
    const remote = baseSync({ tasks: [task("b", 20)] });
    expect(ids(mergeUserData(local, remote))).toEqual(["a", "b"]);
  });

  it("newer edit beats older edit on the same item", () => {
    const local = baseSync({ tasks: [task("a", 10, { title: "old" })] });
    const remote = baseSync({ tasks: [task("a", 20, { title: "new" })] });
    expect(mergeUserData(local, remote).tasks[0].title).toBe("new");
    // commutative on the winning timestamp
    expect(mergeUserData(remote, local).tasks[0].title).toBe("new");
  });

  it("newer delete beats older edit (item is removed)", () => {
    const local = baseSync({ tasks: [task("a", 10)] });
    const remote = baseSync({ tasks: [], deletedIds: { a: 20 } });
    expect(ids(mergeUserData(local, remote))).toEqual([]);
  });

  it("older delete loses to a newer edit (item survives)", () => {
    const local = baseSync({ tasks: [task("a", 30)] });
    const remote = baseSync({ tasks: [], deletedIds: { a: 20 } });
    expect(ids(mergeUserData(local, remote))).toEqual(["a"]);
  });

  it("settings/sound follow their own newest-wins timestamp", () => {
    const local = baseSync({
      settings: { userName: "L", pomodoroFocus: 25, pomodoroBreak: 5, soundOnComplete: true, notifyOnComplete: false, showTasks: true, showHabits: true, showNotes: true, showCalendar: false, showTimer: false, showDashboard: true },
      settingsUpdatedAt: 5,
    });
    const remote = baseSync({
      settings: { userName: "R", pomodoroFocus: 50, pomodoroBreak: 10, soundOnComplete: false, notifyOnComplete: true, showTasks: true, showHabits: true, showNotes: true, showCalendar: false, showTimer: false, showDashboard: true },
      settingsUpdatedAt: 9,
    });
    expect(mergeUserData(local, remote).settings.userName).toBe("R");
  });

  it("is commutative (same signature regardless of argument order)", () => {
    const a = baseSync({ tasks: [task("a", 10), task("b", 5)], deletedIds: { z: 3 } });
    const b = baseSync({ tasks: [task("a", 20), task("c", 7)], deletedIds: { z: 8 } });
    expect(stableStringify(mergeUserData(a, b))).toBe(stableStringify(mergeUserData(b, a)));
  });

  it("merges focusTotals by max (no double-count of shared history)", () => {
    const local = baseSync({ focusTotals: { ms: 100, sessions: 5 } });
    const remote = baseSync({ focusTotals: { ms: 80, sessions: 4 } });
    expect(mergeUserData(local, remote).focusTotals).toEqual({ ms: 100, sessions: 5 });
    expect(mergeUserData(remote, local).focusTotals).toEqual({ ms: 100, sessions: 5 });
  });

  it("sorts merged habits by their manual `order` (then createdAt)", () => {
    const habit = (id: string, order: number, updatedAt: number) => ({
      id,
      name: id,
      createdAt: 0,
      updatedAt,
      order,
      log: {},
    });
    const local = baseSync({ habits: [habit("a", 0, 1), habit("b", 1, 1)] });
    const remote = baseSync({ habits: [habit("c", -1, 1)] }); // dragged to top
    const merged = mergeUserData(local, remote);
    expect(merged.habits.map((h) => h.id)).toEqual(["c", "a", "b"]);
  });

  it("unions sessions by id without duplicates", () => {
    const s = (id: string, startedAt: number) => ({ id, startedAt, minutes: 25, mode: "focus" as const });
    const local = baseSync({ sessions: [s("x", 1), s("y", 2)] });
    const remote = baseSync({ sessions: [s("y", 2), s("z", 3)] });
    const merged = mergeUserData(local, remote);
    expect(merged.sessions.map((x) => x.id).sort()).toEqual(["x", "y", "z"]);
  });
});

describe("gcTombstones", () => {
  it("drops tombstones older than the TTL, keeps fresh ones", () => {
    const now = 1_000_000_000_000;
    const out = gcTombstones(
      { stale: now - TOMBSTONE_TTL_MS - 1, fresh: now - 1000 },
      now
    );
    expect(out).toEqual({ fresh: now - 1000 });
  });
});
