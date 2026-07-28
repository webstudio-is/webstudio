import { beforeEach, describe, expect, test, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  AssetIndexRevisionError,
  AssetQueryExecutionError,
} from "@webstudio-is/content-engine";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import { loader } from "./assets-query.server";

const projectId = "090e6e14-ae50-4b2e-bd22-71733cec05bb";
const dependencies = {
  authorizeApiProject: vi.fn(),
  createAssetClient: vi.fn(() => ({ readFile: vi.fn() })),
  previewAssetResourceQuery: vi.fn(),
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
    dependencies.authorizeApiProject.mockResolvedValue({} as never);
    dependencies.previewAssetResourceQuery.mockReset();
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
        usedBytes: 100,
        maxBytes: 512_000,
        unboundedBytes: 100,
        includedDocumentCount: 1,
        omittedDocumentCount: 0,
        truncated: false,
      },
    };
    dependencies.previewAssetResourceQuery.mockResolvedValue(responseBody);
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

    const response = await loader(
      { request: outerRequest(), resourceRequest: innerRequest({ query }) },
      dependencies
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(responseBody);
    expect(dependencies.authorizeApiProject).toHaveBeenCalledWith(
      expect.any(Request),
      projectId,
      "view"
    );
    expect(dependencies.previewAssetResourceQuery).toHaveBeenCalledWith({
      projectId,
      request: {
        query: expect.objectContaining({
          ...query,
          sort: [],
          offset: 0,
          content: { mode: "none" },
        }),
      },
      context: expect.anything(),
      assetClient: expect.objectContaining({ readFile: expect.any(Function) }),
      contentDatabaseMaxBytes: 512_000,
    });
  });

  test("supports the public REST URL with an explicit project", async () => {
    dependencies.previewAssetResourceQuery.mockResolvedValue({
      data: { items: [], totalCount: 0, hasMore: false },
      __diagnostics__: {
        scope: "query-preview",
        usedBytes: 100,
        maxBytes: 512_000,
        unboundedBytes: 100,
        includedDocumentCount: 0,
        omittedDocumentCount: 0,
        truncated: false,
      },
    });
    const request = new Request(
      `https://api.example/rest/assets/query?projectId=${projectId}`,
      { method: "POST", body: JSON.stringify({ query: {} }) }
    );

    const response = await loader(
      { request, resourceRequest: request.clone() },
      dependencies
    );

    expect(response.status).toBe(200);
    expect(dependencies.authorizeApiProject).toHaveBeenCalledWith(
      request,
      projectId,
      "view"
    );
  });

  test("returns structured invalid-request and forbidden failures", async () => {
    const invalid = await loader(
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

    dependencies.previewAssetResourceQuery.mockRejectedValue(
      new AuthorizationError("denied")
    );
    const forbidden = await loader(
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
    const unauthorized = await loader(
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
    const csrf = await loader(
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
    const malformed = await loader(
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

    dependencies.previewAssetResourceQuery.mockRejectedValueOnce(
      new AssetQueryExecutionError("Invalid pagination")
    );
    const invalid = await loader(
      { request: outerRequest(), resourceRequest: innerRequest({ query: {} }) },
      dependencies
    );
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toMatchObject({
      error: { code: "INVALID_REQUEST" },
    });
  });

  test("maps stale revisions to conflict responses", async () => {
    dependencies.previewAssetResourceQuery.mockRejectedValue(
      new AssetIndexRevisionError()
    );

    const response = await loader(
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
