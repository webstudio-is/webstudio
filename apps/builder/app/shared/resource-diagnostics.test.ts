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
          query: {
            usedBytes: 100,
            maxBytes: 500,
            unboundedBytes: 100,
            includedDocumentCount: 1,
            omittedDocumentCount: 0,
            truncated: false,
          },
          database: {
            usedBytes: 500,
            maxBytes: 500,
            unboundedBytes: 700,
            includedDocumentCount: 80,
            omittedDocumentCount: 20,
            truncated: true,
          },
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
      query: { includedDocumentCount: 1, truncated: false },
      database: {
        includedDocumentCount: 80,
        omittedDocumentCount: 20,
        truncated: true,
      },
    });
  });

  test("returns every schema issue for malformed diagnostics", () => {
    const separated = separateResourceDiagnostics({
      request: assetsRequest,
      result: {
        data: { items: [] },
        __diagnostics__: {
          scope: "other",
          query: {
            usedBytes: "large",
            maxBytes: 500,
            unboundedBytes: 100,
            includedDocumentCount: 1,
            omittedDocumentCount: 0,
            truncated: false,
          },
          database: {
            usedBytes: 500,
            maxBytes: 500,
            unboundedBytes: 500,
            includedDocumentCount: 1,
            omittedDocumentCount: 0,
            truncated: false,
          },
        },
      },
    });

    expect(separated.result).toEqual({ data: { items: [] } });
    expect(separated.diagnostics).toBeUndefined();
    expect(separated.diagnosticsError).toMatchObject({
      ok: false,
      status: 500,
      data: {
        error: {
          code: "INVALID_DIAGNOSTICS_RESPONSE",
          message: "Resource diagnostics response is invalid",
          retryable: true,
        },
      },
    });
    expect(
      separated.diagnosticsError?.data.error.details.issues.map(
        ({ path }) => path
      )
    ).toEqual([
      ["__diagnostics__", "scope"],
      ["__diagnostics__", "query", "usedBytes"],
    ]);
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

  test("keeps Builder performance metrics outside resource values", () => {
    const separated = separateResourceDiagnostics({
      request: { ...assetsRequest, name: "API", url: "/api/items" },
      result: {
        ok: true,
        data: { items: [] },
        __performance__: {
          serverDurationMs: 125.5,
          loaderDurationMs: 150.25,
          responseBytes: 1024,
        },
      },
    });

    expect(separated.result).toEqual({ ok: true, data: { items: [] } });
    expect(separated.result).not.toHaveProperty("__performance__");
    expect(separated.performance).toEqual({
      serverDurationMs: 125.5,
      loaderDurationMs: 150.25,
      responseBytes: 1024,
    });
  });

  test("strips malformed Builder performance metrics", () => {
    const separated = separateResourceDiagnostics({
      request: assetsRequest,
      result: {
        data: { items: [] },
        __performance__: { serverDurationMs: "slow" },
      },
    });

    expect(separated.result).toEqual({ data: { items: [] } });
    expect(separated.performance).toBeUndefined();
  });

  test("preserves known performance metrics when the server adds fields", () => {
    const separated = separateResourceDiagnostics({
      request: assetsRequest,
      result: {
        data: { items: [] },
        __performance__: {
          serverDurationMs: 125.5,
          futureMetric: 10,
          assetQuery: {
            futureMetric: 20,
            phases: {
              buildPlan: 30,
              futurePhase: 40,
            },
          },
        },
      },
    });

    expect(separated.performance).toEqual({
      serverDurationMs: 125.5,
      assetQuery: {
        phases: { buildPlan: 30 },
      },
    });
  });
});
