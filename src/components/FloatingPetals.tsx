import { useMemo } from "react";

const PETALS = ["🌸", "🌷", "❀", "✿"];

/**
 * A few soft petals drifting in the background. Deliberately sparse and faint —
 * decoration, never distraction. Hidden when the user prefers reduced motion.
 */
export function FloatingPetals({ count = 7 }: { count?: number }) {
  const petals = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: (i * 100) / count + (i % 2 === 0 ? 4 : -3),
        delay: (i * 13) / count,
        duration: 22 + (i % 5) * 4,
        size: 13 + (i % 4) * 5,
        char: PETALS[i % PETALS.length],
        opacity: 0.16 + (i % 3) * 0.05,
      })),
    [count]
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden motion-reduce:hidden"
    >
      {petals.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 animate-petal-fall select-none"
          style={{
            left: `${p.left}%`,
            fontSize: `${p.size}px`,
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        >
          {p.char}
        </span>
      ))}
    </div>
  );
}
