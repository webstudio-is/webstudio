import { describe, expect, test } from "vitest";
import { getContentDatabasePublishWarning } from "./content-database-publish-warning";

describe("content database publish warning", () => {
  test("describes bounded files and dynamic resources conservatively", () => {
    expect(
      getContentDatabasePublishWarning({
        stats: {
          usedBytes: 500 * 1024,
          maxBytes: 500 * 1024,
          includedDocumentCount: 80,
          omittedDocumentCount: 20,
          truncated: true,
        },
        potentiallyAffectedResources: [
          { id: "overview", name: "Blog overview" },
          { id: "detail", name: "Blog article" },
        ],
        hasDynamicValues: true,
      })
    ).toBe(
      "The published content database will include 80 of 100 files (500 of 500 KiB). 20 files will be omitted. Queries with route or variable values may be incomplete in: Blog overview, Blog article."
    );
  });

  test("does not warn for a complete database", () => {
    expect(
      getContentDatabasePublishWarning({
        stats: {
          usedBytes: 100,
          maxBytes: 500 * 1024,
          includedDocumentCount: 5,
          omittedDocumentCount: 0,
          truncated: false,
        },
        potentiallyAffectedResources: [],
        hasDynamicValues: false,
      })
    ).toBeUndefined();
  });
});
