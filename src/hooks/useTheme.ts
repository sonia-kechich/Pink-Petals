import { useEffect } from "react";
import { useStore } from "../store/useStore";
import { setAppIcon } from "../lib/appIcon";

/** Applies the chosen theme to <html> and reacts to system changes. */
export function useTheme() {
  const theme = useStore((s) => s.settings.theme);
  const accentColor = useStore((s) => s.settings.accentColor);

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const isDark = theme === "dark" || (theme === "system" && mq.matches);
      root.classList.toggle("dark", isDark);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", "#241a22");
    };

    apply();
    if (theme === "system") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accentColor);
    setAppIcon(accentColor);
  }, [accentColor]);

  return theme;
}
