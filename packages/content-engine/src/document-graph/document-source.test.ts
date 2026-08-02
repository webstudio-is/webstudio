import { describe, expect, test } from "vitest";
import { assertDocumentSourceIdentity } from "./document-source";

describe("document source", () => {
  test("accepts matching revisions and reports stale source identity", () => {
    const node = {
      id: "post",
      revision: "post-r1",
      contentRef: "content:post",
      format: "json" as const,
    };
    const source = {
      format: "json" as const,
      revision: "post-r1",
      source: '{"title":"Hello"}',
    };

    expect(assertDocumentSourceIdentity({ node, source })).toBe(source);
    expect(() =>
      assertDocumentSourceIdentity({
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
    expect(() =>
      assertDocumentSourceIdentity({
        node,
        source: { ...source, format: "markdown" },
      })
    ).toThrowError(
      expect.objectContaining({
        code: "FORMAT_MISMATCH",
        documentId: "post",
        expectedFormat: "json",
        actualFormat: "markdown",
      })
    );
  });
});
