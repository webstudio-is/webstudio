import { describe, test, expect } from "vitest";
import {
  createTestServer,
  db,
  json,
  empty,
  testContext,
} from "@webstudio-is/postgrest/testing";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import {
  loadAssetsByProjectWithClient,
  patchAssetsWithClient,
} from "./asset-patch-core";
import { patchAssets } from "./patch";
import type { Patch } from "immer";

const server = createTestServer();

const uid = () => `proj-${Math.random().toString(36).slice(2)}`;

const createContext = (): AppContext =>
  ({
    ...testContext,
    authorization: { type: "user", userId: "user-1" },
    getOwnerPlanFeatures: async () => ({}),
  }) as unknown as AppContext;

/** hasProjectPermit: direct ownership check — returns a row for any project */
const ownershipHandler = db.get("Project", ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.has("userId")) {
    return json({ id: url.searchParams.get("id")?.replace("eq.", "") });
  }
  return json(null);
});

const assetRow = {
  assetId: "asset-1",
  projectId: "proj-1",
  filename: "photo.jpg",
  description: null,
  file: {
    name: "photo.jpg",
    format: "jpg",
    description: null,
    size: 1000,
    createdAt: "2024-01-01T00:00:00.000Z",
    meta: JSON.stringify({ width: 100, height: 100 }),
    status: "UPLOADED",
  },
};

describe("patchAssets (msw)", () => {
  test("throws when caller lacks edit access", async () => {
    const projectId = uid();
    server.use(
      db.get("Project", () => json(null)),
      db.get("WorkspaceProjectAuthorization", () => json([]))
    );

    await expect(
      patchAssets({ projectId }, [], createContext())
    ).rejects.toThrow("You don't have edit access");
  });

  test("no-op when patches are empty and no assets exist", async () => {
    const projectId = uid();
    server.use(
      ownershipHandler,
      db.get("Asset", () => json([]))
    );

    // Should complete without throwing
    await patchAssets({ projectId }, [], createContext());
  });

  test("updates asset description via patch", async () => {
    const projectId = uid();
    let localAssetRow: Omit<typeof assetRow, "description"> & {
      description: string | null;
    } = { ...assetRow, projectId };
    let updatedDescription: string | undefined;

    server.use(
      ownershipHandler,
      db.get("Asset", () => json([localAssetRow])),
      db.patch("Asset", async ({ request }) => {
        const body = (await request.json()) as { description?: string };
        updatedDescription = body.description ?? undefined;
        localAssetRow = {
          ...localAssetRow,
          description: body.description ?? localAssetRow.description,
        };
        return json({
          filename: localAssetRow.filename,
          description: localAssetRow.description,
        });
      })
    );

    const patches: Patch[] = [
      {
        op: "replace",
        path: ["asset-1", "description"],
        value: "New description",
      },
    ];

    await patchAssets({ projectId }, patches, createContext());
    expect(updatedDescription).toBe("New description");
  });

  test("updates asset filename via patch", async () => {
    const projectId = uid();
    let localAssetRow = { ...assetRow, projectId };
    let updatedFilename: string | undefined;

    server.use(
      ownershipHandler,
      db.get("Asset", () => json([localAssetRow])),
      db.patch("Asset", async ({ request }) => {
        const body = (await request.json()) as { filename?: string };
        updatedFilename = body.filename;
        localAssetRow = {
          ...localAssetRow,
          filename: body.filename ?? localAssetRow.filename,
        };
        return json({
          filename: localAssetRow.filename,
          description: localAssetRow.description,
        });
      })
    );

    const patches: Patch[] = [
      {
        op: "replace",
        path: ["asset-1", "filename"],
        value: "renamed-photo.jpg",
      },
    ];

    await patchAssets({ projectId }, patches, createContext());
    expect(updatedFilename).toBe("renamed-photo.jpg");
    await expect(
      loadAssetsByProjectWithClient(projectId, testContext.postgrest.client)
    ).resolves.toEqual([
      expect.objectContaining({
        id: "asset-1",
        filename: "renamed-photo.jpg",
      }),
    ]);
  });

  test("does not update metadata when adding an existing asset", async () => {
    const projectId = uid();
    const localAssetRow = { ...assetRow, projectId };
    let updateCount = 0;

    server.use(
      ownershipHandler,
      db.get("Asset", () => json([localAssetRow])),
      db.patch("Asset", () => {
        updateCount += 1;
        return json({
          filename: localAssetRow.filename,
          description: localAssetRow.description,
        });
      })
    );

    const [asset] = await loadAssetsByProjectWithClient(
      projectId,
      testContext.postgrest.client
    );
    await patchAssets(
      { projectId },
      [{ op: "add", path: [asset.id], value: asset }],
      createContext()
    );

    expect(updateCount).toBe(0);
  });

  test("throws when an asset metadata update matches no database row", async () => {
    const projectId = uid();
    const localAssetRow = { ...assetRow, projectId };

    server.use(
      ownershipHandler,
      db.get("Asset", () => json([localAssetRow])),
      db.patch("Asset", () =>
        json(
          {
            code: "PGRST116",
            message: "The result contains 0 rows",
          },
          { status: 406 }
        )
      )
    );

    await expect(
      patchAssets(
        { projectId },
        [
          {
            op: "replace",
            path: ["asset-1", "filename"],
            value: "renamed-photo.jpg",
          },
        ],
        createContext()
      )
    ).rejects.toThrow();
  });

  test("adds new asset when patch inserts an entry", async () => {
    const projectId = uid();
    let insertedAssets: unknown;

    server.use(
      ownershipHandler,
      // loadAssetsByProject returns empty list — no existing assets
      db.get("Asset", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("projectId")) {
          return json([]);
        }
        return json([]);
      }),
      // File lookup for undo restore
      db.get("File", () => json([{ name: "new.jpg" }])),
      // restore isDeleted=false
      db.patch("File", () => empty({ status: 204 })),
      // asset insert
      db.post("Asset", async ({ request }) => {
        insertedAssets = await request.json();
        return empty({ status: 201 });
      })
    );

    const patches: Patch[] = [
      {
        op: "add",
        path: ["asset-new"],
        value: {
          id: "asset-new",
          name: "new.jpg",
          type: "image",
          projectId,
          format: "jpg",
          size: 500,
          description: null,
          createdAt: "2024-01-01T00:00:00.000Z",
          path: "",
          meta: { width: 50, height: 50 },
        },
      },
    ];

    await patchAssets({ projectId }, patches, createContext());
    expect(insertedAssets).toBeDefined();
  });

  test("core helper deletes assets and marks unused files as deleted", async () => {
    const projectId = uid();
    const localAssetRow = { ...assetRow, projectId };
    let resetPreviewImage = false;
    let deletedAsset = false;
    let deletedFile = false;

    server.use(
      db.get("Asset", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.has("id")) {
          return json([
            {
              id: "asset-1",
              projectId,
              name: "photo.jpg",
              file: localAssetRow.file,
            },
          ]);
        }
        if (url.searchParams.has("name")) {
          return json([]);
        }
        return json([localAssetRow]);
      }),
      db.patch("Project", async ({ request }) => {
        const body = (await request.json()) as {
          previewImageAssetId?: string | null;
        };
        resetPreviewImage = body.previewImageAssetId === null;
        return empty({ status: 204 });
      }),
      db.delete("Asset", () => {
        deletedAsset = true;
        return empty({ status: 204 });
      }),
      db.patch("File", async ({ request }) => {
        const body = (await request.json()) as { isDeleted?: boolean };
        deletedFile = body.isDeleted === true;
        return empty({ status: 204 });
      })
    );

    const patches: Patch[] = [
      {
        op: "remove",
        path: ["asset-1"],
      },
    ];

    await patchAssetsWithClient(
      { projectId, client: testContext.postgrest.client },
      patches
    );

    expect(resetPreviewImage).toBe(true);
    expect(deletedAsset).toBe(true);
    expect(deletedFile).toBe(true);
  });

  test("core helper stops asset deletion when preview reset fails", async () => {
    const projectId = uid();
    const localAssetRow = { ...assetRow, projectId };
    let deletedAsset = false;

    server.use(
      db.get("Asset", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.has("id")) {
          return json([
            {
              id: "asset-1",
              projectId,
              name: "photo.jpg",
              file: localAssetRow.file,
            },
          ]);
        }
        return json([localAssetRow]);
      }),
      db.patch("Project", () => json({ message: "db error" }, { status: 500 })),
      db.delete("Asset", () => {
        deletedAsset = true;
        return empty({ status: 204 });
      })
    );

    const patches: Patch[] = [
      {
        op: "remove",
        path: ["asset-1"],
      },
    ];

    await expect(
      patchAssetsWithClient(
        { projectId, client: testContext.postgrest.client },
        patches
      )
    ).rejects.toThrow();

    expect(deletedAsset).toBe(false);
  });

  test("core helper stops file cleanup when asset delete fails", async () => {
    const projectId = uid();
    const localAssetRow = { ...assetRow, projectId };
    let deletedFile = false;

    server.use(
      db.get("Asset", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.has("id")) {
          return json([
            {
              id: "asset-1",
              projectId,
              name: "photo.jpg",
              file: localAssetRow.file,
            },
          ]);
        }
        if (url.searchParams.has("name")) {
          return json([]);
        }
        return json([localAssetRow]);
      }),
      db.patch("Project", () => empty({ status: 204 })),
      db.delete("Asset", () => json({ message: "db error" }, { status: 500 })),
      db.patch("File", () => {
        deletedFile = true;
        return empty({ status: 204 });
      })
    );

    const patches: Patch[] = [
      {
        op: "remove",
        path: ["asset-1"],
      },
    ];

    await expect(
      patchAssetsWithClient(
        { projectId, client: testContext.postgrest.client },
        patches
      )
    ).rejects.toThrow();

    expect(deletedFile).toBe(false);
  });

  test("core helper stops asset insert when file restore fails", async () => {
    const projectId = uid();
    let insertedAssets = false;

    server.use(
      db.get("Asset", () => json([])),
      db.get("File", () => json([{ name: "new.jpg" }])),
      db.patch("File", () => json({ message: "db error" }, { status: 500 })),
      db.post("Asset", () => {
        insertedAssets = true;
        return empty({ status: 201 });
      })
    );

    const patches: Patch[] = [
      {
        op: "add",
        path: ["asset-new"],
        value: {
          id: "asset-new",
          name: "new.jpg",
          type: "image",
          projectId,
          format: "jpg",
          size: 500,
          description: null,
          createdAt: "2024-01-01T00:00:00.000Z",
          path: "",
          meta: { width: 50, height: 50 },
        },
      },
    ];

    await expect(
      patchAssetsWithClient(
        { projectId, client: testContext.postgrest.client },
        patches
      )
    ).rejects.toThrow();

    expect(insertedAssets).toBe(false);
  });
});
