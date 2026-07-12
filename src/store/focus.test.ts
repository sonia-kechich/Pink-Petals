import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "./useStore";
import type { FocusSession, TimerState } from "../types";

const MIN = 60_000;

const runningFocus = (startedAgoMs: number, durationSec: number): TimerState => ({
  mode: "focus",
  taskId: undefined,
  running: true,
  startedAt: Date.now() - startedAgoMs,
  baseElapsed: 0,
  duration: durationSec,
});

beforeEach(() => {
  useStore.setState({ tasks: [], sessions: [], focusTotals: { ms: 0, sessions: 0 } });
});

describe("focus lifetime aggregate", () => {
  it("recording a focus session bumps focusTotals", () => {
    useStore.setState({ timer: runningFocus(26 * MIN, 25 * 60) });
    const res = useStore.getState().reconcileTimer();
    expect(res.record).toBe(true);
    expect(useStore.getState().sessions.length).toBe(1);
    expect(useStore.getState().focusTotals.sessions).toBe(1);
    expect(useStore.getState().focusTotals.ms).toBe(25 * MIN); // capped at total
  });

  it("lifetime total survives raw-session trimming (cap = 200)", () => {
    const many: FocusSession[] = Array.from({ length: 200 }, (_, i) => ({
      id: "s" + i,
      startedAt: i,
      minutes: 25,
      mode: "focus",
    }));
    useStore.setState({
      sessions: many,
      focusTotals: { ms: 200 * 25 * MIN, sessions: 200 },
      timer: runningFocus(26 * MIN, 25 * 60),
    });
    useStore.getState().reconcileTimer();
    expect(useStore.getState().sessions.length).toBe(200); // raw array stays capped
    expect(useStore.getState().focusTotals.sessions).toBe(201); // lifetime keeps growing
    expect(useStore.getState().focusTotals.ms).toBe(201 * 25 * MIN);
  });

  it("a clearly-stale reopen records nothing but stops the timer", () => {
    useStore.setState({ timer: runningFocus(3 * 60 * MIN, 25 * 60) }); // 3h gap
    const res = useStore.getState().reconcileTimer();
    expect(res.stale).toBe(true);
    expect(useStore.getState().sessions.length).toBe(0);
    expect(useStore.getState().focusTotals.sessions).toBe(0);
    expect(useStore.getState().timer.running).toBe(false);
  });
});
