/**
 * French catalog — STUB. Same key space as en.ts (enforced by the
 * `Partial<Catalog>` type). Any key left out falls back to English at runtime.
 *
 * TODO(i18n): translate these strings to ship French. This is intentionally
 * empty so we never present un-reviewed machine translation as final copy —
 * until a key is filled in here, the English value is shown.
 */
import type { Catalog } from "./en";

export const fr: Partial<Catalog> = {
  // TODO(i18n): fill in French translations, e.g.
  // "nav.today": "Aujourd'hui",
};
