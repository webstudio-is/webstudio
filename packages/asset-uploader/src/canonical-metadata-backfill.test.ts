import { describe, expect, test, vi } from "vitest";
import {
  canonicalAssetMetadataExtractorGeneration,
  createCanonicalAssetFileEntry,
  getCanonicalAssetMetadataTier,
} from "@webstudio-is/content-engine/compiler";
import {
  createTestServer,
  db,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import type { AssetObjectStore } from "./client";
import {
  areCanonicalAssetFileEntriesCurrent,
  loadCanonicalAssetBaseEntries,
  synchronizeCanonicalAssets,
} from "./canonical-metadata-backfill";

const server = createTestServer();
const encoder = new TextEncoder();

type ReplaceMetadataRpcArgs = {
  p_project_id: string;
  p_asset_id: string;
  p_revision: string;
  p_document: Record<string, unknown>;
  p_source: Record<string, unknown>;
};

const entryFromReplaceRpc = (value: ReplaceMetadataRpcArgs) => ({
  projectId: value.p_project_id,
  assetId: value.p_asset_id,
  revision: value.p_revision,
  document: value.p_document,
  source: value.p_source,
});

describe("canonical asset metadata synchronization", () => {
  test("recognizes metadata that already matches the source snapshot", () => {
    const document = {
      _id: "post",
      _type: "asset.file" as const,
      name: "post.md",
      path: "post.md",
      key: "post",
      extension: "md",
      mimeType: "text/markdown",
      size: 20,
      revision: "revision-1",
      contentRef: "post.md",
      properties: {},
    };
    const base = createCanonicalAssetFileEntry({
      projectId: "project-1",
      document,
      metadataRequirements: { structuredProperties: false, excerpt: false },
    });
    const current = createCanonicalAssetFileEntry({
      projectId: "project-1",
      document: {
        ...document,
        properties: { title: "Post" },
        excerpt: "Post body",
      },
      metadataRequirements: { structuredProperties: true, excerpt: true },
    });

    expect(
      areCanonicalAssetFileEntriesCurrent({
        baseEntries: [base],
        currentEntries: [current],
        requirements: { structuredProperties: true, excerpt: false },
      })
    ).toBe(true);
    expect(
      areCanonicalAssetFileEntriesCurrent({
        baseEntries: [{ ...base, revision: "revision-2" }],
        currentEntries: [current],
        requirements: { structuredProperties: true, excerpt: false },
      })
    ).toBe(false);
    expect(
      areCanonicalAssetFileEntriesCurrent({
        baseEntries: [
          {
            ...base,
            document: { ...base.document, path: "archive/post.md" },
          },
        ],
        currentEntries: [current],
        requirements: { structuredProperties: true, excerpt: false },
      })
    ).toBe(false);
    expect(
      areCanonicalAssetFileEntriesCurrent({
        baseEntries: [base],
        currentEntries: [],
        requirements: { structuredProperties: true, excerpt: false },
      })
    ).toBe(false);
  });

  test("builds base documents from records without canonical writes or object reads", async () => {
    server.use(
      db.get("Asset", () =>
        json([
          {
            id: "post",
            projectId: "project-1",
            filename: "Hello",
            folderId: "blog",
            file: {
              name: "stored-post.md",
              size: 20,
              updatedAt: "2026-07-18T01:00:00.000Z",
              contentHash: "a".repeat(64),
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
      )
    );

    await expect(
      loadCanonicalAssetBaseEntries({
        projectId: "project-1",
        client: testContext.postgrest.client,
      })
    ).resolves.toEqual([
      expect.objectContaining({
        assetId: "post",
        document: expect.objectContaining({
          name: "Hello.md",
          path: "Blog/Hello.md",
          contentRef: "stored-post.md",
          revision: `sha256:${"a".repeat(64)}`,
          properties: {},
        }),
      }),
    ]);
  });

  test.each([
    {
      name: "structured properties",
      requirements: { structuredProperties: true, excerpt: false },
      expectedProperties: { title: "Post" },
      expectedExcerpt: undefined,
    },
    {
      name: "excerpt",
      requirements: { structuredProperties: false, excerpt: true },
      expectedProperties: {},
      expectedExcerpt: "Post body",
    },
  ])("prepares only requested Markdown $name", async (scenario) => {
    const source = "---\ntitle: Post\n---\nPost body";
    const readFile = vi.fn<AssetObjectStore["readFile"]>(async () => ({
      data: {
        async *[Symbol.asyncIterator]() {
          yield encoder.encode(source);
        },
      },
    }));
    let storedDocument: Record<string, unknown> | undefined;
    server.use(
      db.get("Asset", () =>
        json([
          {
            id: "post",
            projectId: "project-1",
            filename: null,
            folderId: null,
            file: {
              name: "post.md",
              size: encoder.encode(source).byteLength,
              updatedAt: "2026-07-18T01:00:00.000Z",
              status: "UPLOADED",
            },
          },
        ])
      ),
      db.get("AssetFolder", () => json([])),
      db.get("AssetFileMetadata", () => json([])),
      db.post("rpc/replace_asset_file_metadata", async ({ request }) => {
        const value = (await request.json()) as ReplaceMetadataRpcArgs;
        storedDocument = value.p_document;
        return json(true);
      })
    );

    await synchronizeCanonicalAssets({
      projectId: "project-1",
      client: testContext.postgrest.client,
      assetClient: { readFile, uploadFile: vi.fn() },
      requirements: scenario.requirements,
    });

    expect(readFile).toHaveBeenCalledOnce();
    expect(storedDocument).toMatchObject({
      properties: scenario.expectedProperties,
      $webstudioMetadataRequirements: getCanonicalAssetMetadataTier(
        scenario.requirements
      ),
      $webstudioExtractorGeneration: canonicalAssetMetadataExtractorGeneration,
    });
    if (scenario.expectedExcerpt === undefined) {
      expect(storedDocument).not.toHaveProperty("excerpt");
    } else {
      expect(storedDocument).toHaveProperty(
        "excerpt",
        scenario.expectedExcerpt
      );
    }
  });

  test("expands a cached metadata tier without reparsing completed dimensions", async () => {
    const source = "---\ntitle: Post\n---\nPost body";
    const bytes = encoder.encode(source);
    const updatedAt = "2026-07-18T01:00:00.000Z";
    const revision = `file:post.md:${updatedAt}:${bytes.byteLength}`;
    const cached = createCanonicalAssetFileEntry({
      projectId: "project-1",
      metadataRequirements: {
        structuredProperties: true,
        excerpt: false,
      },
      document: {
        _id: "post",
        _type: "asset.file",
        name: "post.md",
        path: "post.md",
        key: "post",
        extension: "md",
        mimeType: "text/markdown",
        size: bytes.byteLength,
        revision,
        contentRef: "post.md",
        properties: { title: "Post" },
      },
    });
    const readFile = vi.fn<AssetObjectStore["readFile"]>(async () => ({
      data: {
        async *[Symbol.asyncIterator]() {
          yield bytes;
        },
      },
    }));
    let storedDocument: Record<string, unknown> | undefined;
    server.use(
      db.get("Asset", () =>
        json([
          {
            id: "post",
            projectId: "project-1",
            filename: null,
            folderId: null,
            file: {
              name: "post.md",
              size: bytes.byteLength,
              updatedAt,
              status: "UPLOADED",
            },
          },
        ])
      ),
      db.get("AssetFolder", () => json([])),
      db.get("AssetFileMetadata", () =>
        json([
          {
            ...cached,
            document: {
              ...cached.document,
              $webstudioMetadataRequirements: "properties",
              $webstudioExtractorGeneration:
                canonicalAssetMetadataExtractorGeneration,
            },
            createdAt: updatedAt,
            updatedAt,
          },
        ])
      ),
      db.post("rpc/replace_asset_file_metadata", async ({ request }) => {
        storedDocument = ((await request.json()) as ReplaceMetadataRpcArgs)
          .p_document;
        return json(true);
      }),
      db.post("rpc/delete_stale_asset_file_metadata", () => json(0))
    );

    await synchronizeCanonicalAssets({
      projectId: "project-1",
      client: testContext.postgrest.client,
      assetClient: { uploadFile: vi.fn(), readFile },
      requirements: { structuredProperties: false, excerpt: true },
    });

    expect(readFile).toHaveBeenCalledOnce();
    expect(storedDocument).toMatchObject({
      properties: { title: "Post" },
      excerpt: "Post body",
      $webstudioMetadataRequirements: "properties+excerpt",
      $webstudioExtractorGeneration: canonicalAssetMetadataExtractorGeneration,
    });
  });

  test("indexes Markdown and JSON metadata without reading binary files", async () => {
    const contents = new Map([
      ["stored-one.md", "---\ntitle: One\n---\n# First post"],
      ["stored-two.md", "---\ntitle: Two\ndraft: true\n---\nSecond post"],
      ["stored-data.json", '{"title":"Data","draft":false}'],
    ]);
    const readFile = vi.fn<AssetObjectStore["readFile"]>(async (name) => ({
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
            id: "data",
            projectId: "project-1",
            filename: null,
            folderId: null,
            file: {
              name: "stored-data.json",
              size: encoder.encode(contents.get("stored-data.json")).byteLength,
              updatedAt: "2026-07-18T02:30:00.000Z",
              status: "UPLOADED",
            },
          },
          {
            id: "image",
            projectId: "project-1",
            filename: null,
            description: "Image description",
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
      scanned: 4,
      indexed: 4,
      metadataUpdated: 0,
      unchanged: 0,
      removed: 0,
      skipped: 0,
      inconsistent: 0,
      issues: [],
    });
    expect(readFile).toHaveBeenCalledTimes(3);
    expect(persisted).toHaveLength(4);
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
          assetId: "data",
          document: expect.objectContaining({
            path: "stored-data.json",
            properties: { title: "Data", draft: false },
          }),
        }),
        expect.objectContaining({
          assetId: "image",
          document: expect.objectContaining({
            path: "image.png",
            description: "Image description",
            properties: {},
          }),
        }),
      ])
    );
    const image = persisted.find(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        "assetId" in entry &&
        entry.assetId === "image"
    );
    expect(image).toBeDefined();
    expect(image).not.toHaveProperty("document.excerpt");
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
      createCanonicalAssetFileEntry({
        projectId: "project-1",
        metadataRequirements: {
          structuredProperties: true,
          excerpt: true,
        },
        document: {
          _id: "image",
          _type: "asset.file",
          name: "image.png",
          path: "image.png",
          key: "image",
          extension: "png",
          mimeType: "image/png",
          size: 30,
          revision: "file:image.png:2026-07-18T05:00:00.000Z:30",
          contentRef: "image.png",
          properties: {},
          excerpt: "Stale excerpt",
        },
      }),
      createEntry({
        id: "stale",
        name: "stale.md",
        revision: "file:stale.md:old:20",
      }),
    ];
    const readFile = vi.fn<AssetObjectStore["readFile"]>(async (name) => ({
      data: {
        async *[Symbol.asyncIterator]() {
          yield encoder.encode(sources.get(name) ?? "");
        },
      },
    }));
    const persisted = new Map<string, Record<string, unknown>>();
    server.use(
      db.get("Asset", () => json(assetRows)),
      db.get("AssetFolder", () => json([])),
      db.get("AssetFileMetadata", () =>
        json(
          entries.map((entry) => ({
            ...entry,
            document: {
              ...entry.document,
              $webstudioMetadataRequirements: "properties+excerpt",
              $webstudioExtractorGeneration:
                canonicalAssetMetadataExtractorGeneration,
            },
            createdAt: "2026-07-18T00:00:00.000Z",
            updatedAt: "2026-07-18T00:00:00.000Z",
          }))
        )
      ),
      db.post("rpc/replace_asset_file_metadata", async ({ request }) => {
        const value = (await request.json()) as ReplaceMetadataRpcArgs;
        persisted.set(value.p_asset_id, value.p_document);
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
      indexed: 2,
      metadataUpdated: 2,
      unchanged: 1,
      removed: 1,
      skipped: 0,
      inconsistent: 0,
      issues: [],
    });
    expect(readFile).toHaveBeenCalledTimes(2);
    expect(readFile.mock.calls.map(([name]) => name).sort()).toEqual([
      "changed.md",
      "new.md",
    ]);
    expect([...persisted.keys()].sort()).toEqual([
      "changed",
      "image",
      "new",
      "renamed",
    ]);
    expect(persisted.get("image")).not.toHaveProperty("excerpt");
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
    const readFile = vi.fn<AssetObjectStore["readFile"]>(async () => ({
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
        json([
          {
            ...validEntry,
            revision: "file:recovery.md:old:10",
            createdAt: "2026-07-18T00:00:00.000Z",
            updatedAt: "2026-07-18T00:00:00.000Z",
          },
        ])
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
      issues: [],
    });
    expect(readFile).toHaveBeenCalledOnce();
  });

  test("removes invalid derived metadata when source recovery fails", async () => {
    const invalidDocument = { _id: "broken", revision: "different" };
    const deleted: unknown[] = [];
    server.use(
      db.get("Asset", () =>
        json([
          {
            id: "broken",
            projectId: "project-1",
            filename: null,
            folderId: null,
            file: {
              name: "broken.md",
              size: 4,
              updatedAt: "2026-07-18T07:00:00.000Z",
              status: "UPLOADED",
            },
          },
        ])
      ),
      db.get("AssetFolder", () => json([])),
      db.get("AssetFileMetadata", () =>
        json([
          {
            projectId: "project-1",
            assetId: "broken",
            revision: "stale",
            document: invalidDocument,
            createdAt: "2026-07-18T00:00:00.000Z",
            updatedAt: "2026-07-18T00:00:00.000Z",
          },
        ])
      ),
      db.post(
        "rpc/delete_asset_file_metadata_if_matches",
        async ({ request }) => {
          deleted.push(await request.json());
          return json(1);
        }
      ),
      db.post("rpc/delete_stale_asset_file_metadata", () => json(0))
    );

    const result = await synchronizeCanonicalAssets({
      projectId: "project-1",
      client: testContext.postgrest.client,
      assetClient: {
        uploadFile: vi.fn(),
        readFile: vi.fn().mockRejectedValue(new Error("Object is missing")),
      },
    });

    expect(result).toMatchObject({
      scanned: 1,
      skipped: 1,
      inconsistent: 1,
    });
    expect(deleted).toEqual([
      expect.objectContaining({
        p_project_id: "project-1",
        p_asset_id: "broken",
        p_revision: "stale",
        p_document: invalidDocument,
      }),
    ]);
  });

  test("isolates an unreadable asset and removes its stale metadata", async () => {
    const updatedAt = "2026-07-18T07:00:00.000Z";
    const assets = ["broken", "healthy"].map((id) => ({
      id,
      projectId: "project-1",
      filename: null,
      folderId: null,
      file: {
        name: `${id}.md`,
        size: 4,
        updatedAt,
        status: "UPLOADED",
      },
    }));
    const staleBrokenEntry = createCanonicalAssetFileEntry({
      projectId: "project-1",
      document: {
        _id: "broken",
        _type: "asset.file",
        name: "broken.md",
        path: "broken.md",
        key: "broken",
        extension: "md",
        mimeType: "text/markdown",
        size: 3,
        revision: "file:broken.md:previous:3",
        contentRef: "broken.md",
        properties: { title: "Previous" },
      },
    });
    const replaced: string[] = [];
    const deleted: string[] = [];
    server.use(
      db.get("Asset", () => json(assets)),
      db.get("AssetFolder", () => json([])),
      db.get("AssetFileMetadata", () =>
        json([
          {
            ...staleBrokenEntry,
            createdAt: "2026-07-18T00:00:00.000Z",
            updatedAt: "2026-07-18T00:00:00.000Z",
          },
        ])
      ),
      db.post("rpc/replace_asset_file_metadata", async ({ request }) => {
        const input = (await request.json()) as ReplaceMetadataRpcArgs;
        replaced.push(input.p_asset_id);
        return json(true);
      }),
      db.post(
        "rpc/delete_asset_file_metadata_if_matches",
        async ({ request }) => {
          const input = (await request.json()) as {
            p_asset_id: string;
          };
          deleted.push(input.p_asset_id);
          return json(1);
        }
      ),
      db.post("rpc/delete_stale_asset_file_metadata", () => json(0))
    );
    const readFile = vi.fn<AssetObjectStore["readFile"]>(async (name) => {
      if (name === "broken.md") {
        throw new Error("Object is missing");
      }
      return {
        data: {
          async *[Symbol.asyncIterator]() {
            yield encoder.encode("post");
          },
        },
      };
    });

    const result = await synchronizeCanonicalAssets({
      projectId: "project-1",
      client: testContext.postgrest.client,
      assetClient: { uploadFile: vi.fn(), readFile },
    });

    expect(result).toMatchObject({ scanned: 2, indexed: 1 });
    expect(result.issues).toEqual([
      expect.objectContaining({
        assetId: "broken",
        storageName: "broken.md",
        message: "Object is missing",
      }),
    ]);
    expect(replaced).toEqual(["healthy"]);
    expect(deleted).toEqual(["broken"]);
  });
});
