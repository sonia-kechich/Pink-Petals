import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, differenceInCalendarDays, getDay, parseISO } from "date-fns";
import { currentStreak, longestStreak, nextOccurrence, toKey } from "./date";

// A fixed "today" so streak math (which reads `new Date()`) is deterministic.
const TODAY = new Date(2026, 5, 29, 12, 0, 0); // Mon Jun 29 2026, local time
const dayKey = (offset: number) => toKey(addDays(TODAY, offset));

describe("currentStreak", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
  });
  afterEach(() => vi.useRealTimers());

  it("is 0 for an empty log", () => {
    expect(currentStreak({})).toBe(0);
  });

  it("is 1 when only today is done", () => {
    expect(currentStreak({ [dayKey(0)]: true })).toBe(1);
  });

  it("counts a consecutive run ending today", () => {
    expect(
      currentStreak({ [dayKey(0)]: true, [dayKey(-1)]: true, [dayKey(-2)]: true })
    ).toBe(3);
  });

  it("a gap breaks the streak", () => {
    // today done, yesterday missing → only today counts
    expect(currentStreak({ [dayKey(0)]: true, [dayKey(-2)]: true })).toBe(1);
  });

  it("today incomplete but yesterday-backward complete still counts (boundary)", () => {
    // today missing, yesterday + day-before done → streak of 2 (today allowed empty)
    expect(currentStreak({ [dayKey(-1)]: true, [dayKey(-2)]: true })).toBe(2);
  });

  it("is 0 when neither today nor yesterday is done", () => {
    expect(currentStreak({ [dayKey(-3)]: true })).toBe(0);
  });
});

describe("longestStreak", () => {
  it("is 0 for an empty log", () => {
    expect(longestStreak({})).toBe(0);
  });

  it("finds the longest run even when it isn't the most recent", () => {
    const log = {
      "2026-01-01": true,
      "2026-01-02": true,
      "2026-01-03": true, // run of 3 (past)
      "2026-03-10": true, // run of 1 (recent)
    };
    expect(longestStreak(log)).toBe(3);
  });

  it("handles multiple equal-length runs", () => {
    const log = {
      "2026-01-01": true,
      "2026-01-02": true, // run of 2
      "2026-02-01": true,
      "2026-02-02": true, // run of 2
    };
    expect(longestStreak(log)).toBe(2);
  });

  it("ignores falsey entries", () => {
    expect(longestStreak({ "2026-01-01": true, "2026-01-02": false })).toBe(1);
  });
});

describe("toKey (replaces Notes' removed local toKeyOf)", () => {
  // The old `toKeyOf(ts)` built `yyyy-mm-dd` from local getFullYear/Month/Date.
  // `toKey(new Date(ts))` (date-fns `format`, local TZ) must match it exactly,
  // including across month/day boundaries.
  const legacyToKeyOf = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  };

  const samples = [
    Date.UTC(2026, 0, 1, 0, 0, 0),
    Date.UTC(2026, 5, 30, 23, 30, 0),
    Date.UTC(2026, 11, 31, 12, 0, 0),
    new Date(2026, 2, 9, 0, 5, 0).getTime(),
    new Date(2026, 2, 9, 23, 55, 0).getTime(),
    0,
  ];

  it("matches the legacy local formatter for the same timestamp", () => {
    for (const ts of samples) {
      expect(toKey(new Date(ts))).toBe(legacyToKeyOf(ts));
    }
  });
});

describe("nextOccurrence", () => {
  it("daily rolls over month and year boundaries", () => {
    expect(nextOccurrence("2026-01-31", { freq: "daily" })).toBe("2026-02-01");
    expect(nextOccurrence("2026-12-31", { freq: "daily" })).toBe("2027-01-01");
  });

  it("daily works for a date already in the past (today-agnostic)", () => {
    expect(nextOccurrence("2020-05-10", { freq: "daily" })).toBe("2020-05-11");
  });

  it("monthly clamps short months and rolls the year", () => {
    expect(nextOccurrence("2026-01-31", { freq: "monthly" })).toBe("2026-02-28");
    expect(nextOccurrence("2026-12-15", { freq: "monthly" })).toBe("2027-01-15");
  });

  it("weekly with no weekdays advances exactly 7 days", () => {
    expect(nextOccurrence("2026-06-29", { freq: "weekly" })).toBe("2026-07-06");
  });

  it("weekly returns the soonest selected weekday strictly after the date", () => {
    const from = "2026-06-29"; // Monday (getDay 1)
    const weekdays = [3, 5]; // Wed, Fri
    const result = nextOccurrence(from, { freq: "weekly", weekdays });
    const diff = differenceInCalendarDays(parseISO(result), parseISO(from));
    expect(diff).toBeGreaterThanOrEqual(1);
    expect(diff).toBeLessThanOrEqual(7);
    expect(weekdays).toContain(getDay(parseISO(result)));
    // soonest: Wednesday Jul 1 is 2 days after Mon Jun 29
    expect(result).toBe("2026-07-01");
  });

  it("none returns the same date", () => {
    expect(nextOccurrence("2026-06-29", { freq: "none" })).toBe("2026-06-29");
  });
});
