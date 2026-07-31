import { describe, expect, test, vi } from "vitest";
import { previewProjectAssetQuery } from "./asset-query-preview.server";

describe("project asset query preview", () => {
  test("previews against the current build content database plan", async () => {
    const context = {} as never;
    const build = {
      props: [],
      dataSources: [],
      resources: [],
    } as never;
    const assetClient = { readFile: vi.fn(), uploadFile: vi.fn() } as never;
    const result = { data: { items: [] } } as never;
    const dependencies = {
      createAssetClient: vi.fn(() => assetClient),
      loadDevBuildByProjectId: vi.fn().mockResolvedValue(build),
      previewAssetResourceQuery: vi.fn().mockResolvedValue(result),
    };

    await expect(
      previewProjectAssetQuery(
        {
          projectId: "project-1",
          request: { query: { limit: 5 } },
          context,
        },
        dependencies
      )
    ).resolves.toBe(result);

    expect(dependencies.loadDevBuildByProjectId).toHaveBeenCalledWith(
      context,
      "project-1"
    );
    expect(dependencies.previewAssetResourceQuery).toHaveBeenCalledWith({
      projectId: "project-1",
      request: { query: { limit: 5 } },
      context,
      assetClient,
      contentDatabaseMaxBytes: 512_000,
      databasePlan: expect.objectContaining({
        queries: expect.arrayContaining([
          expect.objectContaining({
            id: "__query-preview__",
            limit: { type: "literal", value: 5 },
          }),
        ]),
      }),
    });
  });
});
