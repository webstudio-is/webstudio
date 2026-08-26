import { describe, expect, test, vi } from "vitest";
import { preparePublishedAssetData } from "./publication";

describe("published asset data", () => {
  test("keeps authored fonts and content database runtime assets", async () => {
    const artifact = {
      documents: [{ _id: "post-document" }],
      assetReferences: {
        "post.md": [{ start: 0, end: 1, assetId: "inline-font" }],
      },
    } as never;
    const assetData = {
      assets: [
        { id: "authored-font", type: "font" },
        { id: "inline-font", type: "font" },
        { id: "post-document", type: "font" },
        { id: "unused-font", type: "font" },
        { id: "image", type: "image" },
      ],
      assetFolders: [{ id: "folder" }],
    } as never;
    const prepareIndex = vi.fn().mockResolvedValue(artifact);
    const loadAssetDataByProject = vi.fn().mockResolvedValue(assetData);
    const dependencies = {
      createRepository: vi.fn(() => ({ prepareIndex })),
      loadAssetDataByProject,
    };

    const result = await preparePublishedAssetData(
      {
        projectId: "project-1",
        context: {} as never,
        assetStore: {} as never,
        contentDatabaseMaxBytes: 512_000,
        plan: { queries: [] } as never,
        retainedAssetIds: ["authored-font"],
      },
      dependencies as never
    );

    expect(result).toEqual({
      artifact,
      assets: [
        { id: "authored-font", type: "font" },
        { id: "inline-font", type: "font" },
        { id: "post-document", type: "font" },
        { id: "image", type: "image" },
      ],
      assetFolders: [{ id: "folder" }],
    });
    expect(prepareIndex).toHaveBeenCalledWith({ queries: [] });
    expect(loadAssetDataByProject).toHaveBeenCalledTimes(2);
  });

  test("retries publication preparation when assets change", async () => {
    const artifact = {
      documents: [],
      assetReferences: {},
    } as never;
    const initialAssetData = {
      assets: [],
      assetFolders: [],
    };
    const changedAssetData = {
      assets: [{ id: "image", type: "image" }],
      assetFolders: [],
    };
    const prepareIndex = vi.fn().mockResolvedValue(artifact);
    const loadAssetDataByProject = vi
      .fn()
      .mockResolvedValueOnce(initialAssetData)
      .mockResolvedValueOnce(changedAssetData)
      .mockResolvedValueOnce(changedAssetData)
      .mockResolvedValueOnce(changedAssetData);

    await expect(
      preparePublishedAssetData(
        {
          projectId: "project-1",
          context: {} as never,
          assetStore: {} as never,
          contentDatabaseMaxBytes: 512_000,
          plan: { queries: [] } as never,
          retainedAssetIds: [],
        },
        {
          createRepository: vi.fn(() => ({ prepareIndex })),
          loadAssetDataByProject,
        } as never
      )
    ).resolves.toMatchObject({ assets: changedAssetData.assets });

    expect(prepareIndex).toHaveBeenCalledTimes(2);
    expect(loadAssetDataByProject).toHaveBeenCalledTimes(4);
  });

  test("recompiles and validates bounded dynamic publication dependencies", async () => {
    const preliminaryArtifact = { documents: [{ _id: "post" }] } as never;
    const finalArtifact = {
      documents: [{ _id: "post" }, { _id: "article.mdx" }],
    } as never;
    const initialPlan = { queries: [{ id: "posts" }] } as never;
    const resolvedPlan = {
      queries: [{ id: "posts" }, { id: "mdx:article" }],
    } as never;
    const prepareIndex = vi
      .fn()
      .mockResolvedValueOnce(preliminaryArtifact)
      .mockResolvedValueOnce(finalArtifact);
    const resolvePlan = vi.fn(() => resolvedPlan);
    const assetData = { assets: [], assetFolders: [] };

    const result = await preparePublishedAssetData(
      {
        projectId: "project-1",
        context: {} as never,
        assetStore: {} as never,
        contentDatabaseMaxBytes: 512_000,
        plan: initialPlan,
        retainedAssetIds: [],
        resolvePlan,
      },
      {
        createRepository: vi.fn(() => ({ prepareIndex })),
        loadAssetDataByProject: vi.fn().mockResolvedValue(assetData),
      } as never
    );

    expect(result.artifact).toBe(finalArtifact);
    expect(prepareIndex.mock.calls).toEqual([[initialPlan], [resolvedPlan]]);
    expect(resolvePlan.mock.calls).toEqual([
      [preliminaryArtifact],
      [finalArtifact],
    ]);
  });
});
