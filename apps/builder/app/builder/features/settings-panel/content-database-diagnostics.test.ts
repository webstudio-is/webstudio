import { describe, expect, test } from "vitest";
import {
  getContentDatabaseDiagnosticRows,
  isDatabaseSizeNearLimit,
} from "./content-database-diagnostics";

describe("content database diagnostics", () => {
  test("warns when the database reaches 90% of its limit", () => {
    expect(isDatabaseSizeNearLimit({ usedBytes: 899, maxBytes: 1_000 })).toBe(
      false
    );
    expect(isDatabaseSizeNearLimit({ usedBytes: 900, maxBytes: 1_000 })).toBe(
      true
    );
    expect(isDatabaseSizeNearLimit({ usedBytes: 1_000, maxBytes: 1_000 })).toBe(
      true
    );
  });

  test("shows query and merged published database sizes separately", () => {
    expect(
      getContentDatabaseDiagnosticRows({
        scope: "query-preview",
        query: {
          usedBytes: 20_000,
          maxBytes: 500_000,
          unboundedBytes: 20_000,
          includedDocumentCount: 5,
          omittedDocumentCount: 0,
          truncated: false,
        },
        database: {
          usedBytes: 35_000,
          maxBytes: 500_000,
          unboundedBytes: 600_000,
          includedDocumentCount: 5,
          omittedDocumentCount: 1,
          truncated: true,
        },
      })
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "This query",
          value: "20 kB",
        }),
        expect.objectContaining({
          label: "Published database",
          value: "35 kB",
        }),
        expect.objectContaining({
          label: "Published database full size",
          value: "600 kB",
        }),
      ])
    );
  });
});
