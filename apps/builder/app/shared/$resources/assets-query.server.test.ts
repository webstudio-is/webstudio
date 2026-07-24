import { beforeEach, describe, expect, test, vi } from "vitest";
import { AssetQueryExecutionError } from "@webstudio-is/asset-resource";
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
  new Request(`https://p-${projectId}.localhost/$resources/assets`, {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("configured Assets system resource", () => {
  beforeEach(() => {
    dependencies.createContext.mockResolvedValue({} as never);
    dependencies.previewAssetResourceQuery.mockReset();
  });

  test("uses the outer authentication context and typed inner request", async () => {
    const responseBody = {
      items: [{ id: "post-1" }],
      totalCount: 1,
      hasMore: false,
    };
    dependencies.previewAssetResourceQuery.mockResolvedValue(responseBody);
    const query = {
      filters: [
        {
          field: ["properties", "draft"],
          operator: "ne",
          value: true,
        },
      ],
      limit: 20,
    };

    const response = await loader(
      { request: outerRequest(), resourceRequest: innerRequest({ query }) },
      dependencies
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(responseBody);
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
    });
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
});
