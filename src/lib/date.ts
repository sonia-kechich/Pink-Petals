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
  addDays,
  addMonths,
} from "date-fns";
import type { RepeatRule } from "../types";

export const todayKey = (): string => format(new Date(), "yyyy-MM-dd");

export const toKey = (d: Date): string => format(d, "yyyy-MM-dd");

export const prettyDate = (key: string): string =>
  format(parseISO(key), "EEEE, MMMM d");

export const shortDate = (key: string): string =>
  format(parseISO(key), "MMM d, yyyy");

export function dueLabel(key: string): string {
  const diff = differenceInCalendarDays(parseISO(key), new Date());
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return format(parseISO(key), "EEEE");
  return format(parseISO(key), "MMM d");
}

export function isOverdue(key: string): boolean {
  return differenceInCalendarDays(parseISO(key), new Date()) < 0;
}

export function nextOccurrence(fromKey: string, repeat: RepeatRule): string {
  const from = parseISO(fromKey);
  switch (repeat.freq) {
    case "daily":
      return toKey(addDays(from, 1));
    case "monthly":
      return toKey(addMonths(from, 1));
    case "weekly": {
      const days = repeat.weekdays?.length ? [...repeat.weekdays].sort() : null;
      if (!days) return toKey(addDays(from, 7));
      for (let i = 1; i <= 7; i++) {
        const cand = addDays(from, i);
        if (days.includes(cand.getDay())) return toKey(cand);
      }
      return toKey(addDays(from, 7));
    }
    default:
      return fromKey;
  }
}

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

export function currentStreak(log: Record<string, boolean>): number {
  let streak = 0;
  const cursor = new Date();
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
