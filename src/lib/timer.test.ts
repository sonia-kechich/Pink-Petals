import { describe, expect, it } from "vitest";
import { resolveTimerOnResume } from "./timer";

const MIN = 60_000;

describe("resolveTimerOnResume", () => {
  it("records a genuine in-bound session, capped at total", () => {
    const r = resolveTimerOnResume({ lastResumedAt: 0, baseElapsedMs: 0, totalMs: 25 * MIN, now: 26 * MIN });
    expect(r).toEqual({ record: true, recordedMs: 25 * MIN, stale: false });
  });

  it("discards a clearly-stale session when the gap is huge", () => {
    const r = resolveTimerOnResume({ lastResumedAt: 0, baseElapsedMs: 0, totalMs: 25 * MIN, now: 3 * 60 * MIN });
    expect(r).toEqual({ record: false, recordedMs: 0, stale: true });
  });

  it("accumulates focused time across pause/resume segments", () => {
    // 20 min already focused; resumed with 5 min left; reopened 6 min later.
    const r = resolveTimerOnResume({ lastResumedAt: 0, baseElapsedMs: 20 * MIN, totalMs: 25 * MIN, now: 6 * MIN });
    expect(r).toEqual({ record: true, recordedMs: 25 * MIN, stale: false });
  });

  it("keeps running when genuine elapsed is still below total", () => {
    const r = resolveTimerOnResume({ lastResumedAt: 0, baseElapsedMs: 0, totalMs: 25 * MIN, now: 10 * MIN });
    expect(r).toEqual({ record: false, recordedMs: 0, stale: false });
  });

  it("records (not stale) exactly at total — boundary", () => {
    const r = resolveTimerOnResume({ lastResumedAt: 0, baseElapsedMs: 0, totalMs: 25 * MIN, now: 25 * MIN });
    expect(r).toEqual({ record: true, recordedMs: 25 * MIN, stale: false });
  });

  it("records at the edge of the grace window (overshoot == total)", () => {
    // needed 25, overshoot exactly 25 (now = 50 min) → still within grace.
    const r = resolveTimerOnResume({ lastResumedAt: 0, baseElapsedMs: 0, totalMs: 25 * MIN, now: 50 * MIN });
    expect(r).toEqual({ record: true, recordedMs: 25 * MIN, stale: false });
  });
});
