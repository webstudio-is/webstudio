import { describe, expect, test } from "vitest";
import { getContentDatabaseDiagnosticRows } from "./content-database-diagnostics";

describe("content database diagnostics", () => {
  test("shows only unbounded sizes with an explanation", () => {
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
    ).toEqual([
      {
        label: "This query full size",
        value: "20 kB",
        valueColor: "destructive",
        description: expect.stringContaining("before the database limit"),
      },
      {
        label: "Published database full size",
        value: "600 kB",
        valueColor: "destructive",
        description: expect.stringContaining("before the database limit"),
      },
    ]);
  });
});
