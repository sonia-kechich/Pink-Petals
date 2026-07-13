import { describe, expect, it } from "vitest";
import { reorderTaskList, reorderList } from "./tasks";
import type { Task } from "../types";

const NOW = 1_000;
const makeTask = (id: string, order: number, extra: Partial<Task> = {}): Task => ({
  id,
  title: id,
  done: false,
  createdAt: 0,
  updatedAt: 0,
  order,
  dateKey: "",
  ...extra,
});

const orderOf = (tasks: Task[]) =>
  [...tasks].sort((a, b) => a.order - b.order).map((t) => t.id);

describe("reorderTaskList", () => {
  it("reorders the full active list (maps back to global order)", () => {
    const tasks = [makeTask("a", 0), makeTask("b", 1), makeTask("c", 2)];
    const out = reorderTaskList(tasks, ["b", "c", "a"], NOW);
    expect(orderOf(out)).toEqual(["b", "c", "a"]);
  });

  it("moves an item to the top", () => {
    const tasks = [makeTask("a", 0), makeTask("b", 1), makeTask("c", 2)];
    const out = reorderTaskList(tasks, ["c", "a", "b"], NOW);
    expect(orderOf(out)).toEqual(["c", "a", "b"]);
  });

  it("moves an item to the bottom", () => {
    const tasks = [makeTask("a", 0), makeTask("b", 1), makeTask("c", 2)];
    const out = reorderTaskList(tasks, ["b", "c", "a"], NOW);
    expect(orderOf(out)).toEqual(["b", "c", "a"]);
  });

  it("filter hides items between source and target: hidden item keeps its slot", () => {
    // All three active, but the view only shows A and C (B is hidden).
    // User drags within the filtered view to [C, A]. B must stay between them.
    const tasks = [makeTask("a", 0), makeTask("b", 1), makeTask("c", 2)];
    const out = reorderTaskList(tasks, ["c", "a"], NOW);
    expect(orderOf(out)).toEqual(["c", "b", "a"]);
  });

  it("only bumps updatedAt for tasks whose order actually changed", () => {
    const tasks = [makeTask("a", 0), makeTask("b", 1), makeTask("c", 2)];
    const out = reorderTaskList(tasks, ["c", "a"], NOW);
    const byId = Object.fromEntries(out.map((t) => [t.id, t]));
    expect(byId.b.updatedAt).toBe(0); // unchanged slot → not bumped
    expect(byId.a.updatedAt).toBe(NOW);
    expect(byId.c.updatedAt).toBe(NOW);
  });

  it("no-op reorder leaves order (and timestamps) untouched", () => {
    const tasks = [makeTask("a", 0), makeTask("b", 1), makeTask("c", 2)];
    const out = reorderTaskList(tasks, ["a", "b", "c"], NOW);
    expect(orderOf(out)).toEqual(["a", "b", "c"]);
    expect(out.every((t) => t.updatedAt === 0)).toBe(true);
  });

  it("ignores completed tasks (they keep their order)", () => {
    const tasks = [makeTask("a", 0), makeTask("done", 5, { done: true }), makeTask("b", 1)];
    const out = reorderTaskList(tasks, ["b", "a"], NOW);
    const done = out.find((t) => t.id === "done")!;
    expect(done.order).toBe(5);
    expect(done.updatedAt).toBe(0);
  });
});

describe("reorderList (habits / notes — whole-list reorder)", () => {
  type Item = { id: string; order?: number; updatedAt: number };
  const item = (id: string, order: number): Item => ({ id, order, updatedAt: 0 });
  const orderOf = (items: Item[]) =>
    [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((i) => i.id);

  it("assigns each item its new position as order", () => {
    const items = [item("a", 0), item("b", 1), item("c", 2)];
    const out = reorderList(items, ["c", "a", "b"], NOW);
    expect(orderOf(out)).toEqual(["c", "a", "b"]);
  });

  it("only bumps updatedAt for items that actually moved", () => {
    const items = [item("a", 0), item("b", 1), item("c", 2)];
    const out = reorderList(items, ["a", "c", "b"], NOW);
    const byId = Object.fromEntries(out.map((i) => [i.id, i]));
    expect(byId.a.updatedAt).toBe(0); // stayed at 0 → not bumped
    expect(byId.b.updatedAt).toBe(NOW);
    expect(byId.c.updatedAt).toBe(NOW);
  });

  it("leaves items not present in orderedIds untouched", () => {
    const items = [item("a", 0), item("b", 1)];
    const out = reorderList(items, ["b", "a"], NOW);
    expect(orderOf(out)).toEqual(["b", "a"]);
  });
});
