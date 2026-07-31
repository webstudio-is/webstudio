import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import type { ContentDatabasePublishDiagnostics } from "~/services/content-database.server";
import { ContentDatabasePublishWarning } from "./content-database-publish-warning-view";

const renderWarning = (diagnostics: ContentDatabasePublishDiagnostics) =>
  renderToStaticMarkup(
    <ContentDatabasePublishWarning diagnostics={diagnostics} />
  );

describe("ContentDatabasePublishWarning", () => {
  test("explains a size omission using the full database size", () => {
    expect(
      renderWarning({
        stats: {
          format: "webstudio-content-database",
          version: 1,
          revision:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          usedBytes: 21 * 1024,
          maxBytes: 500 * 1024,
          unboundedBytes: 939_661,
          includedDocumentCount: 5,
          omittedDocumentCount: 1,
          omissionReason: "size",
          truncated: true,
        },
        affectedResources: [
          { name: "post", kind: "dynamic" },
          { name: "posts", kind: "static" },
          { name: "featuredPost", kind: "static" },
        ],
      })
    ).toBe(
      "The complete content database is 918 KiB, exceeding the 500 KiB publish limit. Publishing will include 5 of 6 files (21 KiB) and omit 1 file. Resources that may return incomplete results: posts, featuredPost. Resource with route or variable values cannot be checked in advance and may also return incomplete results: post."
    );
  });

  test("explains when required content is unavailable", () => {
    expect(
      renderWarning({
        stats: {
          format: "webstudio-content-database",
          version: 1,
          revision:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          usedBytes: 10 * 1024,
          maxBytes: 500 * 1024,
          unboundedBytes: 10 * 1024,
          includedDocumentCount: 1,
          omittedDocumentCount: 2,
          omissionReason: "unavailable",
          truncated: true,
        },
        affectedResources: [],
      })
    ).toBe(
      "Publishing will include 1 of 3 files (10 KiB) and omit 2 files because their required content is unavailable."
    );
  });
});
