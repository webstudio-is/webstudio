import { describe, expect, test, vi } from "vitest";
import { createDefaultCollectionConfig } from "@webstudio-is/content-engine";
import type { Asset } from "@webstudio-is/sdk";
import {
  preparePublishedAssetData,
  validatePublishedAssetCollections,
} from "./publication";

const createCollectionFixture = () => {
  const configSource = createDefaultCollectionConfig();
  const baseAsset: Asset = {
    id: "config",
    projectId: "project-1",
    name: "config-storage.json",
    filename: "collection",
    folderId: "posts",
    type: "file",
    format: "json",
    size: new TextEncoder().encode(configSource).byteLength,
    description: null,
    createdAt: "2026-09-06T00:00:00.000Z",
    meta: {},
  };
  const configAsset = baseAsset;
  const templateAsset: Asset = {
    ...baseAsset,
    id: "template",
    name: "template-storage.mdx",
    filename: "template",
    format: "mdx",
  };
  const entryAsset: Asset = {
    ...templateAsset,
    id: "entry",
    name: "entry-storage.mdx",
    filename: "hello-world",
  };
  const imageAsset: Asset = {
    ...baseAsset,
    id: "image",
    name: "image-storage.png",
    filename: "image",
    folderId: undefined,
    type: "image",
    format: "png",
    meta: { width: 100, height: 100 },
  };
  const assetData = {
    assets: [configAsset, templateAsset, entryAsset, imageAsset],
    assetFolders: [{ id: "posts" }],
  };
  const assetStore = {
    readFile: vi.fn(async (name: string) => {
      if (name !== configAsset.name) {
        throw new Error(`Unexpected asset read: ${name}`);
      }
      return {
        data: new Blob([configSource]).stream(),
        contentLength: configAsset.size,
      };
    }),
    uploadFile: vi.fn(),
  };
  return { assetData, assetStore };
};

describe("published asset data", () => {
  test("omits collection configuration and templates from public validation output", async () => {
    const { assetData, assetStore } = createCollectionFixture();
    const validateCollections = vi.fn();
    const dependencies = {
      createRepository: vi.fn(() => ({ validateCollections })),
      loadAssetDataByProject: vi.fn().mockResolvedValue(assetData),
    };

    const publicResult = await validatePublishedAssetCollections(
      {
        projectId: "project-1",
        context: { apiClient: { type: "service" } } as never,
        assetStore: assetStore as never,
      },
      dependencies as never
    );
    expect(publicResult.assets.map(({ id }) => id)).toEqual(["entry", "image"]);

    const authenticatedResult = await validatePublishedAssetCollections(
      {
        projectId: "project-1",
        context: { apiClient: { type: "cli" } } as never,
        assetStore: assetStore as never,
      },
      dependencies as never
    );
    expect(authenticatedResult.assets).toEqual(assetData.assets);
    expect(validateCollections).toHaveBeenCalledWith(assetData.assets);
    expect(assetStore.readFile).toHaveBeenCalledOnce();
  });

  test("omits collection configuration and templates from indexed public output", async () => {
    const { assetData, assetStore } = createCollectionFixture();
    const artifact = { documents: [], assetReferences: {} } as never;
    const prepareIndex = vi.fn().mockResolvedValue(artifact);
    const dependencies = {
      createRepository: vi.fn(() => ({ prepareIndex })),
      loadAssetDataByProject: vi.fn().mockResolvedValue(assetData),
    };

    const result = await preparePublishedAssetData(
      {
        projectId: "project-1",
        context: { apiClient: { type: "service" } } as never,
        assetStore: assetStore as never,
        contentDatabaseMaxBytes: 512_000,
        plan: { queries: [] } as never,
        retainedAssetIds: [],
      },
      dependencies as never
    );

    expect(result.assets.map(({ id }) => id)).toEqual(["entry", "image"]);

    const authenticatedResult = await preparePublishedAssetData(
      {
        projectId: "project-1",
        context: { apiClient: { type: "cli" } } as never,
        assetStore: assetStore as never,
        contentDatabaseMaxBytes: 512_000,
        plan: { queries: [] } as never,
        retainedAssetIds: [],
      },
      dependencies as never
    );
    expect(authenticatedResult.assets).toEqual(assetData.assets);
    expect(prepareIndex).toHaveBeenCalledTimes(2);
    expect(assetStore.readFile).toHaveBeenCalledOnce();
  });

  test("validates collections without compiling a content index", async () => {
    const validateCollections = vi.fn();
    const createRepository = vi.fn(() => ({ validateCollections }));
    const staleAssetData = {
      assets: [{ id: "stale-config", type: "file" }],
      assetFolders: [{ id: "stale-folder" }],
    };
    const currentAssetData = {
      assets: [{ id: "current-config", type: "file" }],
      assetFolders: [{ id: "current-folder" }],
    };
    const loadAssetDataByProject = vi
      .fn()
      .mockResolvedValueOnce(staleAssetData)
      .mockResolvedValueOnce(currentAssetData)
      .mockResolvedValueOnce(currentAssetData)
      .mockResolvedValueOnce(currentAssetData);

    await expect(
      validatePublishedAssetCollections(
        {
          projectId: "project-1",
          context: {} as never,
          assetStore: {} as never,
        },
        {
          createRepository,
          loadAssetDataByProject,
        } as never
      )
    ).resolves.toEqual(currentAssetData);

    expect(createRepository).toHaveBeenCalledWith({
      projectId: "project-1",
      context: {},
      assetStore: {},
    });
    expect(validateCollections.mock.calls).toEqual([
      [staleAssetData.assets],
      [currentAssetData.assets],
    ]);
    expect(loadAssetDataByProject).toHaveBeenCalledTimes(4);
  });

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
