import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, decideSyncApply } from "./schema";
import { migrateSyncDoc } from "./mergeSync";

describe("decideSyncApply", () => {
  it("older remote → migrate", () => {
    expect(decideSyncApply(SCHEMA_VERSION - 1)).toBe("migrate");
  });
  it("legacy doc with no version (0) → migrate", () => {
    expect(decideSyncApply(0)).toBe("migrate");
  });
  it("equal version → apply", () => {
    expect(decideSyncApply(SCHEMA_VERSION)).toBe("apply");
  });
  it("newer remote → skip", () => {
    expect(decideSyncApply(SCHEMA_VERSION + 1)).toBe("skip");
  });
});

describe("migrateSyncDoc", () => {
  it("migrates an older doc forward and backfills fields", () => {
    const raw = {
      schemaVersion: SCHEMA_VERSION - 1,
      tasks: [{ id: "a", title: "x", done: false, focused: false, createdAt: 5, order: 0 }],
    };
    const { status, doc } = migrateSyncDoc(raw);
    expect(status).toBe("migrated");
    expect(doc).not.toBeNull();
    expect(doc!.tasks[0].updatedAt).toBe(5); // backfilled from createdAt
    expect(doc!.focusTotals).toEqual({ ms: 0, sessions: 0 });
    expect(doc!.deletedIds).toEqual({});
    expect(doc!.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("applies an equal-version doc as-is", () => {
    const { status, doc } = migrateSyncDoc({ schemaVersion: SCHEMA_VERSION, tasks: [] });
    expect(status).toBe("applied");
    expect(doc).not.toBeNull();
  });

  it("guards a newer doc: skipped, nothing to apply (local stays intact)", () => {
    const { status, doc } = migrateSyncDoc({ schemaVersion: SCHEMA_VERSION + 1, tasks: [] });
    expect(status).toBe("skipped");
    expect(doc).toBeNull();
  });
});
