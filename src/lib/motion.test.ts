import { describe, expect, it } from "vitest";
import { expandMotion, fadeSlide } from "./motion";

describe("expandMotion", () => {
  it("returns a no-motion transition when reduced motion is preferred", () => {
    const m = expandMotion(true);
    expect(m.transition.duration).toBe(0);
    // Final state is still presented (height auto / opacity 1).
    expect(m.animate).toEqual({ height: "auto", opacity: 1 });
  });

  it("animates with a real duration when motion is allowed", () => {
    const m = expandMotion(false);
    expect(m.transition.duration).toBeGreaterThan(0);
    expect(m.transition.ease).toBe("easeOut");
  });

  it("honors a custom duration when motion is allowed", () => {
    expect(expandMotion(false, 0.2).transition.duration).toBe(0.2);
    // ...but still zeroes it when reduced.
    expect(expandMotion(true, 0.2).transition.duration).toBe(0);
  });
});

describe("fadeSlide", () => {
  it("drops the slide offset and zeroes duration when reduced", () => {
    const m = fadeSlide(true);
    expect(m.initial.y).toBe(0);
    expect(m.exit.y).toBe(0);
    expect(m.transition.duration).toBe(0);
  });

  it("keeps the slide offset and a real duration otherwise", () => {
    const m = fadeSlide(false, 8);
    expect(m.initial.y).toBe(8);
    expect(m.transition.duration).toBeGreaterThan(0);
  });
});
