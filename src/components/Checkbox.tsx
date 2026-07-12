import { Check } from "lucide-react";
import { cn } from "../lib/utils";

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onChange}
      aria-label={label ?? (checked ? "Mark incomplete" : "Mark complete")}
      aria-pressed={checked}
      className={cn(
        "grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors duration-200"
      )}
      style={{
        borderColor: checked ? "var(--accent)" : "var(--border)",
        background: checked ? "var(--accent)" : "transparent",
      }}
    >
      {checked && <Check size={14} strokeWidth={3} color="var(--on-accent)" />}
    </button>
  );
}
