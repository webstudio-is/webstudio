import { describe, expect, test } from "vitest";
import type { ResourceRequest } from "@webstudio-is/sdk";
import { separateResourceDiagnostics } from "./resource-diagnostics";

const assetsRequest: ResourceRequest = {
  name: "assets",
  url: "/$resources/assets",
  method: "post",
  searchParams: [],
  headers: [],
};

describe("resource diagnostics", () => {
  test("keeps diagnostics outside of the binding-visible resource value", () => {
    const separated = separateResourceDiagnostics({
      request: assetsRequest,
      result: {
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
    const separated = separateResourceDiagnostics({
      request: assetsRequest,
      result: {
        data: { items: [] },
        __diagnostics__: { truncated: "yes" },
      },
    });

    expect(separated.result).toEqual({ data: { items: [] } });
    expect(separated.diagnostics).toBeUndefined();
  });

  test("preserves diagnostics fields returned by ordinary APIs", () => {
    const result = {
      data: { items: [] },
      __diagnostics__: { provider: "example" },
    };
    expect(
      separateResourceDiagnostics({
        request: { ...assetsRequest, name: "API", url: "/api/items" },
        result,
      })
    ).toEqual({ result, diagnostics: undefined });
  });
});
