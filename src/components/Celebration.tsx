import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const PETALS = ["🌸", "🌷", "✨", "❀", "🌸"];

export function Celebration({ trigger }: { trigger: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 1400);
    return () => clearTimeout(t);
  }, [trigger]);

  const pieces = Array.from({ length: 10 }).map((_, i) => {
    const angle = (-90 + (i - 4.5) * 13) * (Math.PI / 180);
    const dist = 90 + (i % 4) * 30;
    return {
      id: i,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - 40,
      char: PETALS[i % PETALS.length],
      rotate: (i % 2 === 0 ? 1 : -1) * (40 + i * 12),
      delay: i * 0.012,
    };
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center motion-reduce:hidden">
      <AnimatePresence>
        {show &&
          pieces.map((p) => (
            <motion.span
              key={`${trigger}-${p.id}`}
              initial={{ opacity: 0, x: 0, y: 0, scale: 0.5, rotate: 0 }}
              animate={{ opacity: [0, 1, 1, 0], x: p.x, y: p.y, scale: 1, rotate: p.rotate }}
              transition={{ duration: 1.2, delay: p.delay, ease: "easeOut" }}
              className="absolute bottom-24 select-none text-xl"
            >
              {p.char}
            </motion.span>
          ))}
      </AnimatePresence>
    </div>
  );
}
