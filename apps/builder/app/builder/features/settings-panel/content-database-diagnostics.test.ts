import { describe, expect, test } from "vitest";
import type { AssetQueryPreviewDiagnostics } from "@webstudio-is/content-engine";
import { getContentDatabaseDiagnosticRows } from "./content-database-diagnostics";

const createDiagnostics = ({
  queryTruncated,
  databaseTruncated,
}: {
  queryTruncated: boolean;
  databaseTruncated: boolean;
}): AssetQueryPreviewDiagnostics => ({
  scope: "query-preview",
  query: {
    usedBytes: 20_000,
    maxBytes: 500_000,
    unboundedBytes: 20_000,
    includedDocumentCount: 5,
    omittedDocumentCount: 0,
    truncated: queryTruncated,
  },
  database: {
    usedBytes: 35_000,
    maxBytes: 500_000,
    unboundedBytes: 600_000,
    includedDocumentCount: 5,
    omittedDocumentCount: 1,
    truncated: databaseTruncated,
  },
});

describe("content database diagnostics", () => {
  test("highlights only sizes that exceed the limit", () => {
    expect(
      getContentDatabaseDiagnosticRows(
        createDiagnostics({
          queryTruncated: false,
          databaseTruncated: true,
        })
      )
    ).toEqual([
      {
        label: "Query size",
        value: "20 kB",
        valueColor: undefined,
        description: expect.stringContaining("before the database limit"),
      },
      {
        label: "Database size",
        value: "600 kB",
        valueColor: "destructive",
        description: expect.stringContaining("before the database limit"),
      },
    ]);
  });

  test("uses the corresponding truncation state for each size", () => {
    const [queryRow, databaseRow] = getContentDatabaseDiagnosticRows(
      createDiagnostics({
        queryTruncated: true,
        databaseTruncated: false,
      })
    );

    expect(queryRow.valueColor).toBe("destructive");
    expect(databaseRow.valueColor).toBeUndefined();
  });
});
