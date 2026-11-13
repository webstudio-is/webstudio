import { describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import {
  createTestServer,
  db,
  empty,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import {
  __testing__,
  AssetRevisionConflictError,
  updateAssetContent,
} from "./revision";
import { PostgresAssetRepository } from "./asset-repository";
import { getAssetData } from "./utils/get-asset-data";

const { getRevisionFilename } = __testing__;
const server = createTestServer();

const readEmptyFile = async () => ({
  data: {
    async *[Symbol.asyncIterator]() {},
  },
});

const createContext = (): AppContext =>
  ({
    ...testContext,
    authorization: { type: "user", userId: "user-1" },
    getOwnerPlanFeatures: async () => ({}),
  }) as unknown as AppContext;

const ownershipHandler = db.get("Project", ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.has("userId")) {
    return json({ id: url.searchParams.get("id")?.replace("eq.", "") });
  }
  return json(null);
});

const oldFile = {
  name: "settings_old-revision.json",
  format: "json",
  size: 2,
  description: null,
  status: "UPLOADED",
  isDeleted: false,
  uploaderProjectId: "project",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  meta: "{}",
};

const assetRow = {
  id: "asset",
  projectId: "project",
  name: oldFile.name,
  filename: null,
  description: "Settings",
  folderId: "data",
  file: oldFile,
};

describe("asset content revisions", () => {
  test("keeps the display basename when generating revision keys", () => {
    expect(
      getRevisionFilename({
        name: "settings_old-revision.json",
        filename: null,
      })
    ).toBe("settings.json");
    expect(
      getRevisionFilename({
        name: "settings_old-revision.json",
        filename: "configuration",
      })
    ).toBe("configuration.json");
    expect(
      getRevisionFilename({
        name: "test_nCEugJxJwUd_MJcgPodZr.md",
        filename: null,
      })
    ).toBe("test.md");
    expect(
      getRevisionFilename({
        name: "settings_old-revision.md",
        filename: "configuration",
        extension: "json",
      })
    ).toBe("configuration.json");
  });

  test.each([
    { format: "json", source: '{"a":1}', expectedType: "file" },
    {
      format: "svg",
      source:
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
      expectedType: "image",
    },
  ])(
    "uploads an immutable $format revision and keeps the asset id",
    async ({ format, source, expectedType }) => {
      const currentFile = {
        ...oldFile,
        name: `settings_old-revision.${format}`,
        format,
        meta:
          format === "svg"
            ? JSON.stringify({ width: 10, height: 10 })
            : oldFile.meta,
      };
      const currentAsset = {
        ...assetRow,
        name: currentFile.name,
        file: currentFile,
      };
      let revisionName = "";
      let swapInput: unknown;
      let uploadedData: Awaited<ReturnType<typeof getAssetData>>;
      server.use(
        ownershipHandler,
        db.get("Asset", ({ request }) => {
          const url = new URL(request.url);
          if (url.searchParams.has("file.status")) {
            return json([
              {
                ...currentAsset,
                name: revisionName,
                file: {
                  ...currentFile,
                  name: revisionName,
                  size: source.length,
                  updatedAt: "2026-07-18T00:00:01.000Z",
                },
              },
            ]);
          }
          return json(currentAsset);
        }),
        db.post("File", async ({ request }) => {
          const input = (await request.json()) as { name: string };
          revisionName = input.name;
          expect(input).toMatchObject({
            name: expect.stringMatching(
              new RegExp(`^settings_.+\\.${format}$`)
            ),
            status: "UPLOADING",
            uploaderProjectId: "project",
            createdAt: currentFile.createdAt,
          });
          return empty({ status: 201 });
        }),
        db.delete("File", () => empty({ status: 204 })),
        db.get("File", ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.has("updatedAt")).toBe(true);
          expect(url.searchParams.has("createdAt")).toBe(false);
          return json({
            ...currentFile,
            name: revisionName,
            format: expectedType,
            status: "UPLOADING",
          });
        }),
        db.patch("File", () =>
          json({
            ...currentFile,
            name: revisionName,
            size: source.length,
            format: uploadedData.format,
            meta: JSON.stringify(uploadedData.meta),
            updatedAt: "2026-07-18T00:00:01.000Z",
          })
        ),
        http.post(
          "http://test-postgrest/rpc/swap_asset_file",
          async ({ request }) => {
            swapInput = await request.json();
            return HttpResponse.json("updated");
          }
        ),
        db.get("AssetFolder", () => json([])),
        db.post("rpc/replace_asset_file_metadata", () => json(true))
      );

      const asset = await updateAssetContent(
        {
          assetId: "asset",
          projectId: "project",
          expectedName: currentFile.name,
          data: new Blob([source]).stream(),
        },
        {
          uploadFile: async (name, type, data) => {
            expect(name).toBe(revisionName);
            expect(type).toBe(expectedType);
            const bytes = new Uint8Array(
              await new Response(data as ReadableStream).arrayBuffer()
            );
            expect(new TextDecoder().decode(bytes)).toBe(source);
            uploadedData = await getAssetData({
              type: type === "image" ? "image" : "file",
              name,
              size: bytes.byteLength,
              data: bytes,
            });
            return uploadedData;
          },
          readFile: readEmptyFile,
        },
        createContext()
      );

      expect(asset).toMatchObject({
        id: "asset",
        projectId: "project",
        name: revisionName,
        description: "Settings",
        folderId: "data",
        format,
        type: expectedType,
        createdAt: currentFile.createdAt,
        updatedAt: "2026-07-18T00:00:01.000Z",
      });
      expect(swapInput).toEqual({
        project_id: "project",
        asset_id: "asset",
        expected_name: currentFile.name,
        replacement_name: revisionName,
      });
    }
  );

  test("reindexes replaced Markdown content only at a query synchronization boundary", async () => {
    const source = "---\ntitle: Updated post\n---\n\nUpdated body";
    const sourceBytes = new TextEncoder().encode(source);
    const markdownFile = {
      ...oldFile,
      name: "post_old-revision.md",
      format: "md",
      size: 3,
    };
    const markdownAsset = {
      ...assetRow,
      name: markdownFile.name,
      filename: "post",
      file: markdownFile,
    };
    let revisionName = "";
    let canonicalDocument: Record<string, unknown> | undefined;
    server.use(
      ownershipHandler,
      db.get("Asset", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.has("file.status")) {
          return json([
            {
              ...markdownAsset,
              name: revisionName,
              file: {
                ...markdownFile,
                name: revisionName,
                size: sourceBytes.byteLength,
                updatedAt: "2026-07-18T00:00:01.000Z",
              },
            },
          ]);
        }
        return json(markdownAsset);
      }),
      db.post("File", async ({ request }) => {
        revisionName = ((await request.json()) as { name: string }).name;
        return empty({ status: 201 });
      }),
      db.get("File", () =>
        json({
          ...markdownFile,
          name: revisionName,
          format: "file",
          status: "UPLOADING",
        })
      ),
      db.patch("File", () =>
        json({
          ...markdownFile,
          name: revisionName,
          size: sourceBytes.byteLength,
          updatedAt: "2026-07-18T00:00:01.000Z",
        })
      ),
      http.post("http://test-postgrest/rpc/swap_asset_file", () =>
        HttpResponse.json("updated")
      ),
      db.get("AssetFolder", () => json([])),
      db.get("AssetFileMetadata", () => json([])),
      db.post("rpc/replace_asset_file_metadata", async ({ request }) => {
        canonicalDocument = (
          (await request.json()) as {
            p_document: Record<string, unknown>;
          }
        ).p_document;
        return json(true);
      })
    );

    const repository = new PostgresAssetRepository({
      projectId: "project",
      context: createContext(),
      assetStore: {
        uploadFile: async () => ({
          format: "md",
          size: sourceBytes.byteLength,
          meta: {},
        }),
        readFile: async (name) => {
          expect(name).toBe(revisionName);
          return { data: new Blob([source]).stream() };
        },
      },
    });
    await repository.updateContent({
      assetId: "asset",
      expectedName: markdownFile.name,
      data: new Blob([source]).stream(),
    });

    expect(canonicalDocument).toBeUndefined();
    await repository.synchronize();
    expect(canonicalDocument).toMatchObject({
      _id: "asset",
      name: "post.md",
      contentRef: revisionName,
      properties: { title: "Updated post" },
      excerpt: "Updated body",
    });
  });

  test("rejects a stale revision before uploading", async () => {
    server.use(
      ownershipHandler,
      db.get("Asset", () => json({ ...assetRow, name: "settings_newer.json" }))
    );

    await expect(
      updateAssetContent(
        {
          assetId: "asset",
          projectId: "project",
          expectedName: oldFile.name,
          data: new Blob(["stale"]).stream(),
        },
        {
          uploadFile: async () => {
            throw new Error("upload should not run");
          },
          readFile: readEmptyFile,
        },
        createContext()
      )
    ).rejects.toBeInstanceOf(AssetRevisionConflictError);
  });

  test("discards an uploaded revision when the atomic swap conflicts", async () => {
    let assetLoadCount = 0;
    let revisionName = "";
    let discardedRevision = false;
    server.use(
      ownershipHandler,
      db.get("Asset", () => {
        assetLoadCount += 1;
        return json(
          assetLoadCount === 1
            ? assetRow
            : { ...assetRow, name: "settings_concurrent.json" }
        );
      }),
      db.post("File", async ({ request }) => {
        revisionName = ((await request.json()) as { name: string }).name;
        return empty({ status: 201 });
      }),
      db.get("File", () =>
        json({
          ...oldFile,
          name: revisionName,
          format: "file",
          status: "UPLOADING",
        })
      ),
      db.patch("File", async ({ request }) => {
        const input = (await request.json()) as { isDeleted?: boolean };
        if (input.isDeleted === true) {
          discardedRevision = true;
          return empty({ status: 204 });
        }
        return json({
          ...oldFile,
          name: revisionName,
          size: 7,
          createdAt: "2026-07-18T00:00:00.000Z",
        });
      }),
      http.post("http://test-postgrest/rpc/swap_asset_file", () =>
        HttpResponse.json("conflict")
      )
    );

    await expect(
      new PostgresAssetRepository({
        projectId: "project",
        context: createContext(),
        assetStore: {
          uploadFile: async () => ({ format: "json", size: 7, meta: {} }),
          readFile: readEmptyFile,
        },
      }).updateContent({
        assetId: "asset",
        expectedName: oldFile.name,
        data: new Blob(["updated"]).stream(),
      })
    ).rejects.toBeInstanceOf(AssetRevisionConflictError);
    expect(discardedRevision).toBe(true);
  });

  test("accepts a committed revision when the swap response fails", async () => {
    let assetLoadCount = 0;
    let revisionName = "";
    server.use(
      ownershipHandler,
      db.get("Asset", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.has("file.status")) {
          return json([
            {
              ...assetRow,
              name: revisionName,
              file: {
                ...oldFile,
                name: revisionName,
                format: "json",
                size: 7,
                updatedAt: "2026-07-18T00:00:00.000Z",
              },
            },
          ]);
        }
        assetLoadCount += 1;
        return json(
          assetLoadCount === 1 ? assetRow : { ...assetRow, name: revisionName }
        );
      }),
      db.post("File", async ({ request }) => {
        revisionName = ((await request.json()) as { name: string }).name;
        return empty({ status: 201 });
      }),
      db.get("File", () =>
        json({
          ...oldFile,
          name: revisionName,
          format: "file",
          status: "UPLOADING",
        })
      ),
      db.patch("File", () =>
        json({
          ...oldFile,
          name: revisionName,
          format: "json",
          size: 7,
          createdAt: "2026-07-18T00:00:00.000Z",
        })
      ),
      http.post("http://test-postgrest/rpc/swap_asset_file", () =>
        HttpResponse.error()
      ),
      db.get("AssetFolder", () => json([])),
      db.post("rpc/replace_asset_file_metadata", () =>
        json({ message: "index database unavailable" }, { status: 500 })
      )
    );
    await expect(
      updateAssetContent(
        {
          assetId: "asset",
          projectId: "project",
          expectedName: oldFile.name,
          data: new Blob(["updated"]).stream(),
        },
        {
          uploadFile: async () => ({ format: "json", size: 7, meta: {} }),
          readFile: readEmptyFile,
        },
        createContext()
      )
    ).resolves.toMatchObject({
      id: "asset",
      name: expect.stringMatching(/^settings_.+\.json$/),
      format: "json",
    });
  });
});
