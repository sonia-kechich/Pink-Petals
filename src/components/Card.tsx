import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export function Card({
  children,
  className,
  onClick,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  [key: string]: any;
}) {
  return (
    <div
      onClick={onClick}
      className={cn("card p-4", onClick && "cursor-pointer", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-5">
      <h1 className="heading text-2xl" style={{ color: "var(--text)" }}>
        {title}
      </h1>
      {subtitle && <p className="muted mt-0.5 text-sm">{subtitle}</p>}
    </header>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-16 text-center">
      <p className="heading text-lg" style={{ color: "var(--text)" }}>
        {title}
      </p>
      {hint && <p className="muted max-w-[18rem] text-sm">{hint}</p>}
    </div>
  );
}
