import { describe, expect, test } from "vitest";
import { getContentDatabasePublishWarning } from "./content-database-publish-warning";

describe("content database publish warning", () => {
  test("reports bounded files and dynamic resources", () => {
    expect(
      getContentDatabasePublishWarning({
        stats: {
          usedBytes: 500 * 1024,
          maxBytes: 500 * 1024,
          unboundedBytes: 700 * 1024,
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
    ).toEqual({
      includedDocumentCount: 80,
      totalDocumentCount: 100,
      omittedDocumentCount: 20,
      usedKiB: 500,
      maxKiB: 500,
      omissionKind: "size",
      affectedResourceNames: ["Blog overview", "Blog article"],
      affectedResourceKind: "dynamic",
    });
  });

  test("does not warn for a complete database", () => {
    expect(
      getContentDatabasePublishWarning({
        stats: {
          usedBytes: 100,
          maxBytes: 500 * 1024,
          unboundedBytes: 100,
          includedDocumentCount: 5,
          omittedDocumentCount: 0,
          truncated: false,
        },
        potentiallyAffectedResources: [],
        hasDynamicValues: false,
      })
    ).toBeUndefined();
  });

  test("identifies statically affected resources", () => {
    expect(
      getContentDatabasePublishWarning({
        stats: {
          usedBytes: 1025,
          maxBytes: 2048,
          unboundedBytes: 1500,
          includedDocumentCount: 1,
          omittedDocumentCount: 1,
          truncated: true,
        },
        potentiallyAffectedResources: [{ id: "overview", name: "Overview" }],
        hasDynamicValues: false,
      })
    ).toMatchObject({
      usedKiB: 2,
      omissionKind: "unavailable",
      affectedResourceNames: ["Overview"],
      affectedResourceKind: "static",
    });
  });
});
