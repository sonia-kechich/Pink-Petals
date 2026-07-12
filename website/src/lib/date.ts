import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameDay,
  parseISO,
  differenceInCalendarDays,
} from "date-fns";

export const todayKey = (): string => format(new Date(), "yyyy-MM-dd");

export const toKey = (d: Date): string => format(d, "yyyy-MM-dd");

export const prettyDate = (key: string): string =>
  format(parseISO(key), "EEEE, MMMM d");

export const shortDate = (key: string): string =>
  format(parseISO(key), "MMM d, yyyy");

/** Full calendar grid (weeks padded) for a given month. */
export function monthGrid(year: number, month: number): Date[] {
  const first = startOfMonth(new Date(year, month, 1));
  const last = endOfMonth(first);
  const gridStart = startOfWeek(first, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(last, { weekStartsOn: 0 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

export function daysInMonthKeys(year: number, month: number): string[] {
  const first = startOfMonth(new Date(year, month, 1));
  const last = endOfMonth(first);
  return eachDayOfInterval({ start: first, end: last }).map(toKey);
}

export { isSameDay, parseISO, differenceInCalendarDays, format };

/** Compute the longest current consecutive-day streak from a log map. */
export function currentStreak(log: Record<string, boolean>): number {
  let streak = 0;
  const cursor = new Date();
  // Allow today to be incomplete without breaking the streak.
  if (!log[toKey(cursor)]) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (log[toKey(cursor)]) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function longestStreak(log: Record<string, boolean>): number {
  const keys = Object.keys(log)
    .filter((k) => log[k])
    .sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of keys) {
    const d = parseISO(k);
    if (prev && differenceInCalendarDays(d, prev) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}
