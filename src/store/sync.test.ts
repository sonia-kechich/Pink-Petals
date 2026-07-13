import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "./useStore";
import { mergeUserData, stableStringify } from "../lib/mergeSync";
import type { Task } from "../types";

beforeEach(() => {
  useStore.setState({
    tasks: [],
    habits: [],
    notes: [],
    sessions: [],
    deletedIds: {},
    settingsUpdatedAt: 0,
    soundUpdatedAt: 0,
  });
});

const remoteTask = (id: string, updatedAt: number): Task => ({
  id,
  title: id,
  done: false,
  createdAt: updatedAt,
  updatedAt,
  order: 0,
  dateKey: "",
});

describe("cloudSync echo-guard foundation", () => {
  it("applying a merged state matches exportSyncData (no spurious push enqueued)", () => {
    // This is exactly what the echo-guard relies on: after applySyncData(merged),
    // the next exportSyncData() must serialize identically to `merged`, so
    // lastSyncedJson === current signature → the subscriber skips the push.
    const local = useStore.getState().exportSyncData();
    const remote = { ...local, tasks: [remoteTask("r1", 100)] };
    const merged = mergeUserData(local, remote);

    useStore.getState().applySyncData(merged);
    const exported = useStore.getState().exportSyncData();

    expect(stableStringify(exported)).toBe(stableStringify(merged));
  });

  it("a genuine local change changes the signature (would enqueue a push)", () => {
    const before = stableStringify(useStore.getState().exportSyncData());
    useStore.getState().addTask("Buy flowers");
    const after = stableStringify(useStore.getState().exportSyncData());
    expect(after).not.toBe(before);
  });

  it("deleting an item records a tombstone in the synced data", () => {
    useStore.getState().addTask("temp");
    const id = useStore.getState().tasks[0].id;
    useStore.getState().deleteTask(id);
    const exported = useStore.getState().exportSyncData();
    expect(exported.tasks.find((t) => t.id === id)).toBeUndefined();
    expect(exported.deletedIds[id]).toBeTypeOf("number");
  });
});
