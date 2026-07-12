/**
 * Arabic catalog — STUB. Same key space as en.ts (enforced by the
 * `Partial<Catalog>` type). Any key left out falls back to English at runtime.
 *
 * Arabic is right-to-left: selecting it flips `dir="rtl"` at the document root
 * (see ../index.tsx → dirForLocale). The layout already uses logical CSS
 * properties in the shell and touched components so RTL mirrors correctly;
 * remaining physical-direction styles are tracked for follow-up.
 *
 * TODO(i18n): translate these strings to ship Arabic. Intentionally empty so we
 * never present un-reviewed machine translation as final copy.
 */
import type { Catalog } from "./en";

export const ar: Partial<Catalog> = {
  // TODO(i18n): fill in Arabic translations, e.g.
  // "nav.today": "اليوم",
};
