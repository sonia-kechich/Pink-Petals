import type { Task } from "../types";

/**
 * Filter-aware reorder. `orderedIds` is the new order of whatever subset the
 * user dragged (e.g. only Today's tasks). The dragged items refill their own
 * slots within the full active order, so tasks the view didn't show keep their
 * relative position. Returns a new task array with updated `order` values;
 * only the tasks whose order actually changed get a bumped `updatedAt`.
 */
export function reorderTaskList(
  tasks: Task[],
  orderedIds: string[],
  now: number
): Task[] {
  const idSet = new Set(orderedIds);
  const queue = [...orderedIds];
  const fullOrder = tasks
    .filter((t) => !t.done)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((t) => (idSet.has(t.id) ? queue.shift()! : t.id));
  const rank = new Map(fullOrder.map((id, i) => [id, i]));
  return tasks.map((t) => {
    if (!rank.has(t.id)) return t;
    const order = rank.get(t.id)!;
    return order === t.order ? t : { ...t, order, updatedAt: now };
  });
}

/**
 * Whole-list reorder for collections the user drags in full (habits, notes):
 * `orderedIds` is the complete new order. Assigns each item its position as the
 * new `order`, bumping `updatedAt` only on items whose order actually changed
 * (so sync only re-sends what moved). Items not in `orderedIds` are untouched.
 */
export function reorderList<T extends { id: string; order?: number; updatedAt: number }>(
  items: T[],
  orderedIds: string[],
  now: number
): T[] {
  const rank = new Map(orderedIds.map((id, i) => [id, i]));
  return items.map((it) => {
    const order = rank.get(it.id);
    if (order === undefined) return it;
    return order === it.order ? it : { ...it, order, updatedAt: now };
  });
}
