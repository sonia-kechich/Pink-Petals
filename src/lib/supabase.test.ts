import { describe, expect, it } from "vitest";
import { getSupabase } from "./supabase";

describe("getSupabase (lazy client)", () => {
  it("returns one cached singleton promise across calls (no double-init)", () => {
    // Singleton integrity is the key trap of lazy-loading: every caller — via
    // any import path — must share ONE client. Holds whether or not sync is
    // configured (configured → same in-flight import; unconfigured → same
    // resolved-null), so this assertion is environment-agnostic.
    expect(getSupabase()).toBe(getSupabase());
  });

  it("resolves to a client or null (never throws on access)", async () => {
    const client = await getSupabase();
    expect(client === null || typeof client.auth?.getSession === "function").toBe(true);
  });
});
