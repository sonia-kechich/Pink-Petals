/**
 * Lightweight i18n layer — a tiny React context, NO external dependency.
 *
 * Why custom over react-i18next: the app needs key lookup, EN fallback, simple
 * interpolation, and RTL — that's ~80 lines. Pulling in i18next + plugins would
 * add weight and ceremony for no current benefit. If pluralization/ICU/lazy
 * namespaces are needed later, this can be swapped behind the same `useI18n()`.
 *
 * - EN is the source of truth (locales/en.ts). FR/AR are stubs that fall back
 *   to EN per-key, so missing translations never show a raw key.
 * - The chosen locale is persisted in its OWN localStorage key (NOT the synced
 *   doc), so language is a per-device preference and the cloud SyncData shape is
 *   untouched.
 * - `dir` is derived from the locale (ar → rtl) and applied at <html>.
 *
 * Pure helpers (translate / dirForLocale / detectLocale) are exported for unit
 * tests; the provider/hook wire them into React.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { en, type Catalog, type TranslationKey } from "./locales/en";
import { fr } from "./locales/fr";
import { ar } from "./locales/ar";

export type Locale = "en" | "fr" | "ar";

export const LOCALES: { id: Locale; label: string }[] = [
  { id: "en", label: "English" },
  { id: "fr", label: "Français" },
  { id: "ar", label: "العربية" },
];

const CATALOGS: Record<Locale, Partial<Catalog>> = { en, fr, ar };

const STORAGE_KEY = "pp-locale";

export type Dir = "ltr" | "rtl";

/** RTL for Arabic; LTR for everything else. */
export function dirForLocale(locale: Locale): Dir {
  return locale === "ar" ? "rtl" : "ltr";
}

/** Resolve a string for `key` in `locale`, falling back to English, then to the
 *  key itself. `vars` fills `{name}` placeholders. Pure. */
export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>
): string {
  const fromLocale = CATALOGS[locale]?.[key];
  // Treat an empty stub as "missing" so it falls back to English.
  const template = fromLocale && fromLocale.length > 0 ? fromLocale : en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`
  );
}

function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "fr" || value === "ar";
}

/** Pick the initial locale: stored choice → browser language → English. */
export function detectLocale(
  stored: string | null,
  navigatorLang: string | undefined
): Locale {
  if (isLocale(stored)) return stored;
  const lang = (navigatorLang ?? "").slice(0, 2).toLowerCase();
  return isLocale(lang) ? lang : "en";
}

function readStoredLocale(): Locale {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    /* storage may be unavailable (private mode) — fall back to detection */
  }
  const nav =
    typeof navigator !== "undefined" ? navigator.language : undefined;
  return detectLocale(stored, nav);
}

export interface I18nContextValue {
  locale: Locale;
  dir: Dir;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale());

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore persistence failure — choice still applies for this session */
    }
  }, []);

  const dir = dirForLocale(locale);

  // Drive document direction + language from the active locale.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("lang", locale);
    root.setAttribute("dir", dir);
  }, [locale, dir]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dir,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
    }),
    [locale, dir, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}

/** Convenience: the `t` function alone. */
export function useT() {
  return useI18n().t;
}

export type { TranslationKey };
