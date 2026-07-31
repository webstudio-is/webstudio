import { describe, expect, test } from "vitest";
import { assertDocumentSourceRevision } from "./document-source";

describe("document source", () => {
  test("accepts matching revisions and reports stale source identity", () => {
    const node = {
      id: "post",
      revision: "post-r1",
      contentRef: "content:post",
    };
    const source = {
      format: "json" as const,
      revision: "post-r1",
      source: '{"title":"Hello"}',
    };

    expect(assertDocumentSourceRevision({ node, source })).toBe(source);
    expect(() =>
      assertDocumentSourceRevision({
        node,
        source: { ...source, revision: "stale-r1" },
      })
    ).toThrowError(
      expect.objectContaining({
        code: "REVISION_MISMATCH",
        documentId: "post",
        expectedRevision: "post-r1",
        actualRevision: "stale-r1",
      })
    );
  });
});
