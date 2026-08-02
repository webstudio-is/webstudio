import { describe, expect, test } from "vitest";
import type { AssetQueryPreviewDiagnostics } from "@webstudio-is/content-engine";
import { getContentDatabaseDiagnosticRows } from "./content-database-diagnostics";

const createDiagnostics = ({
  queryTruncated,
  databaseTruncated,
  queryOmissionReason = queryTruncated ? "size" : undefined,
  databaseOmissionReason = databaseTruncated ? "size" : undefined,
}: {
  queryTruncated: boolean;
  databaseTruncated: boolean;
  queryOmissionReason?: "size" | "unavailable";
  databaseOmissionReason?: "size" | "unavailable";
}): AssetQueryPreviewDiagnostics => ({
  scope: "query-preview",
  query: {
    usedBytes: 20_000,
    maxBytes: 500_000,
    unboundedBytes: 30_000,
    includedDocumentCount: 5,
    omittedDocumentCount: 0,
    ...(queryOmissionReason === undefined
      ? {}
      : { omissionReason: queryOmissionReason }),
    truncated: queryTruncated,
  },
  database: {
    usedBytes: 35_000,
    maxBytes: 500_000,
    unboundedBytes: 600_000,
    includedDocumentCount: 5,
    omittedDocumentCount: 1,
    ...(databaseOmissionReason === undefined
      ? {}
      : { omissionReason: databaseOmissionReason }),
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
        description: expect.stringContaining("after the database limit"),
      },
      {
        label: "Database size",
        value: "35 kB",
        valueColor: "destructive",
        description: expect.stringContaining("published bundle"),
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

  test("does not highlight omissions unrelated to the size limit", () => {
    const [queryRow, databaseRow] = getContentDatabaseDiagnosticRows(
      createDiagnostics({
        queryTruncated: true,
        databaseTruncated: true,
        queryOmissionReason: "unavailable",
        databaseOmissionReason: "unavailable",
      })
    );

    expect(queryRow.valueColor).toBeUndefined();
    expect(databaseRow.valueColor).toBeUndefined();
  });
});
