import { describe, expect, test, vi } from "vitest";
import { createCanonicalAssetFileEntry } from "@webstudio-is/asset-resource";
import {
  createTestServer,
  db,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import type { AssetClient } from "./client";
import {
  createAssetContentRevision,
  synchronizeCanonicalAssetStandardMetadata,
  synchronizeCanonicalAsset,
  synchronizeCanonicalAssets,
} from "./canonical-metadata-backfill";

const server = createTestServer();
const encoder = new TextEncoder();

type ReplaceMetadataRpcArgs = {
  p_project_id: string;
  p_asset_id: string;
  p_revision: string;
  p_document: Record<string, unknown>;
  p_field_contributions: unknown[];
  p_source: Record<string, unknown>;
};

const entryFromReplaceRpc = (value: ReplaceMetadataRpcArgs) => ({
  projectId: value.p_project_id,
  assetId: value.p_asset_id,
  revision: value.p_revision,
  document: value.p_document,
  fieldContributions: value.p_field_contributions,
  source: value.p_source,
});

describe("canonical asset metadata synchronization", () => {
  test("indexes every asset and reads content only for Markdown files", async () => {
    const contents = new Map([
      ["stored-one.md", "---\ntitle: One\n---\n# First post"],
      ["stored-two.md", "---\ntitle: Two\ndraft: true\n---\nSecond post"],
    ]);
    const readFile = vi.fn<AssetClient["readFile"]>(async (name) => ({
      data: {
        async *[Symbol.asyncIterator]() {
          yield encoder.encode(contents.get(name) ?? "");
        },
      },
    }));
    const persisted: unknown[] = [];
    server.use(
      db.get("Asset", () =>
        json([
          {
            id: "one",
            projectId: "project-1",
            filename: "one",
            folderId: "blog",
            file: {
              name: "stored-one.md",
              size: encoder.encode(contents.get("stored-one.md")).byteLength,
              updatedAt: "2026-07-18T01:00:00.000Z",
              status: "UPLOADED",
            },
          },
          {
            id: "two",
            projectId: "project-1",
            filename: null,
            folderId: null,
            file: {
              name: "stored-two.md",
              size: encoder.encode(contents.get("stored-two.md")).byteLength,
              updatedAt: "2026-07-18T02:00:00.000Z",
              status: "UPLOADED",
            },
          },
          {
            id: "image",
            projectId: "project-1",
            filename: null,
            folderId: null,
            file: {
              name: "image.png",
              size: 20,
              updatedAt: "2026-07-18T03:00:00.000Z",
              status: "UPLOADED",
            },
          },
        ])
      ),
      db.get("AssetFolder", () =>
        json([
          {
            id: "content",
            projectId: "project-1",
            name: "Content",
            parentId: null,
            createdAt: "2026-07-18T00:00:00.000Z",
          },
          {
            id: "blog",
            projectId: "project-1",
            name: "Blog",
            parentId: "content",
            createdAt: "2026-07-18T00:00:00.000Z",
          },
        ])
      ),
      db.get("AssetFileMetadata", () => json([])),
      db.post("rpc/replace_asset_file_metadata", async ({ request }) => {
        const value = (await request.json()) as ReplaceMetadataRpcArgs;
        persisted.push(entryFromReplaceRpc(value));
        return json(true);
      })
    );

    const result = await synchronizeCanonicalAssets({
      projectId: "project-1",
      client: testContext.postgrest.client,
      assetClient: {
        uploadFile: vi.fn(),
        readFile,
      },
      concurrency: 2,
    });

    expect(result).toEqual({
      scanned: 3,
      indexed: 3,
      metadataUpdated: 0,
      unchanged: 0,
      removed: 0,
      skipped: 0,
      inconsistent: 0,
    });
    expect(readFile).toHaveBeenCalledTimes(2);
    expect(persisted).toHaveLength(3);
    expect(persisted).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assetId: "one",
          document: expect.objectContaining({
            path: "Content/Blog/one.md",
            properties: { title: "One" },
            excerpt: "First post",
          }),
        }),
        expect.objectContaining({
          assetId: "two",
          document: expect.objectContaining({
            path: "stored-two.md",
            properties: { title: "Two", draft: true },
            excerpt: "Second post",
          }),
        }),
        expect.objectContaining({
          assetId: "image",
          document: expect.objectContaining({
            path: "image.png",
            properties: {},
          }),
        }),
      ])
    );
  });

  test("indexes an empty Markdown file without a storage range read", async () => {
    const storageName = "empty_abcdefghijklmnopqrstu.md";
    const readFile = vi.fn<AssetClient["readFile"]>();
    let document: Record<string, unknown> | undefined;
    server.use(
      db.get("Asset", () =>
        json([
          {
            id: "empty",
            projectId: "project-1",
            filename: "empty",
            folderId: null,
            file: {
              name: storageName,
              size: 0,
              updatedAt: "2026-07-18T01:00:00.000Z",
              status: "UPLOADED",
            },
          },
        ])
      ),
      db.get("AssetFolder", () => json([])),
      db.post("rpc/replace_asset_file_metadata", async ({ request }) => {
        document = ((await request.json()) as ReplaceMetadataRpcArgs)
          .p_document;
        return json(true);
      })
    );

    await expect(
      synchronizeCanonicalAsset({
        projectId: "project-1",
        assetId: "empty",
        client: testContext.postgrest.client,
        assetClient: { uploadFile: vi.fn(), readFile },
      })
    ).resolves.toMatchObject({ status: "indexed" });
    expect(readFile).not.toHaveBeenCalled();
    expect(document).toMatchObject({
      name: "empty.md",
      path: "empty.md",
      properties: {},
      size: 0,
      contentRef: storageName,
    });
  });

  test("creates a stable revision from immutable storage identity", () => {
    expect(
      createAssetContentRevision({
        storageName: "folder/post.md",
        updatedAt: "2026-07-18T00:00:00.000Z",
        size: 42,
      })
    ).toBe("file:folder%2Fpost.md:2026-07-18T00:00:00.000Z:42");
  });

  test("does not exceed shared read concurrency", async () => {
    await expect(
      synchronizeCanonicalAssets({
        projectId: "project-1",
        client: testContext.postgrest.client,
        assetClient: {
          uploadFile: vi.fn(),
          readFile: vi.fn(),
        },
        concurrency: 9,
      })
    ).rejects.toThrow("exceeds the shared limit");
  });

  test("reindexes only the selected Markdown asset after a content change", async () => {
    const source = "---\ntitle: Updated\n---\nUpdated body";
    const readFile = vi.fn<AssetClient["readFile"]>(async () => ({
      data: {
        async *[Symbol.asyncIterator]() {
          yield encoder.encode(source);
        },
      },
    }));
    let persisted: Record<string, unknown> | undefined;
    server.use(
      db.get("Asset", ({ request }) => {
        expect(new URL(request.url).searchParams.get("id")).toBe(
          "in.(asset-1)"
        );
        return json([
          {
            id: "asset-1",
            projectId: "project-1",
            filename: "renamed",
            folderId: "blog",
            file: {
              name: "stored.md",
              size: encoder.encode(source).byteLength,
              updatedAt: "2026-07-18T04:00:00.000Z",
              status: "UPLOADED",
            },
          },
        ]);
      }),
      db.get("AssetFolder", () =>
        json([
          {
            id: "blog",
            projectId: "project-1",
            name: "Blog",
            parentId: null,
            createdAt: "2026-07-18T00:00:00.000Z",
          },
        ])
      ),
      db.post("rpc/replace_asset_file_metadata", async ({ request }) => {
        const value = (await request.json()) as ReplaceMetadataRpcArgs;
        persisted = entryFromReplaceRpc(value);
        return json(true);
      })
    );

    await expect(
      synchronizeCanonicalAsset({
        projectId: "project-1",
        assetId: "asset-1",
        client: testContext.postgrest.client,
        assetClient: { uploadFile: vi.fn(), readFile },
      })
    ).resolves.toEqual({
      status: "indexed",
      revision: "file:stored.md:2026-07-18T04:00:00.000Z:35",
    });

    expect(readFile).toHaveBeenCalledOnce();
    expect(readFile).toHaveBeenCalledWith("stored.md", {
      offset: 0,
      length: 35,
    });
    expect(persisted).toMatchObject({
      assetId: "asset-1",
      source: {
        storageName: "stored.md",
        fileUpdatedAt: "2026-07-18T04:00:00.000Z",
        fileSize: 35,
        filename: "renamed",
        folderId: "blog",
      },
      document: {
        name: "renamed.md",
        path: "Blog/renamed.md",
        properties: { title: "Updated" },
        excerpt: "Updated body",
      },
    });
  });

  test("removes canonical metadata when the selected asset is deleted or no longer Markdown", async () => {
    server.use(
      db.get("Asset", () => json([])),
      db.post("rpc/delete_stale_asset_file_metadata", async ({ request }) => {
        expect(await request.json()).toEqual({
          p_project_id: "project-1",
          p_asset_ids: ["asset-1"],
        });
        return json(1);
      })
    );

    await expect(
      synchronizeCanonicalAsset({
        projectId: "project-1",
        assetId: "asset-1",
        client: testContext.postgrest.client,
        assetClient: { uploadFile: vi.fn(), readFile: vi.fn() },
      })
    ).resolves.toEqual({ status: "deleted" });
  });

  test("keeps existing canonical metadata when changed Markdown has invalid YAML", async () => {
    const source = "---\ntitle: [broken\n---\nBody";
    const bytes = encoder.encode(source);
    const readFile = vi.fn<AssetClient["readFile"]>(async () => ({
      data: {
        async *[Symbol.asyncIterator]() {
          yield bytes;
        },
      },
    }));
    server.use(
      db.get("Asset", () =>
        json([
          {
            id: "asset-1",
            projectId: "project-1",
            filename: null,
            folderId: null,
            file: {
              name: "invalid.md",
              size: bytes.byteLength,
              updatedAt: "2026-07-18T05:00:00.000Z",
              status: "UPLOADED",
            },
          },
        ])
      ),
      db.get("AssetFolder", () => json([]))
    );

    await expect(
      synchronizeCanonicalAsset({
        projectId: "project-1",
        assetId: "asset-1",
        client: testContext.postgrest.client,
        assetClient: { uploadFile: vi.fn(), readFile },
      })
    ).rejects.toMatchObject({ code: "FRONTMATTER_INVALID" });
    expect(readFile).toHaveBeenCalledOnce();
  });

  test("updates a renamed or moved asset without rereading its Markdown body", async () => {
    const previousDocument = {
      _id: "asset-1",
      _type: "asset.file" as const,
      name: "old.md",
      path: "old.md",
      key: "old",
      extension: "md",
      mimeType: "text/markdown",
      size: 20,
      revision: "file:stored.md:revision:20",
      contentRef: "stored.md",
      properties: { title: "Post" },
      excerpt: "Body",
    };
    const previousEntry = createCanonicalAssetFileEntry({
      projectId: "project-1",
      document: previousDocument,
    });
    let persisted: Record<string, unknown> | undefined;
    server.use(
      db.get("AssetFileMetadata", ({ request }) => {
        expect(new URL(request.url).searchParams.get("assetId")).toBe(
          "in.(asset-1)"
        );
        return json([
          {
            ...previousEntry,
            createdAt: "2026-07-18T00:00:00.000Z",
            updatedAt: "2026-07-18T00:00:00.000Z",
          },
        ]);
      }),
      db.get("Asset", () =>
        json([
          {
            id: "asset-1",
            projectId: "project-1",
            filename: "new",
            folderId: "blog",
            file: {
              name: "stored.md",
              size: 20,
              updatedAt: "2026-07-18T05:00:00.000Z",
              status: "UPLOADED",
            },
          },
        ])
      ),
      db.get("AssetFolder", () =>
        json([
          {
            id: "blog",
            projectId: "project-1",
            name: "Blog",
            parentId: null,
            createdAt: "2026-07-18T00:00:00.000Z",
          },
        ])
      ),
      db.post("rpc/replace_asset_file_metadata", async ({ request }) => {
        const value = (await request.json()) as ReplaceMetadataRpcArgs;
        persisted = entryFromReplaceRpc(value);
        return json(true);
      })
    );

    await expect(
      synchronizeCanonicalAssetStandardMetadata({
        projectId: "project-1",
        assetIds: ["asset-1"],
        client: testContext.postgrest.client,
      })
    ).resolves.toBe(1);
    const revision = createAssetContentRevision({
      storageName: "stored.md",
      updatedAt: "2026-07-18T05:00:00.000Z",
      size: 20,
    });
    expect(persisted).toMatchObject({
      assetId: "asset-1",
      revision,
      document: {
        name: "new.md",
        path: "Blog/new.md",
        contentRef: "stored.md",
        revision,
        properties: { title: "Post" },
        excerpt: "Body",
      },
    });
  });

  test("batch synchronization rereads only missing or changed revisions", async () => {
    const sources = new Map([
      ["changed.md", "---\ntitle: Changed\n---\nChanged body"],
      ["new.md", "---\ntitle: New\n---\nNew body"],
    ]);
    const assetRows = [
      {
        id: "stable",
        projectId: "project-1",
        filename: "stable",
        folderId: null,
        file: {
          name: "stable.md",
          size: 10,
          updatedAt: "2026-07-18T01:00:00.000Z",
          status: "UPLOADED",
        },
      },
      {
        id: "changed",
        projectId: "project-1",
        filename: "changed",
        folderId: null,
        file: {
          name: "changed.md",
          size: encoder.encode(sources.get("changed.md")).byteLength,
          updatedAt: "2026-07-18T02:00:00.000Z",
          status: "UPLOADED",
        },
      },
      {
        id: "renamed",
        projectId: "project-1",
        filename: "new-name",
        folderId: null,
        file: {
          name: "renamed.md",
          size: 20,
          updatedAt: "2026-07-18T03:00:00.000Z",
          status: "UPLOADED",
        },
      },
      {
        id: "new",
        projectId: "project-1",
        filename: null,
        folderId: null,
        file: {
          name: "new.md",
          size: encoder.encode(sources.get("new.md")).byteLength,
          updatedAt: "2026-07-18T04:00:00.000Z",
          status: "UPLOADED",
        },
      },
      {
        id: "image",
        projectId: "project-1",
        filename: null,
        folderId: null,
        file: {
          name: "image.png",
          size: 30,
          updatedAt: "2026-07-18T05:00:00.000Z",
          status: "UPLOADED",
        },
      },
    ];
    const createEntry = ({
      id,
      name,
      revision,
    }: {
      id: string;
      name: string;
      revision: string;
    }) =>
      createCanonicalAssetFileEntry({
        projectId: "project-1",
        document: {
          _id: id,
          _type: "asset.file",
          name,
          path: name,
          key: name.replace(/\.md$/, ""),
          extension: "md",
          mimeType: "text/markdown",
          size: id === "stable" ? 10 : 20,
          revision,
          contentRef: `${id}.md`,
          properties: { title: id },
          excerpt: `${id} body`,
        },
      });
    const entries = [
      createEntry({
        id: "stable",
        name: "stable.md",
        revision: "file:stable.md:2026-07-18T01:00:00.000Z:10",
      }),
      createEntry({
        id: "changed",
        name: "changed.md",
        revision: "file:changed.md:old:20",
      }),
      createEntry({
        id: "renamed",
        name: "old-name.md",
        revision: "file:renamed.md:2026-07-18T03:00:00.000Z:20",
      }),
      createEntry({
        id: "stale",
        name: "stale.md",
        revision: "file:stale.md:old:20",
      }),
    ];
    const readFile = vi.fn<AssetClient["readFile"]>(async (name) => ({
      data: {
        async *[Symbol.asyncIterator]() {
          yield encoder.encode(sources.get(name) ?? "");
        },
      },
    }));
    const persistedAssetIds: string[] = [];
    server.use(
      db.get("Asset", () => json(assetRows)),
      db.get("AssetFolder", () => json([])),
      db.get("AssetFileMetadata", () =>
        json(
          entries.map((entry) => ({
            ...entry,
            createdAt: "2026-07-18T00:00:00.000Z",
            updatedAt: "2026-07-18T00:00:00.000Z",
          }))
        )
      ),
      db.post("rpc/replace_asset_file_metadata", async ({ request }) => {
        const value = (await request.json()) as ReplaceMetadataRpcArgs;
        persistedAssetIds.push(value.p_asset_id);
        return json(true);
      }),
      db.post("rpc/delete_stale_asset_file_metadata", async ({ request }) => {
        expect(await request.json()).toEqual({
          p_project_id: "project-1",
          p_asset_ids: ["stale"],
        });
        return json(1);
      })
    );

    await expect(
      synchronizeCanonicalAssets({
        projectId: "project-1",
        client: testContext.postgrest.client,
        assetClient: { uploadFile: vi.fn(), readFile },
        concurrency: 2,
      })
    ).resolves.toEqual({
      scanned: 5,
      indexed: 3,
      metadataUpdated: 1,
      unchanged: 1,
      removed: 1,
      skipped: 0,
      inconsistent: 0,
    });
    expect(readFile).toHaveBeenCalledTimes(2);
    expect(readFile.mock.calls.map(([name]) => name).sort()).toEqual([
      "changed.md",
      "new.md",
    ]);
    expect(persistedAssetIds.sort()).toEqual([
      "changed",
      "image",
      "new",
      "renamed",
    ]);
  });

  test("recovery rereads an inconsistent derived entry", async () => {
    const source = "---\ntitle: Recovered\n---\nRecovered body";
    const bytes = encoder.encode(source);
    const revision = `file:recovery.md:2026-07-18T06:00:00.000Z:${bytes.byteLength}`;
    const validEntry = createCanonicalAssetFileEntry({
      projectId: "project-1",
      document: {
        _id: "recovery",
        _type: "asset.file",
        name: "recovery.md",
        path: "recovery.md",
        key: "recovery",
        extension: "md",
        mimeType: "text/markdown",
        size: bytes.byteLength,
        revision,
        contentRef: "recovery.md",
        properties: { title: "Old" },
      },
    });
    const inconsistentEntry = createCanonicalAssetFileEntry({
      projectId: "project-1",
      document: {
        ...validEntry.document,
        revision: "file:recovery.md:old:10",
        properties: { title: "Inconsistent" },
      },
    });
    const readFile = vi.fn<AssetClient["readFile"]>(async () => ({
      data: {
        async *[Symbol.asyncIterator]() {
          yield bytes;
        },
      },
    }));
    server.use(
      db.get("Asset", () =>
        json([
          {
            id: "recovery",
            projectId: "project-1",
            filename: null,
            folderId: null,
            file: {
              name: "recovery.md",
              size: bytes.byteLength,
              updatedAt: "2026-07-18T06:00:00.000Z",
              status: "UPLOADED",
            },
          },
        ])
      ),
      db.get("AssetFolder", () => json([])),
      db.get("AssetFileMetadata", () =>
        json(
          [validEntry, inconsistentEntry].map((metadataEntry, index) => ({
            ...metadataEntry,
            ...(index === 0 ? {} : { fieldContributions: [] }),
            createdAt: "2026-07-18T00:00:00.000Z",
            updatedAt: "2026-07-18T00:00:00.000Z",
          }))
        )
      ),
      db.post("rpc/replace_asset_file_metadata", () => json(true))
    );

    await expect(
      synchronizeCanonicalAssets({
        projectId: "project-1",
        client: testContext.postgrest.client,
        assetClient: { uploadFile: vi.fn(), readFile },
      })
    ).resolves.toEqual({
      scanned: 1,
      indexed: 1,
      metadataUpdated: 0,
      unchanged: 0,
      removed: 0,
      skipped: 0,
      inconsistent: 1,
    });
    expect(readFile).toHaveBeenCalledOnce();
  });
});
