import { describe, expect, it } from "vitest";
import { supabase } from "./supabase";

describe("supabase client", () => {
  it("is either a SupabaseClient or null (never throws)", () => {
    expect(supabase === null || typeof supabase?.auth?.getSession === "function").toBe(true);
  });
});
