import { describe, expect, it } from "vitest";
import { topOrder } from "./useStore";
import type { Task } from "../types";

const mk = (order: number): Task => ({
  id: String(order),
  title: "t",
  done: false,
  createdAt: 0,
  updatedAt: 0,
  order,
  dateKey: "",
});

describe("topOrder", () => {
  it("returns the 0 sentinel for an empty list (never Infinity)", () => {
    expect(topOrder([])).toBe(0);
    expect(Number.isFinite(topOrder([]))).toBe(true);
  });

  it("returns minOrder - 1 so a new task sorts to the top", () => {
    expect(topOrder([mk(3), mk(1), mk(2)])).toBe(0); // min 1 → 0
    expect(topOrder([mk(-4), mk(10)])).toBe(-5); // min -4 → -5
  });

  it("treats a missing order as 0", () => {
    const noOrder = { ...mk(5), order: undefined as unknown as number };
    expect(topOrder([noOrder])).toBe(-1);
  });

  it("handles a very large array without a call-stack overflow", () => {
    // `Math.min(...arr)` overflows the arg stack around ~1e5 elements; the
    // reduce/loop implementation must not.
    const big = Array.from({ length: 300_000 }, (_, i) => mk(i + 5));
    expect(topOrder(big)).toBe(4); // min 5 → 4
  });
});
