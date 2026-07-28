import { describe, expect, test } from "vitest";
import { stripResourceDiagnostics } from "./resource-diagnostics";

describe("resource diagnostics", () => {
  test("keeps diagnostics outside of the binding-visible resource value", () => {
    const separated = stripResourceDiagnostics({
      ok: true,
      data: { post: { id: "post" } },
      meta: { totalCount: 1, hasMore: false },
      __diagnostics__: {
        scope: "query-preview",
        usedBytes: 100,
        maxBytes: 500,
        unboundedBytes: 700,
        includedDocumentCount: 80,
        omittedDocumentCount: 20,
        truncated: true,
      },
    });

    expect(separated.result).toEqual({
      ok: true,
      data: { post: { id: "post" } },
      meta: { totalCount: 1, hasMore: false },
    });
    expect(separated.result).not.toHaveProperty("__diagnostics__");
    expect(separated.diagnostics).toMatchObject({
      includedDocumentCount: 80,
      omittedDocumentCount: 20,
      truncated: true,
    });
  });

  test("strips malformed diagnostics instead of exposing them", () => {
    const separated = stripResourceDiagnostics({
      data: { items: [] },
      __diagnostics__: { truncated: "yes" },
    });

    expect(separated.result).toEqual({ data: { items: [] } });
    expect(separated.diagnostics).toBeUndefined();
  });
});
