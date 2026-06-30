import { type CSSProperties, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

// Activation tuned per input type for reliability + a natural feel:
//   • TOUCH → long-press: hold ~220ms before drag begins, so a normal swipe
//     scrolls the page and only a deliberate hold picks a card up. Moving past
//     the tolerance during the hold cancels activation (→ treated as a scroll).
//   • MOUSE → press and move ~6px to drag (no awkward hold on desktop); a plain
//     click still selects/edits because it never crosses the distance threshold.
// A single PointerSensor handles touch poorly in mobile WebViews (scroll steals
// the gesture / activation is flaky), which is why touch + mouse are split.
const TOUCH_DELAY_MS = 220;
const TOUCH_TOLERANCE_PX = 8;
const MOUSE_DISTANCE_PX = 6;

/**
 * Drag-to-reorder for any list of `{ id }` items, built on @dnd-kit.
 *
 *  • Whole row/card is the drag target — no handle.
 *  • Touch: press & hold ~220ms to pick up; mouse: press and drag 6px. Taps,
 *    clicks, checkboxes, buttons and scrolling all keep working untouched.
 *  • Mouse / touch / stylus via dedicated sensors; keyboard via KeyboardSensor
 *    (focus a row → Space/Enter to pick up → arrows to move → Space/Enter to
 *    drop → Escape to cancel). @dnd-kit announces changes via an ARIA live region.
 *  • Auto-scrolls near the top/bottom edges while dragging (built in).
 *  • `layout="list"` (default) is a vertical list locked to the Y axis;
 *    `layout="grid"` is a free-moving 2-D grid (used by the habit grid).
 *  • On drop, `onReorder` gets the new id order to persist; cancel/Escape/drop
 *    outside leave the order untouched (item returns to its place).
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  className,
  layout = "list",
}: {
  items: T[];
  onReorder: (orderedIds: string[]) => void;
  renderItem: (item: T) => ReactNode;
  className?: string;
  layout?: "list" | "grid";
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: MOUSE_DISTANCE_PX },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: TOUCH_DELAY_MS, tolerance: TOUCH_TOLERANCE_PX },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const ids = items.map((i) => i.id);
  const isGrid = layout === "grid";
  const containerClass = className ?? (isGrid ? "" : "flex flex-col gap-2.5");

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      // Lists are constrained to vertical movement; grids move freely in 2-D.
      modifiers={isGrid ? undefined : [restrictToVerticalAxis]}
      onDragStart={() => {
        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          navigator.vibrate(30); // light haptic on pick-up (supported mobiles)
        }
      }}
      onDragEnd={({ active, over }) => {
        if (over && active.id !== over.id) {
          const oldI = ids.indexOf(String(active.id));
          const newI = ids.indexOf(String(over.id));
          if (oldI !== -1 && newI !== -1) onReorder(arrayMove(ids, oldI, newI));
        }
      }}
    >
      <SortableContext
        items={ids}
        strategy={isGrid ? rectSortingStrategy : verticalListSortingStrategy}
      >
        <div className={containerClass}>
          {items.map((item) => (
            <SortableRow key={item.id} id={item.id}>
              {renderItem(item)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ id, children }: { id: string; children: ReactNode }) {
  // Reduced motion: drop the reposition tween + the pick-up scale flourish, but
  // keep drag-and-drop fully functional (items still move to their new place).
  const reduce = !!useReducedMotion();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    transition: reduce ? null : { duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" },
  });

  const style: CSSProperties = {
    transform: transform
      ? `${CSS.Transform.toString(transform)}${isDragging && !reduce ? " scale(1.03)" : ""}`
      : undefined,
    transition: reduce ? undefined : transition,
    zIndex: isDragging ? 50 : undefined,
    position: "relative",
    borderRadius: isDragging ? "1.5rem" : undefined,
    boxShadow: isDragging ? "0 16px 40px rgba(150, 90, 120, 0.28)" : undefined,
    touchAction: "manipulation", // allow scroll/tap before activation; don't block it
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab select-none active:cursor-grabbing"
    >
      {children}
    </div>
  );
}
