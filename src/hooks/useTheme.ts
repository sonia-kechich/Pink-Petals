import { useEffect } from "react";

export function useTheme() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    root.setAttribute("data-accent", "pink");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", "#241a22");
  }, []);
}
