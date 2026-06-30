import { type ReactNode } from "react";
import { Card } from "./Card";
import { Checkbox } from "./Checkbox";
import { useStore } from "../store/useStore";
import type { Task } from "../types";

/**
 * Shared task row: the Card + completion Checkbox + title that's duplicated
 * between the Tasks page (`TaskRow`) and the Today dashboard (`TodayTaskCard`).
 *
 * The two call sites differ in real ways, so those differences are EXPLICIT
 * props rather than silently homogenized:
 *   • `wrap`      — Today wraps long titles (`break-words`); Tasks truncates.
 *   • `details`   — Tasks renders description + due/repeat badges under the
 *                   title (wrapped in the flex-1 column); Today renders none.
 *   • `endSlot`   — Today shows a right-aligned overdue badge; Tasks shows the
 *                   focus + delete buttons.
 *
 * When `details` is omitted the title sits directly in the Card as the flex-1
 * child (Today's exact original DOM); when present, title + details share a
 * `min-w-0 flex-1` column (Tasks' exact original DOM). The Checkbox + its
 * "celebrate then toggle" handler are identical in both and live here once.
 */
export function TaskItem({
  task,
  onComplete,
  cardClassName,
  wrap = false,
  details,
  endSlot,
  onTitleClick,
}: {
  task: Task;
  onComplete: () => void;
  cardClassName: string;
  wrap?: boolean;
  details?: ReactNode;
  endSlot?: ReactNode;
  /** When provided, the title becomes a button (e.g. tap-to-edit on Tasks). */
  onTitleClick?: () => void;
}) {
  const toggleTask = useStore((s) => s.toggleTask);

  const onToggle = () => {
    if (!task.done) onComplete();
    toggleTask(task.id);
  };

  const titleStyle = {
    color: task.done ? "var(--text-muted)" : "var(--text)",
    textDecoration: task.done ? "line-through" : "none",
  } as const;
  const titleFlow = wrap ? "break-words" : "truncate";
  const hasDetails = details !== undefined;
  // When there's no details column the title is itself the flex-1 child
  // (Today's exact original layout); otherwise it sits inside the flex-1 column.
  const titleBase = hasDetails ? "block" : "min-w-0 flex-1 block";

  const title = onTitleClick ? (
    <button
      type="button"
      onClick={onTitleClick}
      aria-label={`Edit task: ${task.title}`}
      className={`${titleBase} ${titleFlow} text-left text-[15px]`}
      style={titleStyle}
    >
      {task.title}
    </button>
  ) : (
    <span className={`${titleBase} ${titleFlow} text-[15px]`} style={titleStyle}>
      {task.title}
    </span>
  );

  return (
    <Card className={cardClassName}>
      <Checkbox checked={task.done} onChange={onToggle} />
      {hasDetails ? (
        <div className="min-w-0 flex-1">
          {title}
          {details}
        </div>
      ) : (
        title
      )}
      {endSlot}
    </Card>
  );
}
