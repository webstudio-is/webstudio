import { describe, expect, test, vi } from "vitest";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import type { AssetObjectStore } from "./client";
import { createUploadTicket, uploadFile } from "./upload";
import {
  loadCanonicalAssetBaseEntries,
  synchronizeCanonicalAssets,
} from "./canonical-metadata-backfill";
import { loadCanonicalAssetFileEntries } from "./canonical-metadata-persistence";
import {
  createAssetIndex,
  createPublishedAssetResourceFetch,
  verifyAssetIndex,
} from "@webstudio-is/asset-resource";
import {
  AssetIndexPreparationError,
  PostgresAssetRepository,
} from "./asset-repository";
import { updateAssetMetadataWithClient } from "./asset-patch-core";
import {
  deleteAssetsWithClient,
  loadAssetsByProjectWithClient,
} from "./asset-patch-core";
import { updateAssetContent } from "./revision";
import {
  deleteAssetFoldersWithClient,
  loadAssetFoldersByProjectWithClient,
  upsertAssetFolderWithClient,
} from "./folder-persistence";

const context = {
  postgrest: { client: {} },
} as unknown as AppContext;
const assetClient: AssetObjectStore = {
  readFile: vi.fn(),
  uploadFile: vi.fn(),
};

const createDependencies = () => ({
  hasProjectPermit: vi.fn().mockResolvedValue(true),
  createUploadTicket: vi.fn<typeof createUploadTicket>(),
  uploadFile: vi.fn<typeof uploadFile>(),
  updateAssetContent: vi.fn<typeof updateAssetContent>(),
  deleteAssetsWithClient: vi.fn<typeof deleteAssetsWithClient>(),
  synchronizeCanonicalAssets: vi
    .fn<typeof synchronizeCanonicalAssets>()
    .mockResolvedValue({
      scanned: 0,
      indexed: 0,
      metadataUpdated: 0,
      unchanged: 0,
      removed: 0,
      skipped: 0,
      inconsistent: 0,
      issues: [],
    }),
  loadCanonicalAssetBaseEntries: vi.fn<typeof loadCanonicalAssetBaseEntries>(),
  loadCanonicalAssetFileEntries: vi.fn<typeof loadCanonicalAssetFileEntries>(),
  createAssetIndex: vi.fn<typeof createAssetIndex>(),
  verifyAssetIndex: vi
    .fn<typeof verifyAssetIndex>()
    .mockImplementation(
      async (index) => index as Awaited<ReturnType<typeof verifyAssetIndex>>
    ),
  updateAssetMetadataWithClient: vi.fn<typeof updateAssetMetadataWithClient>(),
  loadAssetsByProjectWithClient: vi.fn<typeof loadAssetsByProjectWithClient>(),
  loadAssetFoldersByProjectWithClient:
    vi.fn<typeof loadAssetFoldersByProjectWithClient>(),
  upsertAssetFolderWithClient: vi.fn<typeof upsertAssetFolderWithClient>(),
  deleteAssetFoldersWithClient: vi.fn<typeof deleteAssetFoldersWithClient>(),
  createId: vi.fn(() => "folder-1"),
  now: vi.fn(() => new Date("2026-07-25T00:00:00.000Z")),
});

describe("PostgresAssetRepository", () => {
  test("lists, gets, and range-reads assets through the authorized object store", async () => {
    const dependencies = createDependencies();
    const asset = {
      id: "asset-1",
      projectId: "project-1",
      name: "post.md",
      type: "file" as const,
      format: "md",
      size: 10,
      description: null,
      createdAt: "2026-07-25T00:00:00.000Z",
      meta: {},
    };
    dependencies.loadAssetsByProjectWithClient.mockResolvedValue([asset]);
    const readFile = vi.fn(async () => ({
      data: new Blob(["post"]).stream() as unknown as AsyncIterable<Uint8Array>,
      contentLength: 4,
    }));
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: { ...assetClient, readFile },
      dependencies,
    });

    await expect(repository.list()).resolves.toEqual([asset]);
    await expect(repository.get("asset-1")).resolves.toEqual(asset);
    await expect(
      repository.readContent({
        assetId: "asset-1",
        range: { offset: 2, length: 4 },
      })
    ).resolves.toMatchObject({ asset, contentLength: 4 });
    expect(dependencies.loadAssetsByProjectWithClient).toHaveBeenNthCalledWith(
      1,
      "project-1",
      context.postgrest.client
    );
    expect(dependencies.loadAssetsByProjectWithClient).toHaveBeenNthCalledWith(
      2,
      "project-1",
      context.postgrest.client,
      ["asset-1"]
    );
    expect(dependencies.loadAssetsByProjectWithClient).toHaveBeenNthCalledWith(
      3,
      "project-1",
      context.postgrest.client,
      ["asset-1"]
    );
    expect(dependencies.hasProjectPermit).toHaveBeenCalledWith(
      { projectId: "project-1", permit: "view" },
      context
    );
    expect(readFile).toHaveBeenCalledWith("post.md", {
      offset: 2,
      length: 4,
    });
  });

  test("creates, moves, and deletes empty folders through the repository", async () => {
    const dependencies = createDependencies();
    const root = {
      id: "root",
      projectId: "project-1",
      name: "Root",
      createdAt: "2026-07-24T00:00:00.000Z",
    };
    const created = {
      id: "folder-1",
      projectId: "project-1",
      name: "Blog",
      parentId: "root",
      createdAt: "2026-07-25T00:00:00.000Z",
    };
    dependencies.upsertAssetFolderWithClient
      .mockResolvedValueOnce(created)
      .mockResolvedValueOnce({ ...created, name: "Articles" });
    dependencies.loadAssetFoldersByProjectWithClient
      .mockResolvedValueOnce([root, created])
      .mockResolvedValueOnce([root, { ...created, name: "Articles" }]);
    dependencies.loadAssetsByProjectWithClient.mockResolvedValue([]);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetClient,
      dependencies,
    });

    await expect(
      repository.createFolder({ name: "Blog", parentId: "root" })
    ).resolves.toEqual(created);
    await expect(
      repository.updateFolder("folder-1", { name: "Articles" })
    ).resolves.toMatchObject({ name: "Articles" });
    await expect(repository.deleteFolder("folder-1")).resolves.toBeUndefined();
    expect(dependencies.deleteAssetFoldersWithClient).toHaveBeenCalledWith(
      { projectId: "project-1", ids: ["folder-1"] },
      context.postgrest.client
    );
  });

  test("lists and gets folders with view authorization", async () => {
    const dependencies = createDependencies();
    const folder = {
      id: "blog",
      projectId: "project-1",
      name: "Blog",
      createdAt: "2026-07-25T00:00:00.000Z",
    };
    dependencies.loadAssetFoldersByProjectWithClient.mockImplementation(
      async (_projectId, _client, folderIds) =>
        folderIds?.includes(folder.id) === false ? [] : [folder]
    );
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetClient,
      dependencies,
    });

    await expect(repository.listFolders()).resolves.toEqual([folder]);
    await expect(repository.getFolder("blog")).resolves.toEqual(folder);
    await expect(repository.getFolder("missing")).rejects.toThrow(
      "Asset folder not found"
    );
    expect(dependencies.hasProjectPermit).toHaveBeenCalledWith(
      { projectId: "project-1", permit: "view" },
      context
    );
  });

  test("rejects deleting a non-empty folder", async () => {
    const dependencies = createDependencies();
    dependencies.loadAssetFoldersByProjectWithClient.mockResolvedValue([
      {
        id: "folder-1",
        projectId: "project-1",
        name: "Blog",
        createdAt: "2026-07-25T00:00:00.000Z",
      },
    ]);
    dependencies.loadAssetsByProjectWithClient.mockResolvedValue([
      {
        id: "asset-1",
        projectId: "project-1",
        name: "post.md",
        folderId: "folder-1",
        type: "file",
        format: "md",
        size: 10,
        description: null,
        createdAt: "2026-07-25T00:00:00.000Z",
        meta: {},
      },
    ]);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetClient,
      dependencies,
    });

    await expect(repository.deleteFolder("folder-1")).rejects.toThrow(
      "must be empty"
    );
    expect(dependencies.deleteAssetFoldersWithClient).not.toHaveBeenCalled();
  });

  test("does not parse a complete asset restored by upload deduplication", async () => {
    const dependencies = createDependencies();
    dependencies.createUploadTicket.mockResolvedValue({
      assetId: "asset-1",
      name: "post.md",
      deduplicated: true,
      asset: {
        id: "asset-1",
        projectId: "project-1",
        name: "post.md",
        type: "file",
        format: "raw",
        size: 12,
        createdAt: "2026-07-24T00:00:00.000Z",
        meta: {},
      },
    });
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetClient,
      dependencies,
    });

    const ticket = await repository.createUploadTicket({
      type: "file",
      filename: "post.md",
      contentHash: "hash",
    });

    expect(ticket.deduplicated).toBe(true);
    expect(dependencies.createUploadTicket).toHaveBeenCalledWith(
      {
        projectId: "project-1",
        type: "file",
        filename: "post.md",
        contentHash: "hash",
      },
      context,
      undefined
    );
  });

  test("does not index an incomplete upload reservation", async () => {
    const dependencies = createDependencies();
    dependencies.createUploadTicket.mockResolvedValue({
      assetId: "asset-1",
      name: "post.md",
      deduplicated: false,
    });
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetClient,
      dependencies,
    });

    await repository.createUploadTicket({
      type: "file",
      filename: "post.md",
    });
  });

  test("authorizes upload completion independently of its reserved name", async () => {
    const dependencies = createDependencies();
    dependencies.hasProjectPermit.mockResolvedValue(false);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetClient,
      dependencies,
    });

    await expect(
      repository.completeUpload({
        name: "reserved.md",
        data: new Blob(["post"]).stream(),
        assetInfoFallback: undefined,
      })
    ).rejects.toThrow("access to edit");
    expect(dependencies.uploadFile).not.toHaveBeenCalled();
  });

  test("does not read or parse stored content during ordinary mutations", async () => {
    const dependencies = createDependencies();
    const asset = {
      id: "asset-1",
      projectId: "project-1",
      name: "post.md",
      type: "file" as const,
      format: "md",
      size: 10,
      description: null,
      createdAt: "2026-07-25T00:00:00.000Z",
      meta: {},
    };
    dependencies.createUploadTicket.mockResolvedValue({
      assetId: asset.id,
      name: asset.name,
      deduplicated: true,
      asset,
    });
    dependencies.uploadFile.mockResolvedValue(asset);
    dependencies.updateAssetContent.mockResolvedValue(asset);
    dependencies.updateAssetMetadataWithClient.mockResolvedValue(asset);
    const readFile = vi.fn<AssetObjectStore["readFile"]>();
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: { readFile, uploadFile: vi.fn() },
      dependencies,
    });

    await repository.createUploadTicket({ type: "file", filename: "post.md" });
    await repository.completeUpload({
      name: "post.md",
      data: new Blob(["post"]).stream(),
      assetInfoFallback: undefined,
    });
    await repository.updateContent({
      assetId: asset.id,
      expectedName: asset.name,
      data: new Blob(["updated"]).stream(),
    });
    await repository.updateMetadata(asset.id, { filename: "Post" });
    await repository.delete([asset.id]);

    expect(readFile).not.toHaveBeenCalled();
    expect(dependencies.synchronizeCanonicalAssets).not.toHaveBeenCalled();
  });

  test("authorizes public read and trusted maintenance operations", async () => {
    const dependencies = createDependencies();
    dependencies.hasProjectPermit.mockResolvedValue(false);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetClient,
      dependencies,
    });

    await expect(repository.readIndex()).rejects.toThrow("access to view");
    await expect(repository.synchronize()).rejects.toThrow("access to edit");
    await expect(repository.prepareIndex()).rejects.toThrow("access to build");
    expect(dependencies.loadCanonicalAssetFileEntries).not.toHaveBeenCalled();
    expect(dependencies.synchronizeCanonicalAssets).not.toHaveBeenCalled();
  });

  test("repairs canonical metadata before creating an index", async () => {
    const dependencies = createDependencies();
    const entries = [
      {
        projectId: "project-1",
        assetId: "asset-1",
        revision: `sha256:${"a".repeat(64)}`,
        document: {
          _id: "asset-1",
          _type: "asset.file" as const,
          name: "post.md",
          path: "post.md",
          key: "post.md",
          extension: "md",
          mimeType: "text/markdown",
          size: 10,
          revision: `sha256:${"a".repeat(64)}`,
          contentRef: "assets/post.md",
          properties: {},
        },
      },
    ];
    const index = { integrity: { checksum: `sha256:${"b".repeat(64)}` } };
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue(entries);
    dependencies.createAssetIndex.mockResolvedValue(index as never);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetClient,
      dependencies,
    });

    await expect(repository.prepareIndex()).resolves.toBe(index);
    expect(dependencies.hasProjectPermit).toHaveBeenCalledWith(
      { projectId: "project-1", permit: "build" },
      context
    );
    expect(dependencies.synchronizeCanonicalAssets).toHaveBeenCalledWith({
      client: context.postgrest.client,
      assetClient,
      projectId: "project-1",
    });
    expect(dependencies.loadCanonicalAssetFileEntries).toHaveBeenCalledWith({
      client: context.postgrest.client,
      projectId: "project-1",
    });
    expect(dependencies.createAssetIndex).toHaveBeenCalledWith({
      projectId: "project-1",
      entries,
    });
    expect(dependencies.verifyAssetIndex).toHaveBeenCalledWith(index);
  });

  test("creates a base-only index without synchronizing or reading content", async () => {
    const dependencies = createDependencies();
    const entries = [
      {
        projectId: "project-1",
        assetId: "asset-1",
        revision: "revision-1",
        document: {
          _id: "asset-1",
          _type: "asset.file" as const,
          name: "post.md",
          path: "post.md",
          key: "post",
          extension: "md",
          mimeType: "text/markdown",
          size: 10,
          revision: "revision-1",
          contentRef: "post.md",
          properties: {},
        },
      },
    ];
    const index = { integrity: { checksum: `sha256:${"b".repeat(64)}` } };
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue(entries);
    dependencies.createAssetIndex.mockResolvedValue(index as never);
    const readFile = vi.fn();
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: { readFile, uploadFile: vi.fn() },
      dependencies,
    });

    await expect(
      repository.prepareIndex({
        baseMetadata: true,
        structuredProperties: false,
        structuredPropertyPaths: [],
        excerpt: false,
        hydratedContent: false,
        output: { mode: "base" },
      })
    ).resolves.toBe(index);

    expect(dependencies.synchronizeCanonicalAssets).not.toHaveBeenCalled();
    expect(dependencies.loadCanonicalAssetFileEntries).not.toHaveBeenCalled();
    expect(dependencies.loadCanonicalAssetBaseEntries).toHaveBeenCalledWith({
      client: context.postgrest.client,
      projectId: "project-1",
    });
    expect(readFile).not.toHaveBeenCalled();
  });

  test("keeps only required properties and excerpts in a prepared index", async () => {
    const dependencies = createDependencies();
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue([
      {
        projectId: "project-1",
        assetId: "asset-1",
        revision: "revision-1",
        document: {
          _id: "asset-1",
          _type: "asset.file",
          name: "post.md",
          path: "post.md",
          key: "post",
          extension: "md",
          mimeType: "text/markdown",
          size: 10,
          revision: "revision-1",
          contentRef: "post.md",
          properties: { title: "Post", draft: true },
          excerpt: "Excerpt",
        },
      },
    ]);
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    dependencies.verifyAssetIndex.mockImplementation(verifyAssetIndex);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetClient,
      dependencies,
    });

    const index = await repository.prepareIndex({
      baseMetadata: true,
      structuredProperties: true,
      structuredPropertyPaths: [["properties", "title"]],
      excerpt: false,
      hydratedContent: false,
      output: {
        mode: "fields",
        fields: [["properties", "title"]],
      },
    });

    expect(index.documents[0].properties).toEqual({ title: "Post" });
    expect(index.documents[0]).not.toHaveProperty("excerpt");
    expect(dependencies.synchronizeCanonicalAssets).toHaveBeenCalledWith({
      client: context.postgrest.client,
      assetClient,
      projectId: "project-1",
      requirements: { structuredProperties: true, excerpt: false },
    });
  });

  test("fails strict index preparation with per-asset diagnostics", async () => {
    const dependencies = createDependencies();
    const issues = [
      {
        assetId: "broken",
        storageName: "broken.md",
        revision: "file:broken.md:now:4",
        message: "Object is missing",
      },
    ];
    dependencies.synchronizeCanonicalAssets.mockResolvedValue({
      scanned: 1,
      indexed: 0,
      metadataUpdated: 0,
      unchanged: 0,
      removed: 0,
      skipped: 0,
      inconsistent: 0,
      issues,
    });
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetClient,
      dependencies,
    });

    await expect(repository.prepareIndex()).rejects.toMatchObject({
      name: "AssetIndexPreparationError",
      issues,
    } satisfies Partial<AssetIndexPreparationError>);
    expect(dependencies.loadCanonicalAssetFileEntries).not.toHaveBeenCalled();
  });

  test("keeps healthy indexed assets readable when another asset is broken", async () => {
    const dependencies = createDependencies();
    dependencies.synchronizeCanonicalAssets.mockResolvedValue({
      scanned: 2,
      indexed: 0,
      metadataUpdated: 0,
      unchanged: 1,
      removed: 1,
      skipped: 1,
      inconsistent: 0,
      issues: [
        {
          assetId: "broken",
          storageName: "broken.md",
          revision: "revision-broken",
          message: "Object is missing",
        },
      ],
    });
    const index = { integrity: { checksum: `sha256:${"b".repeat(64)}` } };
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue([]);
    dependencies.createAssetIndex.mockResolvedValue(index as never);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetClient,
      dependencies,
    });

    await expect(repository.readIndex()).resolves.toBe(index);
  });

  test("updates metadata without eagerly maintaining query fields", async () => {
    const dependencies = createDependencies();
    const updatedAsset = {
      id: "asset-1",
      projectId: "project-1",
      name: "post.md",
      filename: "Published post",
      description: "Description",
      folderId: "blog",
      type: "file" as const,
      format: "md",
      size: 10,
      createdAt: "2026-07-25T00:00:00.000Z",
      meta: {},
    };
    dependencies.updateAssetMetadataWithClient.mockResolvedValue(updatedAsset);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetClient,
      dependencies,
    });

    await expect(
      repository.updateMetadata("asset-1", {
        filename: "Published post",
        description: "Description",
        folderId: "blog",
      })
    ).resolves.toBe(updatedAsset);
    expect(dependencies.hasProjectPermit).toHaveBeenCalledWith(
      { projectId: "project-1", permit: "edit" },
      context
    );
    expect(dependencies.updateAssetMetadataWithClient).toHaveBeenCalledWith(
      {
        projectId: "project-1",
        assetId: "asset-1",
        values: {
          filename: "Published post",
          description: "Description",
          folderId: "blog",
        },
      },
      context.postgrest.client
    );
  });

  test("does not reindex changed content during the mutation", async () => {
    const dependencies = createDependencies();
    const updatedAsset = {
      id: "asset-1",
      projectId: "project-1",
      name: "post.md",
      type: "file" as const,
      format: "md",
      size: 12,
      description: null,
      createdAt: "2026-07-25T00:00:00.000Z",
      meta: {},
    };
    dependencies.updateAssetContent.mockResolvedValue(updatedAsset);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetClient,
      dependencies,
    });

    await expect(
      repository.updateContent({
        assetId: "asset-1",
        expectedName: "post.md",
        data: new Blob(["updated post"]).stream(),
      })
    ).resolves.toBe(updatedAsset);
  });

  test("does not rebuild the derived index while deleting assets", async () => {
    const dependencies = createDependencies();
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetClient,
      dependencies,
    });

    await repository.delete(["asset-1", "asset-2"]);

    expect(dependencies.deleteAssetsWithClient).toHaveBeenCalledWith(
      { projectId: "project-1", ids: ["asset-1", "asset-2"] },
      context.postgrest.client
    );
    expect(dependencies.synchronizeCanonicalAssets).not.toHaveBeenCalled();
  });

  test("lazily indexes an uploaded Markdown document on its first query", async () => {
    const dependencies = createDependencies();
    const revision = `sha256:${"a".repeat(64)}`;
    const uploadedAsset = {
      id: "asset-1",
      projectId: "project-1",
      name: "post.md",
      type: "file" as const,
      format: "md",
      size: 10,
      description: null,
      createdAt: "2026-07-25T00:00:00.000Z",
      meta: {},
    };
    dependencies.uploadFile.mockResolvedValue(uploadedAsset);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue([
      {
        projectId: "project-1",
        assetId: "asset-1",
        revision,
        document: {
          _id: "asset-1",
          _type: "asset.file",
          name: "post.md",
          path: "post.md",
          key: "post.md",
          extension: "md",
          mimeType: "text/markdown",
          size: 10,
          revision,
          contentRef: "post.md",
          properties: { title: "New post" },
        },
      },
    ]);
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetClient,
      dependencies,
    });

    await repository.completeUpload({
      name: "post.md",
      data: new Blob(["post"]).stream(),
      assetInfoFallback: undefined,
    });
    const result = await repository.query({
      query: {
        where: {
          all: [
            {
              field: ["properties", "title"],
              operator: "eq",
              value: "New post",
            },
          ],
        },
      },
    });

    expect(dependencies.synchronizeCanonicalAssets).toHaveBeenCalledWith({
      client: context.postgrest.client,
      assetClient,
      projectId: "project-1",
      requirements: {
        structuredProperties: true,
        excerpt: true,
      },
    });
    expect(result.items).toEqual([
      expect.objectContaining({
        id: "asset-1",
        properties: { title: "New post" },
      }),
    ]);

    const publishedIndex = await repository.prepareIndex();
    const publishedFetch = createPublishedAssetResourceFetch({
      baseUrl: "https://blog.example",
      deploymentId: "deployment-1",
      manifest: {
        revision: publishedIndex.integrity.checksum,
        assetRevision: publishedIndex.assetRevision,
        indexPath: "/assets/db/index.json",
      },
      fetchAsset: async (path) => {
        if (path === "/assets/db/index.json") {
          return Response.json(publishedIndex);
        }
        if (path === "/assets/post.md") {
          return new Response("# New post");
        }
        return new Response(null, { status: 404 });
      },
    });
    const publishedResponse = await publishedFetch("/$resources/assets", {
      method: "POST",
      body: JSON.stringify({
        query: {
          where: {
            all: [
              {
                field: ["properties", "title"],
                operator: "eq",
                value: "New post",
              },
            ],
          },
          content: { mode: "full" },
        },
      }),
    });
    expect(await publishedResponse?.json()).toMatchObject({
      items: [
        {
          id: "asset-1",
          content: { text: "# New post" },
        },
      ],
    });
  });
});
