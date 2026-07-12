import { describe, expect, it } from "vitest";
import { translate, dirForLocale, detectLocale } from "./i18n";

describe("translate", () => {
  it("returns the English string for the active locale", () => {
    expect(translate("en", "nav.today")).toBe("Today");
  });

  it("falls back to English when a locale is missing the key (stub catalog)", () => {
    // fr/ar are empty stubs → every key falls back to EN until translated.
    expect(translate("fr", "nav.today")).toBe("Today");
    expect(translate("ar", "settings.title")).toBe("Settings");
  });

  it("interpolates {placeholders}", () => {
    expect(translate("en", "settings.deleteConfirmPrompt", { word: "DELETE" })).toBe(
      "Type DELETE to confirm."
    );
  });

  it("leaves unknown placeholders intact", () => {
    expect(translate("en", "settings.deleteConfirmPrompt")).toBe("Type {word} to confirm.");
  });
});

describe("dirForLocale", () => {
  it("flips to rtl for Arabic", () => {
    expect(dirForLocale("ar")).toBe("rtl");
  });

  it("stays ltr for English and French", () => {
    expect(dirForLocale("en")).toBe("ltr");
    expect(dirForLocale("fr")).toBe("ltr");
  });
});

describe("detectLocale", () => {
  it("prefers a valid stored choice", () => {
    expect(detectLocale("ar", "en-US")).toBe("ar");
  });

  it("falls back to the browser language when nothing is stored", () => {
    expect(detectLocale(null, "fr-FR")).toBe("fr");
  });

  it("defaults to English for unsupported languages", () => {
    expect(detectLocale(null, "de-DE")).toBe("en");
    expect(detectLocale("zz", undefined)).toBe("en");
  });
});
