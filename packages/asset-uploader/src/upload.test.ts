import { describe, expect, test, vi } from "vitest";
import {
  createTestServer,
  db,
  empty,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { createUploadTicket, uploadFile } from "./upload";

const server = createTestServer();

const createContext = ({
  maxAssetsPerProject = 350,
  maxWorkspaces = 20,
  ownerPlanCalls,
}: {
  maxAssetsPerProject?: number;
  maxWorkspaces?: number;
  ownerPlanCalls?: string[];
} = {}): AppContext =>
  ({
    ...testContext,
    authorization: { type: "user", userId: "user-1" },
    planFeatures: { maxAssetsPerProject: 100 },
    getOwnerPlanFeatures: (userId: string) => {
      ownerPlanCalls?.push(userId);
      return Promise.resolve({ maxAssetsPerProject, maxWorkspaces });
    },
  }) as unknown as AppContext;

const ownershipHandler = db.get("Project", ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.has("userId")) {
    return json({ id: url.searchParams.get("id")?.replace("eq.", "") });
  }
  return json({ userId: "owner-1", workspaceId: null });
});

const availableAssetCapacityHandlers = () => [
  db.head("Asset", () => empty({ headers: { "Content-Range": "*/0" } })),
  db.head("File", () => empty({ headers: { "Content-Range": "*/0" } })),
];

const assetPkeyError = ({
  assetId,
  projectId,
}: {
  assetId: string;
  projectId: string;
}) => ({
  code: "23505",
  message: 'duplicate key value violates unique constraint "Asset_pkey"',
  details: `Key (id, projectId)=(${assetId}, ${projectId}) already exists.`,
});

const uploadedFile = {
  name: "existing.png",
  format: "png",
  size: 4,
  description: null,
  status: "UPLOADED",
  isDeleted: false,
  uploaderProjectId: "project-1",
  contentHash: "hash-1",
  meta: JSON.stringify({ width: 1, height: 1 }),
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("createUploadTicket", () => {
  test("reuses an uploaded asset with the same content and display name", async () => {
    let inserted = false;
    server.use(
      ownershipHandler,
      db.get("File", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("uploaderProjectId")).toBe("eq.project-1");
        expect(url.searchParams.get("contentHash")).toBe("eq.hash-1");
        return json([uploadedFile]);
      }),
      db.get("Asset", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("filename")).toBe("eq.existing");
        expect(url.searchParams.get("description")).toBe("is.null");
        expect(url.searchParams.get("folderId")).toBe("is.null");
        expect(url.searchParams.get("order")).toBe("id.asc");
        expect(url.searchParams.get("limit")).toBe("1");
        return json({
          id: "existing-asset",
          projectId: "project-1",
          filename: "existing",
          description: null,
          folderId: null,
        });
      }),
      db.post("File", () => {
        inserted = true;
        return empty({ status: 201 });
      })
    );

    await expect(
      createUploadTicket(
        {
          projectId: "project-1",
          type: "image/png",
          filename: "existing.png",
          contentHash: "hash-1",
        },
        createContext()
      )
    ).resolves.toMatchObject({
      assetId: "existing-asset",
      name: "existing.png",
      deduplicated: true,
      asset: { id: "existing-asset", name: "existing.png", type: "image" },
    });
    expect(inserted).toBe(false);
  });

  test("creates a distinct logical asset for a different display name", async () => {
    let insertedAsset: unknown;
    server.use(
      ownershipHandler,
      db.get("File", () =>
        json([{ ...uploadedFile, name: "first.md", format: "text/markdown" }])
      ),
      db.get("Asset", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("name")).toBe("eq.first.md");
        expect(url.searchParams.get("filename")).toBe("eq.second");
        expect(url.searchParams.get("description")).toBe("is.null");
        expect(url.searchParams.get("folderId")).toBe("is.null");
        return json(null);
      }),
      ...availableAssetCapacityHandlers(),
      db.post("Asset", async ({ request }) => {
        insertedAsset = await request.json();
        return empty({ status: 201 });
      })
    );

    const ticket = await createUploadTicket(
      {
        projectId: "project-1",
        type: "text/markdown",
        filename: "second.md",
        contentHash: "hash-1",
      },
      createContext()
    );

    expect(ticket).toMatchObject({
      name: "first.md",
      deduplicated: true,
      asset: { filename: "second" },
    });
    expect(insertedAsset).toMatchObject({
      id: ticket.assetId,
      projectId: "project-1",
      name: "first.md",
      filename: "second",
    });
  });

  test("does not reuse content stored with a different extension", async () => {
    let insertedFile: unknown;
    server.use(
      ownershipHandler,
      db.get("File", () =>
        json([{ ...uploadedFile, name: "first.md", format: "text/markdown" }])
      ),
      ...availableAssetCapacityHandlers(),
      db.post("File", async ({ request }) => {
        insertedFile = await request.json();
        return empty({ status: 201 });
      }),
      db.post("Asset", () => empty({ status: 201 }))
    );

    const ticket = await createUploadTicket(
      {
        projectId: "project-1",
        type: "text/plain",
        filename: "second.txt",
        contentHash: "hash-1",
      },
      createContext(),
      () => "second-asset"
    );

    expect(ticket).toMatchObject({
      assetId: "second-asset",
      name: expect.stringMatching(/^second_.+\.txt$/),
      deduplicated: false,
    });
    expect(insertedFile).toMatchObject({
      name: ticket.name,
      format: "text/plain",
      contentHash: "hash-1",
    });
  });

  test("creates a distinct logical asset for different metadata", async () => {
    let insertedAsset: unknown;
    server.use(
      ownershipHandler,
      db.get("File", () => json([uploadedFile])),
      db.get("Asset", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("name")).toBe("eq.existing.png");
        expect(url.searchParams.get("filename")).toBe("eq.existing");
        expect(url.searchParams.get("description")).toBe("eq.Campaign photo");
        expect(url.searchParams.get("folderId")).toBe("eq.campaign");
        return json(null);
      }),
      ...availableAssetCapacityHandlers(),
      db.post("Asset", async ({ request }) => {
        insertedAsset = await request.json();
        return empty({ status: 201 });
      })
    );

    const ticket = await createUploadTicket(
      {
        projectId: "project-1",
        type: "image/png",
        filename: "existing.png",
        description: "Campaign photo",
        folderId: "campaign",
        contentHash: "hash-1",
      },
      createContext()
    );

    expect(ticket).toMatchObject({
      name: "existing.png",
      deduplicated: true,
      asset: {
        filename: "existing",
        description: "Campaign photo",
        folderId: "campaign",
      },
    });
    expect(insertedAsset).toMatchObject({
      id: ticket.assetId,
      projectId: "project-1",
      name: "existing.png",
      filename: "existing",
      description: "Campaign photo",
      folderId: "campaign",
    });
  });

  test("restores a soft-deleted file with the same content hash", async () => {
    let restoredFile = false;
    let insertedAsset: unknown;
    server.use(
      ownershipHandler,
      db.get("File", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("contentHash")).toBe("eq.hash-1");
        expect(url.searchParams.has("isDeleted")).toBe(false);
        return json([{ ...uploadedFile, isDeleted: true }]);
      }),
      db.get("Asset", () => json(null)),
      ...availableAssetCapacityHandlers(),
      db.patch("File", async ({ request }) => {
        expect(await request.json()).toEqual({ isDeleted: false });
        restoredFile = true;
        return empty({ status: 204 });
      }),
      db.post("Asset", async ({ request }) => {
        insertedAsset = await request.json();
        return empty({ status: 201 });
      })
    );

    const ticket = await createUploadTicket(
      {
        projectId: "project-1",
        type: "image/png",
        filename: "photo.png",
        contentHash: "hash-1",
      },
      createContext(),
      () => "new-asset"
    );

    expect(ticket).toMatchObject({
      assetId: expect.any(String),
      name: "existing.png",
      deduplicated: true,
      asset: { id: expect.any(String), name: "existing.png" },
    });
    if (ticket.deduplicated === false) {
      throw new Error("Expected a deduplicated upload ticket");
    }
    expect(ticket.assetId).toBe(ticket.asset.id);
    expect(restoredFile).toBe(true);
    expect(insertedAsset).toMatchObject({
      id: ticket.assetId,
      projectId: "project-1",
      name: "existing.png",
      filename: "photo",
    });
  });

  test("reuses an uploaded file without an asset", async () => {
    let insertedAsset = false;
    server.use(
      ownershipHandler,
      db.get("File", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.has("contentHash")) {
          return json([{ ...uploadedFile, name: "orphan.png" }]);
        }
        return json(null);
      }),
      db.get("Asset", () => json(null)),
      ...availableAssetCapacityHandlers(),
      db.post("Asset", () => {
        insertedAsset = true;
        return empty({ status: 201 });
      })
    );

    const ticket = await createUploadTicket(
      {
        projectId: "project-1",
        type: "image/png",
        filename: "photo.png",
        contentHash: "hash-1",
      },
      createContext(),
      () => "new-asset"
    );
    expect(ticket).toMatchObject({
      assetId: expect.any(String),
      name: "orphan.png",
      deduplicated: true,
    });
    expect(insertedAsset).toBe(true);
  });

  test("reuses the asset restored by a concurrent deduplicated upload", async () => {
    let assetReads = 0;
    let restoredAssetId = "";
    server.use(
      ownershipHandler,
      db.get("File", () => json([{ ...uploadedFile, isDeleted: true }])),
      db.get("Asset", () => {
        assetReads += 1;
        return assetReads === 1
          ? json(null)
          : json({
              id: restoredAssetId,
              projectId: "project-1",
              filename: "photo",
              description: null,
              folderId: null,
            });
      }),
      ...availableAssetCapacityHandlers(),
      db.post("Asset", async ({ request }) => {
        const asset = (await request.json()) as { id: string };
        restoredAssetId = asset.id;
        return json(
          assetPkeyError({
            assetId: restoredAssetId,
            projectId: "project-1",
          }),
          { status: 409 }
        );
      }),
      db.patch("File", () => empty({ status: 204 }))
    );

    await expect(
      createUploadTicket(
        {
          projectId: "project-1",
          type: "image/png",
          filename: "photo.png",
          contentHash: "hash-1",
        },
        createContext()
      )
    ).resolves.toMatchObject({
      assetId: expect.stringMatching(/^.{21}$/),
      name: "existing.png",
      deduplicated: true,
    });
    expect(assetReads).toBe(2);
  });

  test("enforces the asset limit before restoring deduplicated content", async () => {
    let insertedAsset = false;
    let restoredFile = false;
    server.use(
      ownershipHandler,
      db.get("File", () => json([{ ...uploadedFile, isDeleted: true }])),
      db.get("Asset", () => json(null)),
      db.head("Asset", () => empty({ headers: { "Content-Range": "*/350" } })),
      db.head("File", () => empty({ headers: { "Content-Range": "*/0" } })),
      db.post("Asset", () => {
        insertedAsset = true;
        return empty({ status: 201 });
      }),
      db.patch("File", () => {
        restoredFile = true;
        return empty({ status: 204 });
      })
    );

    await expect(
      createUploadTicket(
        {
          projectId: "project-1",
          type: "image/png",
          filename: "photo.png",
          contentHash: "hash-1",
        },
        createContext()
      )
    ).rejects.toThrow("The maximum number of assets per project is 350.");
    expect(insertedAsset).toBe(false);
    expect(restoredFile).toBe(false);
  });

  test("reuses the winning asset after a concurrent content hash insert", async () => {
    let contentHashReads = 0;
    server.use(
      ownershipHandler,
      db.get("File", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.has("contentHash")) {
          contentHashReads += 1;
          return contentHashReads === 1
            ? json([])
            : json([{ ...uploadedFile, name: "winner.png" }]);
        }
        return json(null);
      }),
      db.get("Asset", () =>
        json({
          id: "winner-asset",
          projectId: "project-1",
          filename: "photo",
          description: null,
          folderId: null,
        })
      ),
      db.head("Asset", () => empty({ headers: { "Content-Range": "*/0" } })),
      db.head("File", () => empty({ headers: { "Content-Range": "*/0" } })),
      db.post("File", () =>
        json(
          {
            code: "23505",
            message: "duplicate project content hash",
          },
          { status: 409 }
        )
      )
    );

    await expect(
      createUploadTicket(
        {
          projectId: "project-1",
          type: "image/png",
          filename: "photo.png",
          contentHash: "hash-1",
        },
        createContext()
      )
    ).resolves.toMatchObject({
      assetId: "winner-asset",
      name: "winner.png",
      deduplicated: true,
      asset: { id: "winner-asset", name: "winner.png" },
    });
  });

  test("counts assets instead of uploaded files for the project limit", async () => {
    let insertedFile: unknown;

    server.use(
      ownershipHandler,
      db.head("Asset", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("projectId")).toBe("eq.project-1");
        expect(url.searchParams.get("file.status")).toBe("eq.UPLOADED");
        return empty({ headers: { "Content-Range": "*/90" } });
      }),
      db.head("File", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("uploaderProjectId")).toBe("eq.project-1");
        expect(url.searchParams.get("status")).toBe("eq.UPLOADING");
        expect(url.searchParams.has("createdAt")).toBe(true);
        return empty({ headers: { "Content-Range": "*/0" } });
      }),
      db.get("Asset", () => json(null)),
      db.post("File", async ({ request }) => {
        insertedFile = await request.json();
        return empty({ status: 201 });
      }),
      db.post("Asset", async ({ request }) => {
        expect(await request.json()).toEqual({
          id: "asset-1",
          projectId: "project-1",
          name: expect.stringMatching(/^photo_.+\.png$/),
          filename: "photo",
          description: "Campaign photo",
          folderId: "campaign",
        });
        return empty({ status: 201 });
      })
    );

    const ticket = await createUploadTicket(
      {
        projectId: "project-1",
        type: "image/png",
        filename: "photo.png",
        description: "Campaign photo",
        folderId: "campaign",
      },
      createContext(),
      () => "asset-1"
    );

    expect(ticket.assetId).toBe("asset-1");
    expect(ticket.name).toMatch(/^photo_.+\.png$/);
    expect(insertedFile).toMatchObject({
      name: ticket.name,
      status: "UPLOADING",
      uploaderProjectId: "project-1",
    });
  });

  test("preserves the requested display name while sanitizing storage", async () => {
    server.use(
      ownershipHandler,
      db.head("Asset", () => empty({ headers: { "Content-Range": "*/0" } })),
      db.head("File", () => empty({ headers: { "Content-Range": "*/0" } })),
      db.post("File", async ({ request }) => {
        expect(await request.json()).toMatchObject({
          name: expect.stringMatching(/^Campaign_photo_.+\.png$/),
        });
        return empty({ status: 201 });
      }),
      db.post("Asset", async ({ request }) => {
        expect(await request.json()).toMatchObject({
          filename: "Campaign photo",
        });
        return empty({ status: 201 });
      })
    );

    await createUploadTicket(
      {
        projectId: "project-1",
        type: "image/png",
        filename: "Campaign_photo.png",
        displayFilename: "Campaign photo",
      },
      createContext(),
      () => "asset-1"
    );
  });

  test("throws when uploaded assets and recent uploads reach the limit", async () => {
    server.use(
      ownershipHandler,
      db.get("Asset", () => json(null)),
      db.head("Asset", () => empty({ headers: { "Content-Range": "*/349" } })),
      db.head("File", () => empty({ headers: { "Content-Range": "*/1" } }))
    );

    await expect(
      createUploadTicket(
        {
          projectId: "project-2",
          type: "image/png",
          filename: "photo.png",
        },
        createContext(),
        () => "asset-2"
      )
    ).rejects.toThrow("The maximum number of assets per project is 350.");
  });

  test("uses project owner's asset limit for shared workspace projects", async () => {
    let insertedFile = false;
    const ownerPlanCalls: string[] = [];

    server.use(
      db.get("Project", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.has("userId")) {
          return json(null);
        }
        return json({ userId: "team-owner" });
      }),
      db.get("WorkspaceProjectAuthorization", () =>
        json([{ relation: "editors" }])
      ),
      db.head("Asset", () => empty({ headers: { "Content-Range": "*/100" } })),
      db.head("File", () => empty({ headers: { "Content-Range": "*/0" } })),
      db.get("Asset", () => json(null)),
      db.post("File", () => {
        insertedFile = true;
        return empty({ status: 201 });
      }),
      db.post("Asset", () => empty({ status: 201 }))
    );

    await expect(
      createUploadTicket(
        {
          projectId: "workspace-project",
          type: "image/png",
          filename: "photo.png",
        },
        createContext({ maxAssetsPerProject: 350, ownerPlanCalls }),
        () => "asset-3"
      )
    ).resolves.toMatchObject({
      assetId: "asset-3",
      name: expect.stringMatching(/^photo_.+\.png$/),
    });

    expect(insertedFile).toBe(true);
    expect(ownerPlanCalls).toEqual(["team-owner"]);
  });

  test("retries when a generated asset id collides", async () => {
    const insertedFiles: unknown[] = [];
    const insertedAssets: unknown[] = [];
    const deletedFiles: string[] = [];
    const ids = ["asset-collision", "asset-retry"];

    server.use(
      ownershipHandler,
      db.head("Asset", () => empty({ headers: { "Content-Range": "*/0" } })),
      db.head("File", () => empty({ headers: { "Content-Range": "*/0" } })),
      db.post("File", async ({ request }) => {
        insertedFiles.push(await request.json());
        return empty({ status: 201 });
      }),
      db.post("Asset", async ({ request }) => {
        const asset = await request.json();
        insertedAssets.push(asset);
        if ((asset as { id: string }).id === "asset-collision") {
          return json(
            assetPkeyError({
              assetId: "asset-collision",
              projectId: "project-4",
            }),
            { status: 409 }
          );
        }
        return empty({ status: 201 });
      }),
      db.delete("File", ({ request }) => {
        const url = new URL(request.url);
        deletedFiles.push(url.searchParams.get("name") ?? "");
        return empty({ status: 204 });
      })
    );

    const ticket = await createUploadTicket(
      {
        projectId: "project-4",
        type: "image/png",
        filename: "renamed-photo.png",
      },
      createContext(),
      () => ids.shift() ?? "unexpected"
    );

    expect(ticket.assetId).toBe("asset-retry");
    expect(ticket.name).toMatch(/^renamed-photo_.+\.png$/);
    expect(insertedFiles).toHaveLength(2);
    expect(insertedAssets).toEqual([
      {
        id: "asset-collision",
        projectId: "project-4",
        name: (insertedFiles[0] as { name: string }).name,
        filename: "renamed-photo",
      },
      {
        id: "asset-retry",
        projectId: "project-4",
        name: (insertedFiles[1] as { name: string }).name,
        filename: "renamed-photo",
      },
    ]);
    expect(deletedFiles).toEqual([
      `eq.${(insertedFiles[0] as { name: string }).name}`,
    ]);
  });

  test("keeps duplicate asset errors for already uploaded assets", async () => {
    let attemptedFileUpdate = false;

    server.use(
      ownershipHandler,
      db.head("Asset", () => empty({ headers: { "Content-Range": "*/0" } })),
      db.head("File", () => empty({ headers: { "Content-Range": "*/0" } })),
      db.post("File", () => empty({ status: 201 })),
      db.post("Asset", () =>
        json(assetPkeyError({ assetId: "asset-5", projectId: "project-5" }), {
          status: 409,
        })
      ),
      db.delete("File", () => empty({ status: 204 })),
      db.get("Asset", () => json(null)),
      db.patch("File", () => {
        attemptedFileUpdate = true;
        return empty({ status: 204 });
      })
    );

    await expect(
      createUploadTicket(
        {
          projectId: "project-5",
          type: "image/png",
          filename: "photo.png",
        },
        createContext(),
        () => "asset-5"
      )
    ).rejects.toThrow(
      'duplicate key value violates unique constraint "Asset_pkey"'
    );

    expect(attemptedFileUpdate).toBe(false);
  });
});

describe("uploadFile", () => {
  test("indexes only the newly uploaded Markdown asset after commit", async () => {
    const source = "---\ntitle: New post\n---\nPost body";
    const sourceBytes = new TextEncoder().encode(source);
    let persisted: Record<string, unknown> | undefined;
    const uploadedFile = {
      name: "post.md",
      format: "md",
      size: sourceBytes.byteLength,
      status: "UPLOADED",
      uploaderProjectId: "project-1",
      isDeleted: false,
      description: null,
      meta: "{}",
      createdAt: "2026-07-18T00:00:00.000Z",
      updatedAt: "2026-07-18T01:00:00.000Z",
    };
    const readFile = vi.fn(async () => ({
      data: {
        async *[Symbol.asyncIterator]() {
          yield sourceBytes;
        },
      },
    }));
    server.use(
      db.get("File", () =>
        json({
          ...uploadedFile,
          size: 0,
          status: "UPLOADING",
          updatedAt: "2026-07-18T00:00:00.000Z",
        })
      ),
      db.patch("File", () => json(uploadedFile)),
      db.get("Asset", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.has("name")) {
          return json({
            id: "asset-1",
            projectId: "project-1",
            filename: null,
            description: null,
            folderId: null,
          });
        }
        expect(url.searchParams.get("id")).toBe("in.(asset-1)");
        return json([
          {
            id: "asset-1",
            projectId: "project-1",
            filename: null,
            folderId: null,
            file: uploadedFile,
          },
        ]);
      }),
      db.get("AssetFolder", () => json([])),
      db.post("rpc/replace_asset_file_metadata", async ({ request }) => {
        const value = (await request.json()) as {
          p_project_id: string;
          p_asset_id: string;
          p_document: Record<string, unknown>;
        };
        persisted = {
          projectId: value.p_project_id,
          assetId: value.p_asset_id,
          document: value.p_document,
        };
        return json(true);
      })
    );

    await expect(
      uploadFile(
        "post.md",
        new Blob([source]).stream(),
        {
          uploadFile: async () => ({
            format: "md",
            size: sourceBytes.byteLength,
            meta: {},
          }),
          readFile,
        },
        createContext(),
        undefined
      )
    ).resolves.toMatchObject({
      id: "asset-1",
      name: "post.md",
      type: "file",
    });
    expect(readFile).toHaveBeenCalledOnce();
    expect(persisted).toMatchObject({
      projectId: "project-1",
      assetId: "asset-1",
      document: {
        name: "post.md",
        properties: { title: "New post" },
        excerpt: "Post body",
      },
    });
  });

  test("keeps a committed upload when resource synchronization fails", async () => {
    const source = "Post body";
    const uploadedFile = {
      name: "post.md",
      format: "md",
      size: source.length,
      status: "UPLOADED",
      uploaderProjectId: "project-1",
      isDeleted: false,
      description: null,
      meta: "{}",
      createdAt: "2026-07-18T00:00:00.000Z",
      updatedAt: "2026-07-18T01:00:00.000Z",
    };
    server.use(
      db.get("File", () => json({ ...uploadedFile, status: "UPLOADING" })),
      db.patch("File", () => json(uploadedFile)),
      db.get("Asset", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.has("name")) {
          return json({
            id: "asset-1",
            projectId: "project-1",
            filename: null,
            description: null,
            folderId: null,
          });
        }
        return json([
          {
            id: "asset-1",
            projectId: "project-1",
            filename: null,
            folderId: null,
            file: uploadedFile,
          },
        ]);
      }),
      db.get("AssetFolder", () => json([]))
    );
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      uploadFile(
        "post.md",
        new Blob([source]).stream(),
        {
          uploadFile: async () => ({
            format: "md",
            size: source.length,
            meta: {},
          }),
          readFile: async () => {
            throw new Error("Storage read failed");
          },
        },
        createContext(),
        undefined
      )
    ).resolves.toMatchObject({ id: "asset-1", name: "post.md" });
    expect(logError).toHaveBeenCalledWith(
      "Uploaded asset resource synchronization failed",
      expect.any(Error)
    );
    logError.mockRestore();
  });

  test("returns uploaded asset with reserved asset row id", async () => {
    server.use(
      db.get("File", () =>
        json({
          name: "existing.png",
          format: "png",
          size: 0,
          status: "UPLOADING",
          uploaderProjectId: "project-1",
          isDeleted: false,
          meta: "{}",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      ),
      db.patch("File", () =>
        json({
          name: "existing.png",
          format: "png",
          size: 5,
          status: "UPLOADED",
          uploaderProjectId: "project-1",
          isDeleted: false,
          meta: JSON.stringify({ width: 10, height: 20 }),
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        })
      ),
      db.get("Asset", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.has("file.status")) {
          return json([
            {
              id: "asset-1",
              projectId: "project-1",
              filename: "photo",
              folderId: null,
              file: {
                name: "existing.png",
                size: 5,
                updatedAt: "2024-01-01T00:00:00.000Z",
              },
            },
          ]);
        }
        expect(url.searchParams.get("name")).toBe("eq.existing.png");
        expect(url.searchParams.get("projectId")).toBe("eq.project-1");
        return json({
          id: "asset-1",
          projectId: "project-1",
          filename: "photo",
          description: "Photo",
        });
      }),
      db.get("AssetFolder", () => json([])),
      db.post("rpc/replace_asset_file_metadata", async ({ request }) => {
        const body = (await request.json()) as {
          p_document: { extension: string; mimeType: string };
        };
        expect(body.p_document).toMatchObject({
          extension: "png",
          mimeType: "image/png",
        });
        return json(true);
      })
    );

    await expect(
      uploadFile(
        "existing.png",
        new Blob(["asset"]).stream(),
        {
          uploadFile: async () => ({
            format: "png",
            size: 5,
            meta: { width: 10, height: 20 },
          }),
          readFile: async () => ({
            data: { async *[Symbol.asyncIterator]() {} },
          }),
        },
        createContext(),
        undefined
      )
    ).resolves.toMatchObject({
      id: "asset-1",
      projectId: "project-1",
      filename: "photo",
      description: "Photo",
      name: "existing.png",
      type: "image",
    });
  });

  test("uses custom failed upload cleanup without deleting asset rows", async () => {
    let customCleanupCalled = false;
    let assetDeleted = false;
    let fileDeleted = false;

    server.use(
      db.get("File", () =>
        json({
          name: "existing.png",
          format: "image",
          size: 0,
          status: "UPLOADING",
          uploaderProjectId: "project-1",
          isDeleted: false,
          meta: "{}",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      ),
      db.delete("Asset", () => {
        assetDeleted = true;
        return empty({ status: 204 });
      }),
      db.delete("File", () => {
        fileDeleted = true;
        return empty({ status: 204 });
      })
    );

    await expect(
      uploadFile(
        "existing.png",
        new Blob(["asset"]).stream(),
        {
          uploadFile: async () => {
            throw new Error("Storage upload failed");
          },
          readFile: async () => ({
            data: { async *[Symbol.asyncIterator]() {} },
          }),
        },
        createContext(),
        undefined,
        undefined,
        async () => {
          customCleanupCalled = true;
        }
      )
    ).rejects.toThrow("Storage upload failed");

    expect(customCleanupCalled).toBe(true);
    expect(assetDeleted).toBe(false);
    expect(fileDeleted).toBe(false);
  });

  test("rejects content that does not match the upload ticket hash", async () => {
    let customCleanupCalled = false;
    let storageWriteCompleted = false;
    server.use(
      db.get("File", () =>
        json({
          ...uploadedFile,
          status: "UPLOADING",
          contentHash: "0".repeat(64),
          createdAt: new Date().toISOString(),
        })
      )
    );

    await expect(
      uploadFile(
        "existing.png",
        new Blob(["asset"]).stream(),
        {
          uploadFile: async (_name, _type, data) => {
            for await (const _chunk of data) {
              // Consume the upload stream as a real storage client would.
            }
            storageWriteCompleted = true;
            return { format: "png", size: 5, meta: {} };
          },
        },
        createContext(),
        undefined,
        undefined,
        async () => {
          customCleanupCalled = true;
        }
      )
    ).rejects.toThrow("does not match its upload ticket");

    expect(customCleanupCalled).toBe(true);
    expect(storageWriteCompleted).toBe(false);
  });

  test("cleans up an uploaded file without an uploader project", async () => {
    let assetDeleted = false;
    let fileDeleted = false;
    const file = {
      name: "orphan.txt",
      format: "txt",
      size: 6,
      status: "UPLOADED",
      uploaderProjectId: null,
      isDeleted: false,
      meta: "{}",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    server.use(
      db.get("File", () => json({ ...file, status: "UPLOADING" })),
      db.patch("File", () => json(file)),
      db.delete("Asset", () => {
        assetDeleted = true;
        return empty({ status: 204 });
      }),
      db.delete("File", () => {
        fileDeleted = true;
        return empty({ status: 204 });
      })
    );

    await expect(
      uploadFile(
        file.name,
        new Blob(["orphan"]).stream(),
        {
          uploadFile: async () => ({ format: "txt", size: 6, meta: {} }),
          readFile: async () => {
            throw new Error("read should not run");
          },
        },
        createContext(),
        undefined
      )
    ).rejects.toThrow("File uploader project is missing");

    expect(assetDeleted).toBe(true);
    expect(fileDeleted).toBe(true);
  });
});
