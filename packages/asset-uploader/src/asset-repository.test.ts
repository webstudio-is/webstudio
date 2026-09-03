import { beforeEach, describe, expect, test, vi } from "vitest";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import type { AssetObjectStore } from "./client";
import { createUploadTicket, uploadFile } from "./upload";
import {
  loadCanonicalAssetBaseEntries,
  synchronizeCanonicalAssets,
} from "./canonical-metadata-backfill";
import {
  loadCanonicalAssetFileEntries,
  loadCanonicalAssetFileEntriesForRecovery,
} from "./canonical-metadata-persistence";
import {
  createContentCompilationPlan,
  createContentRuntimeArtifact,
  createLiteralContentCompilationQuery,
  assetQuery,
  serializeContentArtifact,
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

beforeEach(() => {
  vi.mocked(assetClient.readFile)
    .mockReset()
    .mockImplementation(async (name, range) => {
      const length = range?.length ?? 2;
      const content = name.endsWith(".json")
        ? length === 1
          ? "0"
          : "{}".padEnd(length)
        : " ".repeat(length);
      return {
        data: new Blob([content]).stream(),
        contentLength: length,
      };
    });
});

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

const createDependencies = () => {
  const loadFileEntries = vi
    .fn<typeof loadCanonicalAssetFileEntries>()
    .mockResolvedValue([]);
  return {
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
    loadCanonicalAssetFileEntries: loadFileEntries,
    loadCanonicalAssetFileEntriesForRecovery: vi
      .fn<typeof loadCanonicalAssetFileEntriesForRecovery>()
      .mockImplementation(async (input) => ({
        entries: await loadFileEntries(input),
        inconsistentRows: [],
      })),
    createAssetIndex: vi.fn<typeof createAssetIndex>(),
    updateAssetMetadataWithClient:
      vi.fn<typeof updateAssetMetadataWithClient>(),
    loadAssetsByProjectWithClient: vi
      .fn<typeof loadAssetsByProjectWithClient>()
      .mockResolvedValue([]),
    loadAssetFoldersByProjectWithClient:
      vi.fn<typeof loadAssetFoldersByProjectWithClient>(),
    upsertAssetFolderWithClient: vi.fn<typeof upsertAssetFolderWithClient>(),
    deleteAssetFoldersWithClient: vi.fn<typeof deleteAssetFoldersWithClient>(),
    createId: vi.fn(() => "folder-1"),
    now: vi.fn(() => new Date("2026-07-25T00:00:00.000Z")),
  };
};

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

    await expect(
      repository.query({
        query: {
          where: { all: [] },
          output: { mode: "base", includeMetadata: true },
        },
      })
    ).rejects.toThrow("access to view");
    await expect(repository.synchronize()).rejects.toThrow("access to edit");
    await expect(repository.prepareIndex()).rejects.toThrow("access to view");
    expect(dependencies.loadAssetsByProjectWithClient).not.toHaveBeenCalled();
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
    dependencies.loadCanonicalAssetFileEntries
      .mockResolvedValueOnce([
        {
          ...entries[0],
          revision: "stale-revision",
          document: {
            ...entries[0].document,
            revision: "stale-revision",
          },
        },
      ])
      .mockResolvedValue(entries);
    dependencies.createAssetIndex.mockResolvedValue(index as never);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: assetClient,
      dependencies,
    });

    await expect(repository.prepareIndex()).resolves.toBe(index);
    expect(dependencies.hasProjectPermit).toHaveBeenCalledWith(
      { projectId: "project-1", permit: "view" },
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
    expect(dependencies.loadCanonicalAssetFileEntries).toHaveBeenCalledTimes(2);
    expect(dependencies.createAssetIndex).toHaveBeenCalledWith({
      projectId: "project-1",
      entries,
      assetReferences: {},
      documentGraph: undefined,
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

  test("discards preparation warnings from an abandoned uncached snapshot", async () => {
    const dependencies = createDependencies();
    const initial: CanonicalAssetFileEntry = {
      projectId: "project-1",
      assetId: "removed",
      revision: "removed-r1",
      document: {
        _id: "removed",
        _type: "asset.file",
        name: "removed.md",
        path: "content/removed.md",
        key: "removed",
        extension: "md",
        mimeType: "text/markdown",
        size: 10,
        revision: "removed-r1",
        contentRef: "storage:removed",
        properties: {},
      },
    };
    dependencies.loadCanonicalAssetBaseEntries
      .mockResolvedValueOnce([initial])
      .mockResolvedValue([]);
    dependencies.synchronizeCanonicalAssets.mockResolvedValue({
      scanned: 1,
      indexed: 0,
      metadataUpdated: 0,
      unchanged: 0,
      removed: 0,
      skipped: 1,
      inconsistent: 0,
      issues: [
        {
          assetId: "removed",
          storageName: "storage:removed",
          revision: "removed-r1",
          message: "Object is missing",
        },
      ],
    });
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: assetClient,
      dependencies,
    });

    const result = await repository.query({
      query: {
        where: {
          field: ["properties", "title"],
          operator: "eq",
          value: "Healthy",
        },
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [["id"]],
        },
      },
    });

    expect(result.data.items).toEqual([]);
    expect(result.__diagnostics__.issues).toBeUndefined();
    expect(dependencies.synchronizeCanonicalAssets).toHaveBeenCalledOnce();
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
      repository.prepareIndex(
        createCompilationPlan({
          where: { all: [] },
          output: { mode: "base", includeMetadata: true },
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

  test("compiles concrete databases across dynamic query values", async () => {
    const dependencies = createDependencies();
    const entries = ["first", "second"].map((slug) => ({
      projectId: "project-1",
      assetId: slug,
      revision: `revision-${slug}`,
      document: {
        _id: slug,
        _type: "asset.file" as const,
        name: `${slug}.md`,
        path: `${slug}.md`,
        key: slug,
        extension: "md",
        mimeType: "text/markdown",
        size: 10,
        revision: `revision-${slug}`,
        contentRef: `${slug}.md`,
        properties: { slug, title: `${slug} post` },
      },
    }));
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue(
      entries.map((entry) => ({
        ...entry,
        document: { ...entry.document, properties: {} },
      }))
    );
    dependencies.loadCanonicalAssetFileEntries.mockImplementation(
      async ({ assetIds }) =>
        assetIds === undefined
          ? entries
          : entries.filter((entry) => assetIds.includes(entry.assetId))
    );
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const databasePlan = createContentCompilationPlan([
      {
        id: "post",
        where: {
          field: ["properties", "slug"],
          operator: "eq",
          value: { type: "dynamic" },
        },
        sort: [],
        limit: { type: "literal", value: 1 },
        offset: { type: "literal", value: 0 },
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [["properties", "title"]],
        },
        content: { mode: "none" },
      },
      {
        id: "posts",
        where: {
          field: ["extension"],
          operator: "eq",
          value: { type: "literal", value: "md" },
        },
        sort: [{ field: ["id"], direction: "asc" }],
        limit: { type: "literal", value: 1 },
        offset: { type: "dynamic" },
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [["properties", "title"]],
        },
        content: { mode: "none" },
      },
    ]);
    expect(databasePlan).toBeDefined();
    if (databasePlan === undefined) {
      return;
    }
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: assetClient,
      dependencies,
      compilationCache: createContentCompilationCache(),
    });
    const query = (slug: string) => ({
      query: {
        where: {
          field: ["properties", "slug"] as [string, string],
          operator: "eq" as const,
          value: slug,
        },
        limit: 1,
        output: {
          mode: "fields" as const,
          includeMetadata: false,
          fields: [["properties", "title"]],
        },
      },
    });
    const overviewQuery = (offset: number) => ({
      query: {
        where: { field: ["extension"], operator: "eq" as const, value: "md" },
        sort: [{ field: ["id"], direction: "asc" as const }],
        limit: 1,
        offset,
        output: {
          mode: "fields" as const,
          includeMetadata: false,
          fields: [["properties", "title"]],
        },
      },
    });

    const first = await repository.query(query("first"), {
      databasePlan,
      includeDiagnostics: false,
    });
    expect(first).toMatchObject({
      data: { items: [{ properties: { title: "first post" } }] },
    });
    expect(first).not.toHaveProperty("__diagnostics__");
    const second = await repository.query(query("second"), {
      databasePlan,
      includeDiagnostics: false,
    });
    expect(second).toMatchObject({
      data: { items: [{ properties: { title: "second post" } }] },
    });
    expect(second).not.toHaveProperty("__diagnostics__");
    await expect(
      repository.query(overviewQuery(0), {
        databasePlan,
        includeDiagnostics: false,
      })
    ).resolves.toMatchObject({
      data: { items: [{ properties: { title: "first post" } }] },
    });
    await expect(
      repository.query(overviewQuery(1), {
        databasePlan,
        includeDiagnostics: false,
      })
    ).resolves.toMatchObject({
      data: { items: [{ properties: { title: "second post" } }] },
    });

    expect(dependencies.createAssetIndex).toHaveBeenCalledTimes(4);
    expect(
      dependencies.createAssetIndex.mock.calls.map(([input]) => input.plan)
    ).not.toContain(databasePlan);
  });

  test("stops diagnostics work after cancellation during index preparation", async () => {
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
        properties: { category: "Tools", title: "Post" },
      },
    };
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue([entry]);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue([entry]);
    const controller = new AbortController();
    dependencies.createAssetIndex.mockImplementation(async (input) => {
      const artifact = await createAssetIndex(input);
      if (dependencies.createAssetIndex.mock.calls.length === 1) {
        controller.abort();
      }
      return artifact;
    });
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: assetClient,
      dependencies,
    });
    const query = {
      where: {
        field: ["properties", "category"] as [string, string],
        operator: "eq" as const,
        value: "Tools",
      },
      output: {
        mode: "fields" as const,
        includeMetadata: false,
        fields: [["properties", "title"]],
      },
      content: { mode: "none" as const },
    };
    const databasePlan = createCompilationPlan(query);

    await expect(
      repository.query({ query }, { databasePlan, signal: controller.signal })
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(dependencies.createAssetIndex).toHaveBeenCalledOnce();
    expect(dependencies.loadAssetsByProjectWithClient).not.toHaveBeenCalled();
  });

  test("executes an Assets request batch with one authorization and union index", async () => {
    const dependencies = createDependencies();
    const performanceEvents: unknown[] = [];
    const categories = ["Tools", "Strategy", "Guide", "Updates"];
    const entries = categories.map((category, index) => ({
      projectId: "project-1",
      assetId: `post-${index}`,
      revision: `revision-${index}`,
      document: {
        _id: `post-${index}`,
        _type: "asset.file" as const,
        name: `post-${index}.md`,
        path: `blog/posts/post-${index}.md`,
        key: `post-${index}`,
        extension: "md",
        mimeType: "text/markdown",
        size: 1,
        revision: `revision-${index}`,
        contentRef: `post-${index}.md`,
        properties: { category, title: `${category} post` },
      },
    }));
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue(
      entries.map((entry) => ({
        ...entry,
        document: { ...entry.document, properties: {} },
      }))
    );
    dependencies.loadCanonicalAssetFileEntries.mockImplementation(
      async ({ assetIds }) =>
        assetIds === undefined
          ? entries
          : entries.filter((entry) => assetIds.includes(entry.assetId))
    );
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: assetClient,
      dependencies,
      compilationCache: createContentCompilationCache(),
      onPerformanceEvent: (event: unknown) => performanceEvents.push(event),
    });
    const validRequests = categories.map((category) => ({
      query: {
        where: {
          field: ["properties", "category"] as [string, string],
          operator: "eq" as const,
          value: category,
        },
        output: {
          mode: "fields" as const,
          includeMetadata: false,
          fields: [["properties", "title"]],
        },
        content: { mode: "none" as const },
      },
    }));
    const requests = [...validRequests, { query: { limit: -1 } }];

    const results = await repository.queryMany(requests);

    expect(results.slice(0, -1)).toEqual(
      categories.map((category, index) => ({
        status: "fulfilled",
        value: {
          data: {
            items: [
              {
                id: `post-${index}`,
                properties: { title: `${category} post` },
              },
            ],
            totalCount: 1,
            hasMore: false,
          },
        },
      }))
    );
    expect(results.at(-1)).toMatchObject({
      status: "rejected",
      reason: { name: "ZodError" },
    });
    expect(dependencies.hasProjectPermit).toHaveBeenCalledOnce();
    expect(dependencies.loadCanonicalAssetBaseEntries).toHaveBeenCalledTimes(2);
    expect(dependencies.synchronizeCanonicalAssets).not.toHaveBeenCalled();
    expect(dependencies.loadCanonicalAssetFileEntries).toHaveBeenCalledOnce();
    expect(dependencies.createAssetIndex).toHaveBeenCalledOnce();
    expect(
      dependencies.createAssetIndex.mock.calls[0][0].plan?.queries
    ).toHaveLength(4);
    expect(performanceEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "phase-completed",
          phase: "repository-authorization",
          durationMs: expect.any(Number),
        }),
        expect.objectContaining({
          type: "phase-completed",
          phase: "index-preparation",
          durationMs: expect.any(Number),
        }),
        expect.objectContaining({
          type: "compilation-cache",
          status: "miss",
        }),
      ])
    );
  });

  test("hydrates concrete preview content instead of the saved dynamic plan", async () => {
    const dependencies = createDependencies();
    const sources = new Map([
      ["storage:post-a", "---\nslug: post-a\ntitle: First\n---\nFirst body\n"],
      [
        "storage:post-b",
        "---\nslug: post-b\ntitle: Second\n---\nSecond body\n",
      ],
    ]);
    const entries: CanonicalAssetFileEntry[] = [...sources].map(
      ([contentRef, source]) => {
        const slug = contentRef.slice("storage:".length);
        return {
          projectId: "project-1",
          assetId: slug,
          revision: `${slug}-r1`,
          document: {
            _id: slug,
            _type: "asset.file",
            name: `${slug}.md`,
            path: `content/${slug}.md`,
            key: slug,
            extension: "md",
            mimeType: "text/markdown; charset=utf-8",
            size: new TextEncoder().encode(source).byteLength,
            revision: `${slug}-r1`,
            contentRef,
            properties: {
              slug,
              title: slug === "post-a" ? "First" : "Second",
            },
          },
        };
      }
    );
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue(entries);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue(entries);
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const readFile = vi.fn(async (contentRef: string) => {
      const source = sources.get(contentRef);
      if (source === undefined) {
        throw new Error(`Missing source for ${contentRef}`);
      }
      return {
        data: new Blob([source]).stream(),
        contentLength: new TextEncoder().encode(source).byteLength,
      };
    });
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: { readFile },
      dependencies,
    });
    const databasePlan = createContentCompilationPlan([
      {
        id: "post-page",
        where: {
          field: ["properties", "slug"],
          operator: "eq",
          value: { type: "dynamic" },
        },
        sort: [],
        limit: { type: "literal", value: 1 },
        offset: { type: "literal", value: 0 },
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [["properties", "title"]],
        },
        content: { mode: "markdown-body-ref" },
      },
    ]);
    if (databasePlan === undefined) {
      throw new Error("Expected a build database plan");
    }

    const [result] = await repository.queryMany(
      [
        {
          query: {
            where: {
              field: ["properties", "slug"],
              operator: "eq",
              value: "post-a",
            },
            limit: 1,
            output: {
              mode: "fields",
              includeMetadata: false,
              fields: [["properties", "title"]],
            },
            content: { mode: "markdown-body-ref" },
          },
        },
      ],
      { databasePlan }
    );

    expect(result).toMatchObject({
      status: "fulfilled",
      value: {
        data: {
          items: [
            {
              id: "post-a",
              properties: { title: "First" },
              content: { text: "First body\n" },
            },
          ],
        },
      },
    });
    expect(readFile.mock.calls.map(([contentRef]) => contentRef)).toEqual([
      "storage:post-a",
    ]);
  });

  test("loads a shared referenced document once across batch plans", async () => {
    const dependencies = createDependencies();
    const sources = new Map([
      [
        "storage:post-a",
        '{"title":"First","author":{"$ref":"./author.md#frontmatter"}}',
      ],
      [
        "storage:post-b",
        '{"title":"Second","author":{"$ref":"./author.md#frontmatter"}}',
      ],
      ["storage:author", "---\nname: Ada\nrole: Writer\n---\nBio\n"],
    ]);
    const createEntry = ({
      id,
      name,
      properties,
    }: {
      id: string;
      name: string;
      properties: AssetFileDocument["properties"];
    }): CanonicalAssetFileEntry => {
      const contentRef = `storage:${id}`;
      const source = sources.get(contentRef);
      if (source === undefined) {
        throw new Error(`Missing source for ${id}`);
      }
      return {
        projectId: "project-1",
        assetId: id,
        revision: `${id}-r1`,
        document: {
          _id: id,
          _type: "asset.file",
          name,
          path: `content/${name}`,
          key: name.slice(0, name.lastIndexOf(".")),
          extension: name.endsWith(".json") ? "json" : "md",
          mimeType: name.endsWith(".json")
            ? "application/json"
            : "text/markdown; charset=utf-8",
          size: new TextEncoder().encode(source).byteLength,
          revision: `${id}-r1`,
          contentRef,
          properties,
        },
      };
    };
    const entries = [
      createEntry({
        id: "post-a",
        name: "post-a.json",
        properties: {
          title: "First",
          author: { $ref: "./author.md#frontmatter" },
        },
      }),
      createEntry({
        id: "post-b",
        name: "post-b.json",
        properties: {
          title: "Second",
          author: { $ref: "./author.md#frontmatter" },
        },
      }),
      createEntry({
        id: "author",
        name: "author.md",
        properties: { name: "Ada", role: "Writer" },
      }),
    ];
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue(entries);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue(entries);
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const readFile = vi.fn(async (contentRef: string) => {
      const source = sources.get(contentRef);
      if (source === undefined) {
        throw new Error(`Missing source for ${contentRef}`);
      }
      return {
        data: new Blob([source]).stream(),
        contentLength: new TextEncoder().encode(source).byteLength,
      };
    });
    const rootsSelected = vi.fn();
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: { readFile },
      dependencies,
      compilationCache: createContentCompilationCache(),
      onDocumentGraphEvent: (event) => {
        if (event.type === "roots-selected") {
          rootsSelected(event.rootCount);
        }
      },
    });
    const requests = ["post-a", "post-b"].map((id) => ({
      query: {
        where: { all: [{ field: ["id"], operator: "eq" as const, value: id }] },
        output: {
          mode: "fields" as const,
          includeMetadata: false,
          fields: [
            ["properties", "title"],
            ["properties", "author"],
          ],
        },
      },
    }));
    const databasePlan = createContentCompilationPlan([
      createLiteralContentCompilationQuery({
        id: "post-resource-0",
        query: assetQuery.parse(requests[0].query),
      }),
    ]);
    if (databasePlan === undefined) {
      throw new Error("Expected a build database plan");
    }
    await repository.queryMany(requests, { databasePlan });
    readFile.mockClear();
    rootsSelected.mockClear();

    const results = await repository.queryMany(requests, { databasePlan });

    expect(results).toMatchObject([
      {
        status: "fulfilled",
        value: {
          data: {
            items: [
              {
                properties: {
                  title: "First",
                  author: { name: "Ada", role: "Writer" },
                },
              },
            ],
          },
        },
      },
      {
        status: "fulfilled",
        value: {
          data: {
            items: [
              {
                properties: {
                  title: "Second",
                  author: { name: "Ada", role: "Writer" },
                },
              },
            ],
          },
        },
      },
    ]);
    expect(
      readFile.mock.calls.filter(
        ([contentRef]) => contentRef === "storage:author"
      )
    ).toHaveLength(1);
    expect(rootsSelected.mock.calls).toEqual([[1], [1]]);
  });

  test("prepares revision-pinned batch items independently", async () => {
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
      assetStore: assetClient,
      dependencies,
    });

    const [result] = await repository.queryMany([
      {
        indexRevision: `sha256:${"f".repeat(64)}`,
        query: { where: { all: [] } },
      },
    ]);

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toBeInstanceOf(Error);
      expect(result.reason.name).toBe("AssetIndexRevisionError");
    }
    expect(
      dependencies.createAssetIndex.mock.calls[0][0].plan?.queries[0].id
    ).toBe("preview");
  });

  test("uses the build database for a covered revision-pinned query", async () => {
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
        properties: { category: "Tools", title: "Post" },
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
    const query = {
      where: {
        field: ["properties", "category"] as [string, string],
        operator: "eq" as const,
        value: "Tools",
      },
      output: {
        mode: "fields" as const,
        includeMetadata: false,
        fields: [["properties", "title"]],
      },
      content: { mode: "none" as const },
    };
    const databasePlan = createCompilationPlan(query);
    const artifact = await repository.prepareIndex(databasePlan);

    const [result] = await repository.queryMany(
      [{ query, indexRevision: artifact.integrity.checksum }],
      { databasePlan }
    );

    expect(result).toMatchObject({
      status: "fulfilled",
      value: {
        data: {
          items: [{ id: "post", properties: { title: "Post" } }],
        },
      },
    });
    expect(dependencies.createAssetIndex).toHaveBeenCalledTimes(2);
    expect(
      dependencies.createAssetIndex.mock.calls.map(([input]) => input.plan)
    ).toEqual([databasePlan, databasePlan]);
  });

  test("falls back to individual queries when the union index is truncated", async () => {
    const dependencies = createDependencies();
    const entries = ["Tools", "Updates"].map((category, index) => ({
      projectId: "project-1",
      assetId: `post-${index}`,
      revision: `revision-${index}`,
      document: {
        _id: `post-${index}`,
        _type: "asset.file" as const,
        name: `post-${index}.md`,
        path: `blog/post-${index}.md`,
        key: `post-${index}`,
        extension: "md",
        mimeType: "text/markdown",
        size: 1,
        revision: `revision-${index}`,
        contentRef: `post-${index}.md`,
        properties: { category, payload: "x".repeat(1_200) },
      },
    }));
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue(entries);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue(entries);
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: assetClient,
      dependencies,
      contentDatabaseMaxBytes: 2_500,
    });
    const requests = ["Tools", "Updates"].map((category) => ({
      query: {
        where: {
          field: ["properties", "category"] as [string, string],
          operator: "eq" as const,
          value: category,
        },
        output: {
          mode: "fields" as const,
          includeMetadata: false,
          fields: [["properties", "payload"]],
        },
      },
    }));

    const results = await repository.queryMany(requests);

    expect(results.map(({ status }) => status)).toEqual([
      "fulfilled",
      "fulfilled",
    ]);
    expect(dependencies.createAssetIndex).toHaveBeenCalledTimes(3);
    expect(
      dependencies.createAssetIndex.mock.calls[0][0].plan?.queries
    ).toHaveLength(2);
    expect(
      dependencies.createAssetIndex.mock.calls
        .slice(1)
        .map(([input]) => input.plan?.queries[0].id)
    ).toEqual(["preview", "preview"]);
  });

  test("uses a concrete union instead of a truncated build plan", async () => {
    const dependencies = createDependencies();
    const entries = ["Tools", "Updates"].map((category, index) => ({
      projectId: "project-1",
      assetId: `post-${index}`,
      revision: `revision-${index}`,
      document: {
        _id: `post-${index}`,
        _type: "asset.file" as const,
        name: `post-${index}.md`,
        path: `blog/post-${index}.md`,
        key: `post-${index}`,
        extension: "md",
        mimeType: "text/markdown",
        size: 1,
        revision: `revision-${index}`,
        contentRef: `post-${index}.md`,
        properties: { category, payload: "x".repeat(1_200) },
      },
    }));
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue(entries);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue(entries);
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: assetClient,
      dependencies,
      contentDatabaseMaxBytes: 2_500,
    });
    const requests = ["Tools", "Updates"].map((category) => ({
      query: {
        where: {
          field: ["properties", "category"] as [string, string],
          operator: "eq" as const,
          value: category,
        },
        output: {
          mode: "fields" as const,
          includeMetadata: false,
          fields: [["properties", "payload"]],
        },
      },
    }));
    const databasePlan = createContentCompilationPlan(
      requests.map(({ query }, index) =>
        createLiteralContentCompilationQuery({
          id: `build-resource-${index}`,
          query: assetQuery.parse(query),
        })
      )
    );
    if (databasePlan === undefined) {
      throw new Error("Expected a build database plan");
    }

    const results = await repository.queryMany(requests, { databasePlan });

    expect(results.map(({ status }) => status)).toEqual([
      "fulfilled",
      "fulfilled",
    ]);
    expect(dependencies.createAssetIndex).toHaveBeenCalledTimes(3);
    expect(dependencies.createAssetIndex.mock.calls[0][0].plan).not.toBe(
      databasePlan
    );
    expect(
      dependencies.createAssetIndex.mock.calls[0][0].plan?.queries
    ).toHaveLength(2);
  });

  test("falls back to independent queries when union preparation fails", async () => {
    const dependencies = createDependencies();
    const entries = ["Tools", "Updates"].map((category, index) => ({
      projectId: "project-1",
      assetId: `post-${index}`,
      revision: `revision-${index}`,
      document: {
        _id: `post-${index}`,
        _type: "asset.file" as const,
        name: `post-${index}.md`,
        path: `blog/post-${index}.md`,
        key: `post-${index}`,
        extension: "md",
        mimeType: "text/markdown",
        size: 1,
        revision: `revision-${index}`,
        contentRef: `post-${index}.md`,
        properties: { category },
      },
    }));
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue(entries);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue(entries);
    dependencies.createAssetIndex.mockImplementation(async (input) => {
      if (input.plan?.queries.length === 2) {
        throw new Error("Union compilation failed");
      }
      return await createAssetIndex(input);
    });
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: assetClient,
      dependencies,
    });
    const requests = ["Tools", "Updates"].map((category) => ({
      query: {
        where: {
          field: ["properties", "category"] as [string, string],
          operator: "eq" as const,
          value: category,
        },
        output: {
          mode: "fields" as const,
          includeMetadata: false,
          fields: [["properties", "category"]],
        },
        content: { mode: "none" as const },
      },
    }));

    const results = await repository.queryMany(requests);

    expect(results.map(({ status }) => status)).toEqual([
      "fulfilled",
      "fulfilled",
    ]);
    expect(dependencies.createAssetIndex).toHaveBeenCalledTimes(3);
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
      contentDatabaseMaxBytes: 1,
    });

    await expect(repository.readFieldCatalog()).resolves.toMatchObject({
      fields: { "properties.title": expect.any(Object) },
    });
    expect(dependencies.synchronizeCanonicalAssets).not.toHaveBeenCalled();
    expect(dependencies.createAssetIndex).not.toHaveBeenCalled();
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
    });

    const [first, second] = await Promise.all([
      repository.prepareIndex(),
      repository.prepareIndex(),
    ]);
    const third = await repository.prepareIndex();

    expect(first).toBe(second);
    expect(second).toBe(third);
    expect(dependencies.createAssetIndex).toHaveBeenCalledOnce();
    expect(dependencies.synchronizeCanonicalAssets).not.toHaveBeenCalled();
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

    const updated = await repository.prepareIndex();

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
    expect(dependencies.synchronizeCanonicalAssets).not.toHaveBeenCalled();
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
    dependencies.loadCanonicalAssetFileEntries.mockImplementation(
      async ({ assetIds }) =>
        assetIds === undefined
          ? entries
          : entries.filter((entry) => assetIds.includes(entry.assetId))
    );
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
        output: { mode: "base", includeMetadata: true },
      })
    );

    expect(dependencies.synchronizeCanonicalAssets).not.toHaveBeenCalled();
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
    expect(dependencies.synchronizeCanonicalAssets).not.toHaveBeenCalled();
    expect(dependencies.loadCanonicalAssetFileEntries).not.toHaveBeenCalled();
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
      name: "DocumentSourceDiagnosticsError",
      diagnostics: [
        {
          severity: "error",
          phase: "source",
          code: "MARKDOWN_BODY_DECODING_FAILED",
          message: "Markdown content is not valid UTF-8",
          assetId: "post",
          path: "blog/post.md",
        },
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
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue([
      {
        projectId: "project-1",
        assetId: "broken",
        revision: "file:broken.md:now:4",
        document: {
          _id: "broken",
          _type: "asset.file",
          name: "broken.md",
          path: "broken.md",
          key: "broken",
          extension: "md",
          mimeType: "text/markdown",
          size: 4,
          revision: "file:broken.md:now:4",
          contentRef: "broken.md",
          properties: {},
        },
      },
    ]);
    dependencies.loadCanonicalAssetFileEntriesForRecovery.mockResolvedValue({
      entries: [],
      inconsistentRows: [],
    });
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

  test("keeps unrelated broken assets out of query diagnostics", async () => {
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
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue([
      {
        projectId: "project-1",
        assetId: "broken",
        revision: "revision-broken",
        document: {
          _id: "broken",
          _type: "asset.file",
          name: "broken.md",
          path: "broken.md",
          key: "broken",
          extension: "md",
          mimeType: "text/markdown",
          size: 4,
          revision: "revision-broken",
          contentRef: "broken.md",
          properties: {},
        },
      },
    ]);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue([]);
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: assetClient,
      dependencies,
    });

    const request = {
      query: {
        where: {
          all: [
            {
              field: ["properties", "title"],
              operator: "eq",
              value: "Healthy",
            },
          ],
        },
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [["id"]],
        },
      },
    } satisfies Parameters<typeof repository.query>[0];
    const result = await repository.query(request);
    const cachedResult = await repository.query(request);

    expect(result).toMatchObject({
      data: { items: [] },
      __diagnostics__: {
        queryIssues: [
          expect.objectContaining({
            severity: "warning",
            code: "UNOBSERVED_FIELD",
          }),
        ],
      },
    });
    expect(result.__diagnostics__.issues).toBeUndefined();
    expect(cachedResult.__diagnostics__.queryIssues).toEqual(
      result.__diagnostics__.queryIssues
    );
    expect(dependencies.createAssetIndex).toHaveBeenCalledTimes(2);
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
    dependencies.loadAssetsByProjectWithClient.mockResolvedValue([
      uploadedAsset,
    ]);
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
        metadataError: {
          code: "FRONTMATTER_INVALID",
          message: "Invalid YAML in post.md",
        },
      },
    };
    const otherEntry = {
      ...entry,
      assetId: "asset-2",
      revision: "revision-2",
      document: {
        ...entry.document,
        _id: "asset-2",
        name: "other.md",
        path: "other.md",
        key: "other.md",
        revision: "revision-2",
        contentRef: "other.md",
        properties: { title: "Other post" },
        metadataError: undefined,
      },
    };
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue([
      { ...entry, document: { ...entry.document, properties: {} } },
      { ...otherEntry, document: { ...otherEntry.document, properties: {} } },
    ]);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue([
      entry,
      otherEntry,
    ]);
    dependencies.loadCanonicalAssetFileEntriesForRecovery.mockResolvedValue({
      entries: [],
      inconsistentRows: [],
    });
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
    const result = await repository.query(
      {
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
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["id"], ["name"]],
          },
        },
      },
      {
        databasePlan: createCompilationPlan({
          where: { all: [] },
          output: { mode: "all", includeMetadata: true },
        }),
        includeUnresolvedDiagnostics: true,
      }
    );

    expect(dependencies.synchronizeCanonicalAssets).toHaveBeenCalledWith({
      client: context.postgrest.client,
      assetClient,
      projectId: "project-1",
      assetIds: ["asset-1", "asset-2"],
      requirements: { structuredProperties: true, excerpt: false },
    });
    expect(result.data.items).toEqual([
      expect.objectContaining({
        id: "asset-1",
      }),
    ]);
    expect(result.__diagnostics__).toMatchObject({
      scope: "query-preview",
      unresolved: result.data,
      query: {
        includedDocumentCount: 1,
        omittedDocumentCount: 0,
        truncated: false,
      },
      database: {
        includedDocumentCount: 2,
        omittedDocumentCount: 0,
        truncated: false,
      },
      issues: [
        {
          severity: "warning",
          scope: "query",
          phase: "metadata",
          code: "FRONTMATTER_INVALID",
          message: "Invalid YAML in post.md",
          assetId: "asset-1",
          path: "post.md",
        },
      ],
      issueCount: 1,
      issuesTruncated: false,
    });
    expect(result.__diagnostics__.database.usedBytes).toBeGreaterThan(
      result.__diagnostics__.query.usedBytes
    );
    expect(dependencies.loadAssetsByProjectWithClient).not.toHaveBeenCalled();
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue([
      { ...entry, document: { ...entry.document, properties: {} } },
    ]);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue([entry]);

    const urlResult = await repository.query({
      query: {
        where: { all: [] },
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [["url"]],
        },
      },
    });
    expect(urlResult.data.items).toEqual([
      { id: "asset-1", url: "/cgi/asset/post.md?format=raw" },
    ]);
    expect(urlResult.__diagnostics__.unresolved).toBeUndefined();
    expect(dependencies.loadAssetsByProjectWithClient).toHaveBeenCalledWith(
      "project-1",
      context.postgrest.client,
      ["asset-1"]
    );
    dependencies.loadAssetsByProjectWithClient.mockClear();

    const idOnlyResult = await repository.query({
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
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [["id"]],
        },
      },
    });
    expect(idOnlyResult.__diagnostics__.query.usedBytes).toBeLessThan(
      result.__diagnostics__.query.usedBytes
    );
    expect(dependencies.loadAssetsByProjectWithClient).not.toHaveBeenCalled();

    const unobservedFieldResult = await repository.query({
      query: {
        where: {
          all: [
            {
              field: ["properties", "subtitle"],
              operator: "exists",
              value: false,
            },
          ],
        },
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [["id"]],
        },
      },
    });
    expect(unobservedFieldResult.__diagnostics__.queryWarnings).toEqual([
      "Asset field properties.subtitle is not currently observed",
    ]);
    expect(unobservedFieldResult.__diagnostics__.queryIssues).toEqual([
      {
        severity: "warning",
        code: "UNOBSERVED_FIELD",
        path: ["query", "where", "all", "0", "field"],
        message: "Asset field properties.subtitle is not currently observed",
      },
    ]);

    vi.mocked(assetClient.readFile).mockImplementation(async () => ({
      data: new Blob(["# New post"]).stream(),
      contentLength: 10,
    }));
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
      artifact: createContentRuntimeArtifact(publishedIndex),
      runtimeAssets: { "asset-1": { url: "/assets/post.md" } },
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

  test("reports every MDX error matched by a query without content output", async () => {
    const dependencies = createDependencies();
    const brokenSource = "<ws.element";
    const entries = ["one", "two"].map(
      (id): CanonicalAssetFileEntry => ({
        projectId: "project-1",
        assetId: id,
        revision: `${id}-r1`,
        document: {
          _id: id,
          _type: "asset.file",
          name: `${id}.mdx`,
          path: `content/${id}.mdx`,
          key: id,
          extension: "mdx",
          mimeType: "text/mdx",
          size: new TextEncoder().encode(brokenSource).byteLength,
          revision: `${id}-r1`,
          contentRef: `storage:${id}`,
          properties: {},
        },
      })
    );
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue(entries);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue(entries);
    dependencies.loadCanonicalAssetFileEntriesForRecovery.mockResolvedValue({
      entries,
      inconsistentRows: [],
    });
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: {
        readFile: async () => ({
          data: new Blob([brokenSource]).stream(),
          contentLength: brokenSource.length,
        }),
      },
      dependencies,
    });

    await expect(
      repository.query({
        query: {
          where: { all: [] },
          limit: 2,
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["id"]],
          },
          content: { mode: "none" },
        },
      })
    ).rejects.toMatchObject({
      diagnostics: [
        { severity: "error", path: "content/one.mdx" },
        { severity: "error", path: "content/two.mdx" },
      ],
    });
  });

  test("validates every matching file before pagination", async () => {
    const dependencies = createDependencies();
    const brokenSource = "<ws.element";
    const entries: CanonicalAssetFileEntry[] = [
      {
        projectId: "project-1",
        assetId: "image",
        revision: "image-r1",
        document: {
          _id: "image",
          _type: "asset.file",
          name: "a.png",
          path: "content/a.png",
          key: "a",
          extension: "png",
          mimeType: "image/png",
          size: 1,
          revision: "image-r1",
          contentRef: "storage:image",
          properties: {},
          metadataError: {
            code: "FRONTMATTER_INVALID",
            message: "Image metadata could not be indexed",
          },
        },
      },
      {
        projectId: "project-1",
        assetId: "broken",
        revision: "broken-r1",
        document: {
          _id: "broken",
          _type: "asset.file",
          name: "b.mdx",
          path: "content/b.mdx",
          key: "b",
          extension: "mdx",
          mimeType: "text/mdx",
          size: brokenSource.length,
          revision: "broken-r1",
          contentRef: "storage:broken",
          properties: {},
          metadataError: {
            code: "FRONTMATTER_INVALID",
            message: "Broken metadata could not be indexed",
          },
        },
      },
    ];
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue(entries);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue(entries);
    dependencies.loadCanonicalAssetFileEntriesForRecovery.mockResolvedValue({
      entries,
      inconsistentRows: [],
    });
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const readFile = vi.fn(async () => ({
      data: new Blob([brokenSource]).stream(),
      contentLength: brokenSource.length,
    }));
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: { readFile },
      dependencies,
    });
    const query = {
      where: { all: [] },
      sort: [{ field: ["name"] as ["name"], direction: "asc" as const }],
      limit: 1,
      output: {
        mode: "fields" as const,
        includeMetadata: false,
        fields: [["id"] as ["id"]],
      },
      content: { mode: "none" as const },
    };

    await expect(repository.query({ query })).rejects.toMatchObject({
      diagnostics: [
        { severity: "warning", path: "content/a.png" },
        { severity: "warning", path: "content/b.mdx" },
        { severity: "error", path: "content/b.mdx" },
      ],
    });
    expect(readFile).toHaveBeenCalled();

    await expect(
      repository.query({ query: { ...query, offset: 1 } })
    ).rejects.toMatchObject({
      diagnostics: [
        { severity: "warning", path: "content/a.png" },
        { severity: "warning", path: "content/b.mdx" },
        { severity: "error", path: "content/b.mdx" },
      ],
    });
  });

  test("excludes diagnostics from files outside the query", async () => {
    const dependencies = createDependencies();
    const sources = {
      "storage:included": "# Included\n",
      "storage:unrelated": "<ws.element",
    } as const;
    const entries: CanonicalAssetFileEntry[] = [
      {
        projectId: "project-1",
        assetId: "included",
        revision: "included-r1",
        document: {
          _id: "included",
          _type: "asset.file",
          name: "included.md",
          path: "content/included.md",
          key: "included",
          extension: "md",
          mimeType: "text/markdown",
          size: sources["storage:included"].length,
          revision: "included-r1",
          contentRef: "storage:included",
          properties: {},
        },
      },
      {
        projectId: "project-1",
        assetId: "unrelated",
        revision: "unrelated-r1",
        document: {
          _id: "unrelated",
          _type: "asset.file",
          name: "unrelated.mdx",
          path: "content/unrelated.mdx",
          key: "unrelated",
          extension: "mdx",
          mimeType: "text/mdx",
          size: sources["storage:unrelated"].length,
          revision: "unrelated-r1",
          contentRef: "storage:unrelated",
          properties: {},
          metadataError: {
            code: "FRONTMATTER_INVALID",
            message: "Unrelated metadata is invalid",
          },
        },
      },
    ];
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue(entries);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue(entries);
    dependencies.loadCanonicalAssetFileEntriesForRecovery.mockResolvedValue({
      entries,
      inconsistentRows: [],
    });
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const readFile = vi.fn(async (contentRef: string) => ({
      data: new Blob([sources[contentRef as keyof typeof sources]]).stream(),
      contentLength: sources[contentRef as keyof typeof sources].length,
    }));
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: { readFile },
      dependencies,
    });

    const result = await repository.query(
      {
        query: {
          where: { field: ["id"], operator: "eq", value: "included" },
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["id"]],
          },
          content: { mode: "none" },
        },
      },
      {
        diagnosticsPlan: createCompilationPlan({
          where: { all: [] },
          output: { mode: "all", includeMetadata: true },
        }),
      }
    );

    expect(result.__diagnostics__.issues).toBeUndefined();
    expect(readFile).not.toHaveBeenCalledWith("storage:unrelated");
  });

  test("keeps source warnings when one matching document reference is invalid", async () => {
    const dependencies = createDependencies();
    const sources = {
      "storage:warning": "{1 + 1}",
      "storage:broken": '{"author":{"$ref":"./missing.md#frontmatter"}}',
    } as const;
    const entries: CanonicalAssetFileEntry[] = [
      {
        projectId: "project-1",
        assetId: "warning",
        revision: "warning-r1",
        document: {
          _id: "warning",
          _type: "asset.file",
          name: "warning.mdx",
          path: "content/warning.mdx",
          key: "warning",
          extension: "mdx",
          mimeType: "text/mdx",
          size: sources["storage:warning"].length,
          revision: "warning-r1",
          contentRef: "storage:warning",
          properties: {},
        },
      },
      {
        projectId: "project-1",
        assetId: "broken",
        revision: "broken-r1",
        document: {
          _id: "broken",
          _type: "asset.file",
          name: "broken.json",
          path: "content/broken.json",
          key: "broken",
          extension: "json",
          mimeType: "application/json",
          size: sources["storage:broken"].length,
          revision: "broken-r1",
          contentRef: "storage:broken",
          properties: {
            author: { $ref: "./missing.md#frontmatter" },
          },
        },
      },
    ];
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue(entries);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue(entries);
    dependencies.loadCanonicalAssetFileEntriesForRecovery.mockResolvedValue({
      entries,
      inconsistentRows: [],
    });
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: {
        readFile: async (contentRef: string) => ({
          data: new Blob([
            sources[contentRef as keyof typeof sources],
          ]).stream(),
          contentLength: sources[contentRef as keyof typeof sources].length,
        }),
      },
      dependencies,
    });

    await expect(
      repository.query({
        query: {
          where: { all: [] },
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["properties", "author"]],
          },
          content: { mode: "full" },
        },
      })
    ).rejects.toMatchObject({
      diagnostics: expect.arrayContaining([
        expect.objectContaining({
          severity: "warning",
          code: "unsafe-mdx",
          assetId: "warning",
          path: "content/warning.mdx",
        }),
        expect.objectContaining({
          severity: "error",
          code: "TARGET_NOT_FOUND",
          assetId: "broken",
          path: "content/broken.json",
          reference: "#/author",
        }),
      ]),
    });
  });

  test("ignores one unrelated saved-plan reference failure", async () => {
    const dependencies = createDependencies();
    const sources = {
      "storage:included": "# Included\n",
      "storage:unrelated": '{"author":{"$ref":"./missing.md#frontmatter"}}',
    } as const;
    const entries: CanonicalAssetFileEntry[] = [
      {
        projectId: "project-1",
        assetId: "included",
        revision: "included-r1",
        document: {
          _id: "included",
          _type: "asset.file",
          name: "included.md",
          path: "content/included.md",
          key: "included",
          extension: "md",
          mimeType: "text/markdown",
          size: sources["storage:included"].length,
          revision: "included-r1",
          contentRef: "storage:included",
          properties: {},
        },
      },
      {
        projectId: "project-1",
        assetId: "unrelated",
        revision: "unrelated-r1",
        document: {
          _id: "unrelated",
          _type: "asset.file",
          name: "unrelated.json",
          path: "content/unrelated.json",
          key: "unrelated",
          extension: "json",
          mimeType: "application/json",
          size: sources["storage:unrelated"].length,
          revision: "unrelated-r1",
          contentRef: "storage:unrelated",
          properties: {
            author: { $ref: "./missing.md#frontmatter" },
          },
        },
      },
    ];
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue(entries);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue(entries);
    dependencies.loadCanonicalAssetFileEntriesForRecovery.mockResolvedValue({
      entries,
      inconsistentRows: [],
    });
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: {
        readFile: async (contentRef: string) => ({
          data: new Blob([
            sources[contentRef as keyof typeof sources],
          ]).stream(),
          contentLength: sources[contentRef as keyof typeof sources].length,
        }),
      },
      dependencies,
    });

    const result = await repository.query(
      {
        query: {
          where: { field: ["id"], operator: "eq", value: "included" },
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["id"]],
          },
          content: { mode: "none" },
        },
      },
      {
        diagnosticsPlan: createCompilationPlan({
          where: { field: ["id"], operator: "eq", value: "unrelated" },
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["properties", "author"]],
          },
        }),
      }
    );

    expect(result.data).toMatchObject({
      items: [{ id: "included" }],
    });
    expect(result.__diagnostics__.issues).toBeUndefined();
  });

  test("validates the file returned by a single-result query", async () => {
    const dependencies = createDependencies();
    const brokenSource = "<ws.element";
    const entry: CanonicalAssetFileEntry = {
      projectId: "project-1",
      assetId: "broken",
      revision: "broken-r1",
      document: {
        _id: "broken",
        _type: "asset.file",
        name: "broken.mdx",
        path: "content/broken.mdx",
        key: "broken",
        extension: "mdx",
        mimeType: "text/mdx",
        size: brokenSource.length,
        revision: "broken-r1",
        contentRef: "storage:broken",
        properties: {},
      },
    };
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue([entry]);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue([entry]);
    dependencies.loadCanonicalAssetFileEntriesForRecovery.mockResolvedValue({
      entries: [entry],
      inconsistentRows: [],
    });
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: {
        readFile: async () => ({
          data: new Blob([brokenSource]).stream(),
          contentLength: brokenSource.length,
        }),
      },
      dependencies,
    });

    await expect(
      repository.query({
        query: {
          result: "one",
          where: { field: ["id"], operator: "eq", value: "broken" },
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["id"]],
          },
          content: { mode: "none" },
        },
      })
    ).rejects.toMatchObject({
      diagnostics: [{ severity: "error", path: "content/broken.mdx" }],
    });
  });

  test("shows the file when diagnostics cannot read its content", async () => {
    const dependencies = createDependencies();
    const entry: CanonicalAssetFileEntry = {
      projectId: "project-1",
      assetId: "post",
      revision: "post-r1",
      document: {
        _id: "post",
        _type: "asset.file",
        name: "post.md",
        path: "content/post.md",
        key: "post",
        extension: "md",
        mimeType: "text/markdown",
        size: 10,
        revision: "post-r1",
        contentRef: "storage:post",
        properties: {},
      },
    };
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue([entry]);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue([entry]);
    dependencies.loadCanonicalAssetFileEntriesForRecovery.mockResolvedValue({
      entries: [entry],
      inconsistentRows: [],
    });
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: {
        readFile: vi.fn().mockRejectedValue(new Error("Object is missing")),
      },
      dependencies,
    });

    const result = await repository.query({
      query: {
        where: { field: ["id"], operator: "eq", value: "post" },
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [["id"]],
        },
      },
    });

    expect(result.__diagnostics__.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "warning",
          code: "CONTENT_READ_FAILED",
          message: "Object is missing",
          assetId: "post",
          path: "content/post.md",
        }),
      ])
    );
  });

  test("returns fatal UTF-8 diagnostics from the shared byte validator", async () => {
    const dependencies = createDependencies();
    const entry: CanonicalAssetFileEntry = {
      projectId: "project-1",
      assetId: "invalid-utf8",
      revision: "invalid-utf8-r1",
      document: {
        _id: "invalid-utf8",
        _type: "asset.file",
        name: "invalid.md",
        path: "content/invalid.md",
        key: "invalid",
        extension: "md",
        mimeType: "text/markdown",
        size: 2,
        revision: "invalid-utf8-r1",
        contentRef: "storage:invalid-utf8",
        properties: {},
      },
    };
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue([entry]);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue([entry]);
    dependencies.loadCanonicalAssetFileEntriesForRecovery.mockResolvedValue({
      entries: [entry],
      inconsistentRows: [],
    });
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: {
        readFile: async () => ({
          data: new Blob([new Uint8Array([0xc3, 0x28])]).stream(),
          contentLength: 2,
        }),
      },
      dependencies,
    });

    await expect(
      repository.query({
        query: {
          where: { field: ["id"], operator: "eq", value: "invalid-utf8" },
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["id"]],
          },
          content: { mode: "none" },
        },
      })
    ).rejects.toMatchObject({
      diagnostics: [
        {
          severity: "error",
          phase: "source",
          code: "MARKDOWN_BODY_DECODING_FAILED",
          message: "Markdown content is not valid UTF-8",
          assetId: "invalid-utf8",
          path: "content/invalid.md",
        },
      ],
    });
  });

  test("preserves complete nonfatal MDX diagnostics", async () => {
    const dependencies = createDependencies();
    const source = "{1 + 1}";
    const entry: CanonicalAssetFileEntry = {
      projectId: "project-1",
      assetId: "unsafe-mdx",
      revision: "unsafe-mdx-r1",
      document: {
        _id: "unsafe-mdx",
        _type: "asset.file",
        name: "unsafe.mdx",
        path: "content/unsafe.mdx",
        key: "unsafe",
        extension: "mdx",
        mimeType: "text/mdx",
        size: source.length,
        revision: "unsafe-mdx-r1",
        contentRef: "storage:unsafe-mdx",
        properties: {},
      },
    };
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue([entry]);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue([entry]);
    dependencies.loadCanonicalAssetFileEntriesForRecovery.mockResolvedValue({
      entries: [entry],
      inconsistentRows: [],
    });
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: {
        readFile: async () => ({
          data: new Blob([source]).stream(),
          contentLength: source.length,
        }),
      },
      dependencies,
    });

    const result = await repository.query({
      query: {
        where: { field: ["id"], operator: "eq", value: "unsafe-mdx" },
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [["id"]],
        },
        content: { mode: "none" },
      },
    });

    expect(result.__diagnostics__.issues).toEqual([
      expect.objectContaining({
        severity: "warning",
        code: "unsafe-mdx",
        assetId: "unsafe-mdx",
        path: "content/unsafe.mdx",
        nodeType: "mdxFlowExpression",
        reason: "Executable MDX expressions are not supported",
        sourceRange: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 8, offset: 7 },
        },
      }),
    ]);
  });

  test("keeps exact content read warnings when another file is fatal", async () => {
    const dependencies = createDependencies();
    const brokenSource = "<ws.element";
    const entries: CanonicalAssetFileEntry[] = [
      {
        projectId: "project-1",
        assetId: "missing",
        revision: "missing-r1",
        document: {
          _id: "missing",
          _type: "asset.file",
          name: "missing.md",
          path: "content/missing.md",
          key: "missing",
          extension: "md",
          mimeType: "text/markdown",
          size: 10,
          revision: "missing-r1",
          contentRef: "storage:missing",
          properties: {},
        },
      },
      {
        projectId: "project-1",
        assetId: "broken",
        revision: "broken-r1",
        document: {
          _id: "broken",
          _type: "asset.file",
          name: "broken.mdx",
          path: "content/broken.mdx",
          key: "broken",
          extension: "mdx",
          mimeType: "text/mdx",
          size: brokenSource.length,
          revision: "broken-r1",
          contentRef: "storage:broken",
          properties: {},
        },
      },
    ];
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue(entries);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue(entries);
    dependencies.loadCanonicalAssetFileEntriesForRecovery.mockResolvedValue({
      entries,
      inconsistentRows: [],
    });
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: {
        readFile: async (contentRef) => {
          if (contentRef === "storage:missing") {
            throw new Error("Object is missing");
          }
          return {
            data: new Blob([brokenSource]).stream(),
            contentLength: brokenSource.length,
          };
        },
      },
      dependencies,
    });

    await expect(
      repository.query({
        query: {
          where: { all: [] },
          limit: 2,
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["id"]],
          },
          content: { mode: "none" },
        },
      })
    ).rejects.toMatchObject({
      diagnostics: expect.arrayContaining([
        expect.objectContaining({
          severity: "warning",
          code: "CONTENT_READ_FAILED",
          message: "Object is missing",
          path: "content/missing.md",
        }),
        expect.objectContaining({
          severity: "error",
          code: "invalid-mdx",
          path: "content/broken.mdx",
        }),
      ]),
    });
  });

  test("assembles document graph references in local query preview", async () => {
    const dependencies = createDependencies();
    const postSource =
      '{"title":"Hello","author":{"$ref":"./author.md#frontmatter"}}';
    const authorSource = "---\nname: Ada\nrole: Writer\n---\nBio\n";
    const createEntry = ({
      id,
      name,
      source,
      properties,
    }: {
      id: string;
      name: string;
      source: string;
      properties: AssetFileDocument["properties"];
    }): CanonicalAssetFileEntry => ({
      projectId: "project-1",
      assetId: id,
      revision: `${id}-r1`,
      document: {
        _id: id,
        _type: "asset.file",
        name,
        path: `content/${name}`,
        key: name.slice(0, name.lastIndexOf(".")),
        extension: name.endsWith(".json") ? "json" : "md",
        mimeType: name.endsWith(".json")
          ? "application/json"
          : "text/markdown; charset=utf-8",
        size: new TextEncoder().encode(source).byteLength,
        revision: `${id}-r1`,
        contentRef: `storage:${id}`,
        properties,
      },
    });
    const entries = [
      createEntry({
        id: "post",
        name: "post.json",
        source: postSource,
        properties: {
          title: "Hello",
          author: { $ref: "./author.md#frontmatter" },
        },
      }),
      createEntry({
        id: "author",
        name: "author.md",
        source: authorSource,
        properties: { name: "Ada", role: "Writer" },
      }),
    ];
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue(entries);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue(entries);
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const readFile = vi.fn(async (contentRef: string) => {
      const source = contentRef === "storage:post" ? postSource : authorSource;
      return {
        data: new Blob([source]).stream(),
        contentLength: new TextEncoder().encode(source).byteLength,
      };
    });
    const events: unknown[] = [];
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: { readFile },
      dependencies,
      onDocumentGraphEvent: (event) => events.push(event),
    });

    const result = await repository.query(
      {
        query: {
          where: { all: [{ field: ["id"], operator: "eq", value: "post" }] },
          limit: 1,
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [
              ["properties", "title"],
              ["properties", "author"],
            ],
          },
        },
      },
      { includeUnresolvedDiagnostics: true }
    );

    expect(result.data.items).toEqual([
      {
        id: "post",
        properties: {
          title: "Hello",
          author: { name: "Ada", role: "Writer" },
        },
      },
    ]);
    expect(result.__diagnostics__.unresolved?.items).toEqual([
      {
        id: "post",
        properties: {
          title: "Hello",
          author: { $ref: "./author.md#frontmatter" },
        },
      },
    ]);
    expect(result.__diagnostics__.artifacts).toEqual({
      query: expect.objectContaining({ format: "webstudio-content-database" }),
      database: expect.objectContaining({
        format: "webstudio-content-database",
      }),
    });
    expect(readFile).toHaveBeenCalledTimes(2);
    const artifacts = result.__diagnostics__.artifacts;
    if (artifacts === undefined) {
      throw new Error("Expected database artifacts in diagnostics");
    }
    expect(
      new TextEncoder().encode(serializeContentArtifact(artifacts.query))
        .byteLength
    ).toBe(result.__diagnostics__.query.unboundedBytes);
    expect(
      new TextEncoder().encode(serializeContentArtifact(artifacts.database))
        .byteLength
    ).toBe(result.__diagnostics__.database.unboundedBytes);
    expect(events).toEqual(
      expect.arrayContaining([
        { type: "roots-selected", rootCount: 1 },
        { type: "resolution-started", rootCount: 1, documentCount: 2 },
        {
          type: "document-fetch-started",
          documentId: "post",
          revision: "post-r1",
        },
        {
          type: "document-fetch-completed",
          documentId: "author",
          revision: "author-r1",
        },
        { type: "resolution-completed", rootCount: 1, documentCount: 2 },
      ])
    );
  });

  test("keeps deferred Markdown out of unresolved query diagnostics", async () => {
    const dependencies = createDependencies();
    const source = "---\nslug: post\ntitle: Post\n---\nStored body\n";
    const entry: CanonicalAssetFileEntry = {
      projectId: "project-1",
      assetId: "post",
      revision: "post-r1",
      document: {
        _id: "post",
        _type: "asset.file",
        name: "post.md",
        path: "content/post.md",
        key: "post",
        extension: "md",
        mimeType: "text/markdown; charset=utf-8",
        size: new TextEncoder().encode(source).byteLength,
        revision: "post-r1",
        contentRef: "storage:post",
        properties: { slug: "post", title: "Post" },
      },
    };
    dependencies.loadCanonicalAssetBaseEntries.mockResolvedValue([entry]);
    dependencies.loadCanonicalAssetFileEntries.mockResolvedValue([entry]);
    dependencies.createAssetIndex.mockImplementation(createAssetIndex);
    const readFile = vi.fn(async () => ({
      data: new Blob([source]).stream(),
      contentLength: entry.document.size,
    }));
    const performanceEvents: unknown[] = [];
    const repository = new PostgresAssetRepository({
      projectId: "project-1",
      context,
      assetStore: { readFile },
      dependencies,
      onPerformanceEvent: (event) => performanceEvents.push(event),
    });

    const result = await repository.query(
      {
        query: {
          where: {
            all: [
              {
                field: ["properties", "slug"],
                operator: "eq",
                value: "post",
              },
            ],
          },
          limit: 1,
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["properties", "title"]],
          },
          content: { mode: "markdown-body-ref" },
        },
      },
      { includeUnresolvedDiagnostics: true }
    );

    expect(result.data.items).toEqual([
      {
        id: "post",
        properties: { title: "Post" },
        content: { encoding: "utf-8", text: "Stored body\n" },
      },
    ]);
    expect(result.__diagnostics__.unresolved?.items).toEqual([
      { id: "post", properties: { title: "Post" } },
    ]);
    expect(result.__diagnostics__.artifacts?.query.contents).toBeUndefined();
    expect(result.__diagnostics__.artifacts?.query.documentGraph).toMatchObject(
      { nodes: [{ id: "post", format: "markdown" }], edges: [] }
    );
    expect(readFile).toHaveBeenCalledOnce();
    expect(performanceEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "phase-completed",
          phase: "document-graph",
          durationMs: expect.any(Number),
        }),
        expect.objectContaining({
          type: "phase-completed",
          phase: "source-validation",
          durationMs: expect.any(Number),
        }),
        {
          type: "content-read",
          purpose: "compiler-entry",
          byteLength: entry.document.size,
          durationMs: expect.any(Number),
        },
      ])
    );
  });
});
