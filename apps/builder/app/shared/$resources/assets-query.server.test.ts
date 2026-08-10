import { beforeEach, describe, expect, test, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  AssetIndexRevisionError,
  AssetQueryExecutionError,
} from "@webstudio-is/content-engine";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import { executeAssetQueries, executeAssetQuery } from "./assets-query.server";

const projectId = "090e6e14-ae50-4b2e-bd22-71733cec05bb";
const dependencies = {
  authorizeApiProject: vi.fn(),
  previewProjectAssetQueries: vi.fn(),
  previewProjectAssetQuery: vi.fn(),
  preventCrossOriginCookie: vi.fn(),
};
const outerRequest = () =>
  new Request(`https://p-${projectId}.localhost/rest/resources-loader`);
const innerRequest = (body: unknown) =>
  new Request(`https://p-${projectId}.localhost/$resources/assets`, {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("configured Assets system resource", () => {
  beforeEach(() => {
    dependencies.authorizeApiProject.mockReset();
    dependencies.authorizeApiProject.mockResolvedValue({} as never);
    dependencies.previewProjectAssetQueries.mockReset();
    dependencies.previewProjectAssetQuery.mockReset();
    dependencies.preventCrossOriginCookie.mockReset();
  });

  test("batches valid queries while isolating malformed and stale requests", async () => {
    const first = {
      data: { items: [{ id: "tools" }], totalCount: 1, hasMore: false },
    };
    const last = {
      data: { items: [{ id: "updates" }], totalCount: 1, hasMore: false },
    };
    dependencies.previewProjectAssetQueries.mockImplementation(
      async ({ onPerformanceEvent, onDocumentGraphEvent }) => {
        onPerformanceEvent?.({
          type: "phase-completed",
          phase: "build-plan",
          durationMs: 20,
        });
        onPerformanceEvent?.({
          type: "compilation-cache",
          status: "miss",
        });
        onPerformanceEvent?.({
          type: "phase-completed",
          phase: "document-graph",
          durationMs: 30,
        });
        onPerformanceEvent?.({
          type: "phase-completed",
          phase: "diagnostics-preparation",
          durationMs: 40,
        });
        onPerformanceEvent?.({
          type: "content-read",
          purpose: "compiler-entry",
          byteLength: 1000,
        });
        onPerformanceEvent?.({
          type: "content-read",
          purpose: "document-graph",
          byteLength: 750,
        });
        onDocumentGraphEvent?.({
          type: "resolution-started",
          rootCount: 1,
          documentCount: 2,
        });
        onDocumentGraphEvent?.({
          type: "document-fetch-started",
          documentId: "post",
          revision: "revision",
        });
        return [
          { status: "fulfilled", value: first },
          { status: "rejected", reason: new AssetIndexRevisionError() },
          { status: "fulfilled", value: last },
        ];
      }
    );
    const controller = new AbortController();
    const requests = [
      innerRequest({ query: { limit: 1 } }),
      new Request(`https://p-${projectId}.localhost/$resources/assets`, {
        method: "POST",
        body: "{",
      }),
      innerRequest({ query: { offset: 1 } }),
      innerRequest({ query: { offset: 2 } }),
    ];

    const responses = await executeAssetQueries(
      {
        request: new Request(outerRequest(), { signal: controller.signal }),
        resourceRequests: requests,
      },
      dependencies
    );

    expect(responses.map(({ status }) => status)).toEqual([200, 400, 409, 200]);
    await expect(responses[0].json()).resolves.toEqual({
      ...first,
      __performance__: {
        assetQuery: {
          phases: {
            authorization: expect.any(Number),
            buildPlan: 20,
            documentGraph: 30,
            diagnosticsPreparation: 40,
          },
          compilationCache: "miss",
          resolvedDocumentCount: 2,
          documentFetchCount: 1,
          compilerContentFetchCount: 1,
          compilerContentBytes: 1000,
          documentGraphContentFetchCount: 1,
          documentGraphContentBytes: 750,
        },
      },
    });
    await expect(responses[1].json()).resolves.toMatchObject({
      ok: false,
      error: { code: "INVALID_REQUEST" },
    });
    await expect(responses[2].json()).resolves.toMatchObject({
      ok: false,
      error: { code: "STALE_INDEX" },
    });
    await expect(responses[3].json()).resolves.toEqual({
      ...last,
      __performance__: expect.any(Object),
    });
    expect(dependencies.preventCrossOriginCookie).toHaveBeenCalledOnce();
    expect(dependencies.authorizeApiProject).toHaveBeenCalledOnce();
    expect(dependencies.previewProjectAssetQueries).toHaveBeenCalledWith({
      projectId,
      requests: [
        expect.objectContaining({
          query: expect.objectContaining({ limit: 1 }),
        }),
        expect.objectContaining({
          query: expect.objectContaining({ offset: 1 }),
        }),
        expect.objectContaining({
          query: expect.objectContaining({ offset: 2 }),
        }),
      ],
      context: expect.anything(),
      signal: expect.any(AbortSignal),
      onPerformanceEvent: expect.any(Function),
      onDocumentGraphEvent: expect.any(Function),
    });
  });

  test("stops an already-cancelled batch before authorization", async () => {
    dependencies.previewProjectAssetQueries.mockResolvedValue([
      {
        status: "fulfilled",
        value: { data: { items: [], totalCount: 0, hasMore: false } },
      },
    ]);
    const controller = new AbortController();
    controller.abort();

    const responses = await executeAssetQueries(
      {
        request: new Request(outerRequest(), { signal: controller.signal }),
        resourceRequests: [innerRequest({ query: {} })],
      },
      dependencies
    );

    expect(responses.map(({ status }) => status)).toEqual([499]);
    expect(dependencies.authorizeApiProject).not.toHaveBeenCalled();
    expect(dependencies.previewProjectAssetQueries).not.toHaveBeenCalled();
  });

  test("uses the outer authentication context and typed inner request", async () => {
    const responseBody = {
      data: {
        items: [{ id: "post-1" }],
        totalCount: 1,
        hasMore: false,
      },
      __diagnostics__: {
        scope: "query-preview",
        query: {
          usedBytes: 100,
          maxBytes: 512_000,
          unboundedBytes: 100,
          includedDocumentCount: 1,
          omittedDocumentCount: 0,
          truncated: false,
        },
        database: {
          usedBytes: 200,
          maxBytes: 512_000,
          unboundedBytes: 200,
          includedDocumentCount: 2,
          omittedDocumentCount: 0,
          truncated: false,
        },
      },
    };
    dependencies.previewProjectAssetQueries.mockResolvedValue([
      { status: "fulfilled", value: responseBody },
    ]);
    const query = {
      where: {
        all: [
          {
            field: ["properties", "draft"],
            operator: "ne",
            value: true,
          },
        ],
      },
      limit: 20,
    };

    const response = await executeAssetQuery(
      {
        request: outerRequest(),
        resourceRequest: innerRequest({ query }),
        includeDiagnostics: false,
      },
      dependencies
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ...responseBody,
      __performance__: {
        assetQuery: {
          phases: { authorization: expect.any(Number) },
          compilerContentFetchCount: 0,
          compilerContentBytes: 0,
          documentGraphContentFetchCount: 0,
          documentGraphContentBytes: 0,
        },
      },
    });
    expect(dependencies.authorizeApiProject).toHaveBeenCalledWith(
      expect.any(Request),
      projectId,
      "view"
    );
    expect(dependencies.previewProjectAssetQueries).toHaveBeenCalledWith({
      projectId,
      requests: [
        {
          query: expect.objectContaining({
            ...query,
            sort: [],
            offset: 0,
            content: { mode: "none" },
          }),
        },
      ],
      context: expect.anything(),
      signal: expect.any(AbortSignal),
      onPerformanceEvent: expect.any(Function),
      onDocumentGraphEvent: expect.any(Function),
    });
  });

  test("includes detailed diagnostics when explicitly requested", async () => {
    dependencies.previewProjectAssetQuery.mockResolvedValue({
      data: { items: [], totalCount: 0, hasMore: false },
    });
    await executeAssetQuery(
      {
        request: outerRequest(),
        resourceRequest: innerRequest({ query: {} }),
        includeDiagnostics: true,
      },
      dependencies
    );

    expect(dependencies.previewProjectAssetQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        includeDiagnostics: true,
        includeUnresolvedDiagnostics: true,
      })
    );
  });

  test("supports the public REST URL with an explicit project", async () => {
    dependencies.previewProjectAssetQuery.mockResolvedValue({
      data: { items: [], totalCount: 0, hasMore: false },
      __diagnostics__: {
        scope: "query-preview",
        query: {
          usedBytes: 100,
          maxBytes: 512_000,
          unboundedBytes: 100,
          includedDocumentCount: 0,
          omittedDocumentCount: 0,
          truncated: false,
        },
        database: {
          usedBytes: 100,
          maxBytes: 512_000,
          unboundedBytes: 100,
          includedDocumentCount: 0,
          omittedDocumentCount: 0,
          truncated: false,
        },
      },
    });
    const request = new Request(
      `https://api.example/rest/assets/query?projectId=${projectId}`,
      { method: "POST", body: JSON.stringify({ query: {} }) }
    );

    const response = await executeAssetQuery(
      { request, resourceRequest: request.clone() },
      dependencies
    );

    expect(response.status).toBe(200);
    expect(dependencies.authorizeApiProject).toHaveBeenCalledWith(
      request,
      projectId,
      "view"
    );
    expect(dependencies.previewProjectAssetQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        includeDiagnostics: true,
        includeUnresolvedDiagnostics: true,
      })
    );
  });

  test("returns structured invalid-request and forbidden failures", async () => {
    const invalid = await executeAssetQuery(
      {
        request: outerRequest(),
        resourceRequest: innerRequest({ query: { limit: -1 } }),
      },
      dependencies
    );
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "INVALID_REQUEST" },
    });

    dependencies.previewProjectAssetQuery.mockRejectedValue(
      new AuthorizationError("denied")
    );
    const forbidden = await executeAssetQuery(
      { request: outerRequest(), resourceRequest: innerRequest({ query: {} }) },
      dependencies
    );
    expect(forbidden.status).toBe(403);
    await expect(forbidden.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });

  test("preserves authentication and CSRF response statuses", async () => {
    dependencies.authorizeApiProject.mockRejectedValueOnce(
      new TRPCError({ code: "UNAUTHORIZED", message: "token required" })
    );
    const unauthorized = await executeAssetQuery(
      { request: outerRequest(), resourceRequest: innerRequest({ query: {} }) },
      dependencies
    );
    expect(unauthorized.status).toBe(401);
    await expect(unauthorized.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "UNAUTHORIZED", retryable: false },
    });

    dependencies.authorizeApiProject.mockRejectedValueOnce(
      new Response("CSRF failed", { status: 403 })
    );
    const csrf = await executeAssetQuery(
      { request: outerRequest(), resourceRequest: innerRequest({ query: {} }) },
      dependencies
    );
    expect(csrf.status).toBe(403);
    await expect(csrf.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN", retryable: false },
    });
  });

  test("rejects malformed JSON and maps execution errors", async () => {
    const malformed = await executeAssetQuery(
      {
        request: outerRequest(),
        resourceRequest: new Request(
          `https://p-${projectId}.localhost/$resources/assets`,
          { method: "POST", body: "{" }
        ),
      },
      dependencies
    );
    expect(malformed.status).toBe(400);

    dependencies.previewProjectAssetQuery.mockRejectedValueOnce(
      new AssetQueryExecutionError("Invalid pagination")
    );
    const invalid = await executeAssetQuery(
      { request: outerRequest(), resourceRequest: innerRequest({ query: {} }) },
      dependencies
    );
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toMatchObject({
      error: { code: "INVALID_REQUEST" },
    });
  });

  test("maps stale revisions to conflict responses", async () => {
    dependencies.previewProjectAssetQuery.mockRejectedValue(
      new AssetIndexRevisionError()
    );

    const response = await executeAssetQuery(
      { request: outerRequest(), resourceRequest: innerRequest({ query: {} }) },
      dependencies
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "STALE_INDEX", retryable: false },
    });
  });
});
