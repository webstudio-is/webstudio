import { describe, expect, test } from "vitest";
import { getContentDatabasePreviewWarning } from "./content-database-warning";

const revision = `sha256:${"a".repeat(64)}`;

describe("content database preview warning", () => {
  test("describes exactly how many files fit in a truncated database", () => {
    expect(
      getContentDatabasePreviewWarning({
        data: {
          items: [],
          totalCount: 0,
          hasMore: false,
          database: {
            format: "webstudio-content-database",
            version: 1,
            revision,
            usedBytes: 500 * 1024,
            maxBytes: 500 * 1024,
            unboundedBytes: 700 * 1024,
            includedDocumentCount: 80,
            omittedDocumentCount: 20,
            truncated: true,
          },
        },
      })
    ).toBe(
      "The content database includes 80 of 100 files within the 500 KiB limit. Published query results may omit 20 files."
    );
  });

  test("ignores complete and unrelated resource responses", () => {
    expect(
      getContentDatabasePreviewWarning({
        data: {
          items: [],
          totalCount: 0,
          hasMore: false,
          database: {
            format: "webstudio-content-database",
            version: 1,
            revision,
            usedBytes: 100,
            maxBytes: 500,
            unboundedBytes: 100,
            includedDocumentCount: 1,
            omittedDocumentCount: 0,
            truncated: false,
          },
        },
      })
    ).toBeUndefined();
    expect(getContentDatabasePreviewWarning({ data: "other" })).toBeUndefined();
  });
});
