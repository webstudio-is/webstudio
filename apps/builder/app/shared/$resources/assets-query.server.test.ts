import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  AssetResourceQueryExecutionError,
  AssetResourceQueryValidationError,
} from "@webstudio-is/asset-resource";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import { loader } from "./assets-query.server";

const projectId = "090e6e14-ae50-4b2e-bd22-71733cec05bb";
const dependencies = {
  createContext: vi.fn(),
  createAssetClient: vi.fn(() => ({ readFile: vi.fn() })),
  previewAssetResourceQuery: vi.fn(),
};
const outerRequest = () =>
  new Request(`https://p-${projectId}.localhost/rest/resources-loader`);
const innerRequest = (body: unknown) =>
  new Request(`https://p-${projectId}.localhost/$resources/assets/query`, {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("asset query preview system resource", () => {
  beforeEach(() => {
    dependencies.createContext.mockResolvedValue({} as never);
    dependencies.previewAssetResourceQuery.mockReset();
  });

  test("uses outer authentication context and the inner query body", async () => {
    const responseBody = {
      ok: true as const,
      result: [{ _id: "post-1" }],
      content: {},
      meta: {
        queryHash: "query-revision",
        indexRevision: "index-revision",
        assetRevision: "asset-revision",
        resultCount: 1,
        hydratedFileCount: 0,
        hydratedBytes: 0,
      },
    };
    dependencies.previewAssetResourceQuery.mockResolvedValue(responseBody);

    const response = await loader(
      {
        request: outerRequest(),
        resourceRequest: innerRequest({ query: "*[]" }),
      },
      dependencies
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(responseBody);
    expect(dependencies.createContext).toHaveBeenCalledWith(
      expect.any(Request)
    );
    expect(dependencies.previewAssetResourceQuery).toHaveBeenCalledWith({
      projectId,
      request: {
        query: "*[]",
        parameters: {},
        resultLimit: 100,
        content: { mode: "none" },
      },
      context: expect.anything(),
      assetClient: expect.objectContaining({ readFile: expect.any(Function) }),
    });
  });

  test("returns structured invalid-request and forbidden failures", async () => {
    const invalid = await loader(
      { request: outerRequest(), resourceRequest: innerRequest({ query: "" }) },
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
      {
        request: outerRequest(),
        resourceRequest: innerRequest({ query: "*[]" }),
      },
      dependencies
    );
    expect(forbidden.status).toBe(403);
    await expect(forbidden.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });

  test("rejects malformed JSON and accepts hydration options", async () => {
    const malformed = await loader(
      {
        request: outerRequest(),
        resourceRequest: new Request(
          `https://p-${projectId}.localhost/$resources/assets/query`,
          { method: "POST", body: "{" }
        ),
      },
      dependencies
    );
    expect(malformed.status).toBe(400);

    dependencies.previewAssetResourceQuery.mockResolvedValue({
      ok: true,
      result: null,
      content: {},
      meta: {
        queryHash: "query-revision",
        indexRevision: "index-revision",
        assetRevision: "asset-revision",
        resultCount: 0,
        hydratedFileCount: 0,
        hydratedBytes: 0,
      },
    });
    const hydration = await loader(
      {
        request: outerRequest(),
        resourceRequest: innerRequest({
          query: "*[0]",
          content: { mode: "full" },
        }),
      },
      dependencies
    );
    expect(hydration.status).toBe(200);
    expect(dependencies.previewAssetResourceQuery).toHaveBeenCalledWith({
      projectId,
      request: expect.objectContaining({ content: { mode: "full" } }),
      context: expect.anything(),
      assetClient: expect.objectContaining({ readFile: expect.any(Function) }),
    });
  });

  test("maps query validation and execution errors", async () => {
    dependencies.previewAssetResourceQuery.mockRejectedValueOnce(
      new AssetResourceQueryValidationError({
        code: "INVALID_QUERY",
        message: "Invalid GROQ",
      })
    );
    const invalid = await loader(
      {
        request: outerRequest(),
        resourceRequest: innerRequest({ query: "*[invalid ==" }),
      },
      dependencies
    );
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toMatchObject({
      error: { code: "INVALID_QUERY" },
    });

    dependencies.previewAssetResourceQuery.mockRejectedValueOnce(
      new AssetResourceQueryExecutionError({
        code: "RESULT_LIMIT_EXCEEDED",
        message: "Too many results",
      })
    );
    const excessive = await loader(
      {
        request: outerRequest(),
        resourceRequest: innerRequest({ query: "*[]" }),
      },
      dependencies
    );
    expect(excessive.status).toBe(400);
    await expect(excessive.json()).resolves.toMatchObject({
      error: { code: "RESULT_LIMIT_EXCEEDED" },
    });
  });
});
