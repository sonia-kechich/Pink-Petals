import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerSyncPush } from "./syncPush";
import {
  NOTE_DEBOUNCE_MS,
  cancelNotePush,
  flushAllNotes,
  flushNotePush,
  pendingNoteCount,
  scheduleNotePush,
} from "./noteDebounce";

const schedule = vi.fn();
const flush = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  // Clear any leftover timers from a previous test, then reset spies.
  flushAllNotes();
  schedule.mockReset();
  flush.mockReset();
  registerSyncPush({ schedule, flush });
});

afterEach(() => {
  vi.useRealTimers();
  registerSyncPush(null);
});

describe("noteDebounce", () => {
  it("debounces two notes independently (each fires its own push)", () => {
    scheduleNotePush("a");
    scheduleNotePush("b");
    expect(pendingNoteCount()).toBe(2);
    vi.advanceTimersByTime(NOTE_DEBOUNCE_MS);
    expect(schedule).toHaveBeenCalledTimes(2);
    expect(pendingNoteCount()).toBe(0);
  });

  it("editing a note resets only its own timer", () => {
    scheduleNotePush("a");
    vi.advanceTimersByTime(500);
    scheduleNotePush("a"); // resets a's timer
    scheduleNotePush("b");
    vi.advanceTimersByTime(500); // a=900-since-reset not yet; b=500
    expect(schedule).toHaveBeenCalledTimes(0);
    vi.advanceTimersByTime(NOTE_DEBOUNCE_MS); // both elapse
    expect(schedule).toHaveBeenCalledTimes(2);
  });

  it("flush-on-blur/unmount pushes the pending note immediately and clears it", () => {
    scheduleNotePush("a");
    flushNotePush("a");
    expect(flush).toHaveBeenCalledTimes(1);
    expect(pendingNoteCount()).toBe(0);
    vi.advanceTimersByTime(NOTE_DEBOUNCE_MS);
    expect(schedule).not.toHaveBeenCalled(); // no leaked/late timer
  });

  it("deleting a note clears its timer without pushing", () => {
    scheduleNotePush("a");
    cancelNotePush("a");
    expect(pendingNoteCount()).toBe(0);
    vi.advanceTimersByTime(NOTE_DEBOUNCE_MS);
    expect(schedule).not.toHaveBeenCalled();
    expect(flush).not.toHaveBeenCalled();
  });

  it("flushAllNotes flushes once and clears every pending timer", () => {
    scheduleNotePush("a");
    scheduleNotePush("b");
    flushAllNotes();
    expect(flush).toHaveBeenCalledTimes(1);
    expect(pendingNoteCount()).toBe(0);
  });
});
