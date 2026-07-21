import { beforeEach, describe, expect, test, vi } from "vitest";
import { loader } from "./assets-index-status.server";

const projectId = "090e6e14-ae50-4b2e-bd22-71733cec05bb";
const dependencies = {
  createContext: vi.fn(),
  loadAssetResourceIndexStatus: vi.fn(),
};
const outerRequest = () =>
  new Request(`https://p-${projectId}.localhost/rest/resources-loader`);
const innerRequest = (resourceId?: string) => {
  const url = new URL(
    `https://p-${projectId}.localhost/$resources/assets/index-status`
  );
  if (resourceId !== undefined) {
    url.searchParams.set("resourceId", resourceId);
  }
  return new Request(url);
};

describe("asset index status system resource", () => {
  beforeEach(() => {
    dependencies.createContext.mockResolvedValue({} as never);
    dependencies.loadAssetResourceIndexStatus.mockReset();
  });

  test("returns the authenticated resource status", async () => {
    const status = {
      resourceId: "posts",
      state: "indexing" as const,
      queryHash: "query-revision",
      assetRevision: "asset-revision",
      activeRevision: "active-revision",
      updatedAt: "2026-07-18T12:00:00.000Z",
    };
    dependencies.loadAssetResourceIndexStatus.mockResolvedValue(status);

    const response = await loader(
      {
        request: outerRequest(),
        resourceRequest: innerRequest("posts"),
      },
      dependencies
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, status });
    expect(dependencies.loadAssetResourceIndexStatus).toHaveBeenCalledWith({
      projectId,
      resourceId: "posts",
      context: expect.anything(),
    });
  });

  test("rejects a missing resource ID and reports missing state", async () => {
    const invalid = await loader(
      { request: outerRequest(), resourceRequest: innerRequest() },
      dependencies
    );
    expect(invalid.status).toBe(400);

    dependencies.loadAssetResourceIndexStatus.mockResolvedValue(undefined);
    const missing = await loader(
      {
        request: outerRequest(),
        resourceRequest: innerRequest("missing"),
      },
      dependencies
    );
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
  });
});
