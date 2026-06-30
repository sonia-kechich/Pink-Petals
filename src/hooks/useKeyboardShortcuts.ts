import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const ROUTES: Record<string, string> = {
  "1": "/",
  "2": "/tasks",
  "3": "/habits",
  "4": "/notes",
  "5": "/timer",
  "6": "/settings",
};

function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export function useKeyboardShortcuts(): void {
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (isTyping()) return;
      const to = ROUTES[e.key];
      if (to) {
        e.preventDefault();
        navigate(to);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);
}
