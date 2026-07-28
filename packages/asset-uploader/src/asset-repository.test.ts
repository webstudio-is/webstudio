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
  createContentCompilationPlan,
  createLiteralContentCompilationQuery,
  assetQuery,
  type AssetQueryInput,
  type AssetFileDocument,
} from "@webstudio-is/content-engine";
import {
  createAssetIndex,
  type CanonicalAssetFileEntry,
} from "@webstudio-is/content-engine/compiler";
import { createPublishedAssetResourceFetch } from "@webstudio-is/content-engine/runtime";
import {
  AssetIndexPreparationError,
  PostgresAssetRepository,
} from "./asset-repository";
import { createContentCompilationCache } from "./content-compilation-cache";
import {
  deleteAssetsWithClient,
  loadAssetsByProjectWithClient,
  updateAssetMetadataWithClient,
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

const createCompilationPlan = (query: AssetQueryInput) => {
  const plan = createContentCompilationPlan([
    createLiteralContentCompilationQuery({
      id: "resource",
      query: assetQuery.parse(query),
    }),
  ]);
  if (plan === undefined) {
    throw new Error("Expected a content compilation plan");
  }
  return plan;
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
  loadCanonicalAssetBaseEntries: vi
    .fn<typeof loadCanonicalAssetBaseEntries>()
    .mockResolvedValue([]),
  loadCanonicalAssetFileEntries: vi.fn<typeof loadCanonicalAssetFileEntries>(),
  createAssetIndex: vi.fn<typeof createAssetIndex>(),
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
      assetStore: assetClient,
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
      assetStore: assetClient,
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
      assetStore: assetClient,
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
      assetStore: assetClient,
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
      assetStore: assetClient,
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
      assetStore: assetClient,
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
      assetStore: assetClient,
      dependencies,
    });

    await expect(repository.readIndex()).rejects.toThrow("access to view");
    await expect(repository.synchronize()).rejects.toThrow("access to edit");
    await expect(repository.prepareIndex()).rejects.toThrow("access to build");
    expect(dependencies.loadCanonicalAssetFileEntries).not.toHaveBeenCalled();
    expect(dependencies.synchronizeCanonicalAssets).not.toHaveBeenCalled();
  });

  test("allows the publisher service to prepare an index without granting asset edits", async () => {
    const dependencies = createDependencies();
    dependencies.hasProjectPermit.mockResolvedValue(false);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue([]);
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const serviceContext = {
      ...context,
      authorization: { type: "service", isServiceCall: true },
    } as AppContext;
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context: serviceContext,
      assetStore: assetClient,
      dependencies,
    });

    await expect(repository.prepareIndex()).resolves.toMatchObject({
      documents: [],
    });
    await expect(repository.synchronize()).rejects.toThrow("access to edit");
    expect(dependencies.hasProjectPermit).toHaveBeenCalledOnce();
    expect(dependencies.hasProjectPermit).toHaveBeenCalledWith(
      { projectId: "project-1", permit: "edit" },
      serviceContext
    );
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
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue(entries);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue(entries);
    dependencies.createAssetIndex.mockResolvedValue(index as never);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: assetClient,
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
      maxBytes: 500 * 1024,
    });
  });

  test.each([
    {
      name: "replacement",
      update: (entry: CanonicalAssetFileEntry) => ({
        ...entry,
        revision: "revision-replaced",
        document: {
          ...entry.document,
          revision: "revision-replaced",
          contentRef: "assets/post-replaced.md",
        },
      }),
      expectedPath: "post.md",
    },
    {
      name: "deletion",
      update: () => undefined,
      expectedPath: undefined,
    },
    {
      name: "folder movement",
      update: (entry: CanonicalAssetFileEntry) => ({
        ...entry,
        document: { ...entry.document, path: "archive/post.md" },
      }),
      expectedPath: "archive/post.md",
    },
  ])(
    "retries a snapshot after asset $name",
    async ({ update, expectedPath }) => {
      const dependencies = createDependencies();
      const initial = {
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
          contentRef: "assets/post.md",
          properties: {},
        },
      };
      const updated = update(initial);
      const current = updated === undefined ? [] : [updated];
      dependencies.loadCanonicalAssetBaseEntries
        .mockResolvedValueOnce([initial])
        .mockResolvedValueOnce(current)
        .mockResolvedValueOnce(current)
        .mockResolvedValueOnce(current);
      dependencies.loadCanonicalAssetFileEntries
        .mockResolvedValueOnce([initial])
        .mockResolvedValueOnce(current);
      dependencies.createAssetIndex.mockImplementation(createAssetIndex);
      const repository = new PostgresAssetRepository({
        projectId: "project-1",
        context,
        assetStore: assetClient,
        dependencies,
      });

      const index = await repository.prepareIndex();

      expect(index.documents[0]?.path).toBe(expectedPath);
      expect(dependencies.loadCanonicalAssetBaseEntries).toHaveBeenCalledTimes(
        4
      );
      expect(dependencies.loadCanonicalAssetFileEntries).toHaveBeenCalledTimes(
        2
      );
      expect(dependencies.createAssetIndex).toHaveBeenCalledOnce();
    }
  );

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
      repository.prepareIndex(
        createCompilationPlan({
          where: { all: [] },
          output: { mode: "base" },
        })
      )
    ).resolves.toBe(index);

    expect(dependencies.synchronizeCanonicalAssets).not.toHaveBeenCalled();
    expect(dependencies.loadCanonicalAssetFileEntries).not.toHaveBeenCalled();
    expect(dependencies.loadCanonicalAssetBaseEntries).toHaveBeenCalledWith({
      client: context.postgrest.client,
      projectId: "project-1",
    });
    expect(readFile).not.toHaveBeenCalled();
  });

  test("discovers fields without preparing excerpts or file bodies", async () => {
    const dependencies = createDependencies();
    const entry = {
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
        properties: { title: "Post" },
      },
    };
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue([
      { ...entry, document: { ...entry.document, properties: {} } },
    ]);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue([entry]);
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const readFile = vi.fn();
    const assetStore = { readFile };
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore,
      dependencies,
    });

    await expect(repository.readFieldCatalog()).resolves.toMatchObject({
      fields: { "properties.title": expect.any(Object) },
    });
    expect(dependencies.synchronizeCanonicalAssets).toHaveBeenCalledWith({
      client: context.postgrest.client,
      assetClient: assetStore,
      projectId: "project-1",
      assetIds: ["asset-1"],
      requirements: { structuredProperties: true, excerpt: false },
    });
    expect(readFile).not.toHaveBeenCalled();
  });

  test("coalesces and reuses compilation by source revision and plan", async () => {
    const dependencies = createDependencies();
    const entry = {
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
        properties: { title: "Post" },
      },
    };
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue([entry]);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue([entry]);
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: assetClient,
      dependencies,
      compilationCache: createContentCompilationCache(),
    });

    const [first, second] = await Promise.all([
      repository.readIndex(),
      repository.readIndex(),
    ]);
    const third = await repository.readIndex();

    expect(first).toBe(second);
    expect(second).toBe(third);
    expect(dependencies.createAssetIndex).toHaveBeenCalledOnce();
    expect(dependencies.synchronizeCanonicalAssets).toHaveBeenCalledOnce();
    expect(dependencies.loadCanonicalAssetFileEntries).toHaveBeenCalledOnce();

    const updatedEntry = {
      ...entry,
      revision: "revision-2",
      document: {
        ...entry.document,
        revision: "revision-2",
        contentRef: "post-revision-2.md",
      },
    };
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue([
      updatedEntry,
    ]);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue([
      updatedEntry,
    ]);

    const updated = await repository.readIndex();

    expect(updated).not.toBe(first);
    expect(dependencies.createAssetIndex).toHaveBeenCalledTimes(2);
  });

  test("keeps only required properties and excerpts in a prepared index", async () => {
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
          properties: { title: "Post", draft: true },
          excerpt: "Excerpt",
        },
      },
    ];
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue(
      entries.map((entry) => ({
        ...entry,
        document: { ...entry.document, properties: {}, excerpt: undefined },
      }))
    );
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue(entries);
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const uploadFile = vi.fn<AssetObjectStore["uploadFile"]>();
    const assetStore = { ...assetClient, uploadFile };
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore,
      dependencies,
    });

    const index = await repository.prepareIndex(
      createCompilationPlan({
        where: { all: [] },
        output: {
          mode: "fields",
          fields: [["properties", "title"]],
        },
      })
    );

    expect(index.documents[0].properties).toEqual({ title: "Post" });
    expect(index.documents[0]).not.toHaveProperty("excerpt");
    expect(dependencies.synchronizeCanonicalAssets).toHaveBeenCalledWith({
      client: context.postgrest.client,
      assetClient: assetStore,
      projectId: "project-1",
      assetIds: ["asset-1"],
      requirements: { structuredProperties: true, excerpt: false },
    });
    expect(uploadFile).not.toHaveBeenCalled();
  });

  test("prepares only files that can be used by configured queries", async () => {
    const dependencies = createDependencies();
    const createEntry = ({
      id,
      extension,
      properties,
    }: {
      id: string;
      extension: "md" | "json";
      properties: AssetFileDocument["properties"];
    }) => ({
      projectId: "project-1",
      assetId: id,
      revision: `revision-${id}`,
      document: {
        _id: id,
        _type: "asset.file" as const,
        name: `${id}.${extension}`,
        path: `content/${id}.${extension}`,
        key: id,
        extension,
        mimeType: extension === "md" ? "text/markdown" : "application/json",
        size: 10,
        revision: `revision-${id}`,
        contentRef: `${id}.${extension}`,
        properties,
      },
    });
    const entries = [
      createEntry({
        id: "published",
        extension: "md",
        properties: { draft: false },
      }),
      createEntry({
        id: "draft",
        extension: "md",
        properties: { draft: true },
      }),
      createEntry({
        id: "data",
        extension: "json",
        properties: { draft: false },
      }),
    ];
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue(
      entries.map((entry) => ({
        ...entry,
        document: { ...entry.document, properties: {} },
      }))
    );
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue(entries);
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: assetClient,
      dependencies,
    });

    const index = await repository.prepareIndex(
      createCompilationPlan({
        where: {
          all: [
            { field: ["extension"], operator: "eq", value: "md" },
            {
              field: ["properties", "draft"],
              operator: "ne",
              value: true,
            },
          ],
        },
        output: { mode: "base" },
      })
    );

    expect(dependencies.synchronizeCanonicalAssets).toHaveBeenCalledWith({
      client: context.postgrest.client,
      assetClient,
      projectId: "project-1",
      assetIds: ["published", "draft"],
      requirements: { structuredProperties: true, excerpt: false },
    });
    expect(dependencies.loadCanonicalAssetFileEntries).toHaveBeenCalledWith({
      client: context.postgrest.client,
      projectId: "project-1",
      assetIds: ["published", "draft"],
    });
    expect(index.documents.map(({ _id }) => _id)).toEqual(["published"]);
  });

  test("keeps matching metadata for totals while embedding only the selected content window", async () => {
    const dependencies = createDependencies();
    const entries = ["alpha", "beta"].map((id) => ({
      projectId: "project-1",
      assetId: id,
      revision: `revision-${id}`,
      document: {
        _id: id,
        _type: "asset.file" as const,
        name: `${id}.md`,
        path: `blog/${id}.md`,
        key: id,
        extension: "md",
        mimeType: "text/markdown",
        size: 4,
        revision: `revision-${id}`,
        contentRef: `${id}.md`,
        properties: {},
      },
    }));
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue(entries);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue(entries);
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const readFile = vi.fn().mockResolvedValue({
      data: new Blob(["Post"]).stream(),
      contentLength: 4,
    });
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: { readFile },
      dependencies,
    });

    const index = await repository.prepareIndex(
      createCompilationPlan({
        where: { all: [] },
        sort: [{ field: ["id"], direction: "asc" }],
        limit: 1,
        content: { mode: "full" },
      })
    );

    expect(index.documents.map(({ _id }) => _id)).toEqual(["alpha", "beta"]);
    expect(index.contents).toEqual({ "alpha.md": "Post" });
    expect(readFile).toHaveBeenCalledOnce();
  });

  test("fails publication when selected text content cannot be embedded", async () => {
    const dependencies = createDependencies();
    const entry = {
      projectId: "project-1",
      assetId: "post",
      revision: "revision-post",
      document: {
        _id: "post",
        _type: "asset.file" as const,
        name: "post.md",
        path: "blog/post.md",
        key: "post",
        extension: "md",
        mimeType: "text/markdown",
        size: 1,
        revision: "revision-post",
        contentRef: "post.md",
        properties: {},
      },
    };
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue([entry]);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue([entry]);
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: {
        readFile: vi.fn().mockResolvedValue({
          data: new Blob([new Uint8Array([0xff])]).stream(),
          contentLength: 1,
        }),
      },
      dependencies,
    });

    await expect(
      repository.prepareIndex(
        createCompilationPlan({
          where: { all: [] },
          sort: [],
          limit: 1,
          content: { mode: "full" },
        })
      )
    ).rejects.toMatchObject({
      name: "AssetIndexPreparationError",
      issues: [
        expect.objectContaining({
          assetId: "post",
          message: "Selected asset content is not valid UTF-8",
        }),
      ],
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
      assetStore: assetClient,
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
      assetStore: assetClient,
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
      assetStore: assetClient,
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
      assetStore: assetClient,
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
      assetStore: assetClient,
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
    const entry = {
      projectId: "project-1",
      assetId: "asset-1",
      revision,
      document: {
        _id: "asset-1",
        _type: "asset.file" as const,
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
    };
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue([
      { ...entry, document: { ...entry.document, properties: {} } },
    ]);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue([entry]);
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: assetClient,
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
      assetIds: ["asset-1"],
      requirements: { structuredProperties: true, excerpt: true },
    });
    expect(result.items).toEqual([
      expect.objectContaining({
        id: "asset-1",
        properties: { title: "New post" },
      }),
    ]);

    vi.mocked(assetClient.readFile).mockResolvedValue({
      data: new Blob(["# New post"]).stream(),
      contentLength: 10,
    });
    const publishedIndex = await repository.prepareIndex(
      createCompilationPlan({
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
      })
    );
    const publishedFetch = createPublishedAssetResourceFetch({
      baseUrl: "https://blog.example",
      deploymentId: "deployment-1",
      artifact: publishedIndex,
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
