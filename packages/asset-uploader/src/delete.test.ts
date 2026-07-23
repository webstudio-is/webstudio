import { describe, test, expect } from "vitest";
import {
  createTestServer,
  db,
  json,
  empty,
  testContext,
} from "@webstudio-is/postgrest/testing";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import { deleteAssets } from "./delete";

const server = createTestServer();

const uid = () => `proj-${Math.random().toString(36).slice(2)}`;

const createContext = (): AppContext =>
  ({
    ...testContext,
    authorization: { type: "user", userId: "user-1" },
    getOwnerPlanFeatures: async () => ({}),
  }) as unknown as AppContext;

/** hasProjectPermit: direct ownership check returns a row for a given projectId */
const ownershipHandler = db.get("Project", ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.has("userId")) {
    return json({ id: url.searchParams.get("id")?.replace("eq.", "") });
  }
  return json(null);
});

describe("deleteAssets (msw)", () => {
  test("throws AuthorizationError when caller lacks edit access", async () => {
    const projectId = uid();
    server.use(
      db.get("Project", () => json(null)),
      db.get("WorkspaceProjectAuthorization", () => json([]))
    );

    await expect(
      deleteAssets({ ids: ["asset-1"], projectId }, createContext())
    ).rejects.toThrow(AuthorizationError);
  });

  test("throws when no assets found", async () => {
    const projectId = uid();
    server.use(
      ownershipHandler,
      db.get("Asset", () => json([]))
    );

    await expect(
      deleteAssets({ ids: ["asset-1"], projectId }, createContext())
    ).rejects.toThrow("Assets not found");
  });

  test("deletes assets and marks unused file as deleted", async () => {
    const projectId = uid();
    const assetRow = {
      id: "asset-1",
      projectId,
      name: "photo.jpg",
      file: { name: "photo.jpg" },
    };
    let patchedProject = false;
    let deletedAsset = false;

    server.use(
      ownershipHandler,
      db.get("Asset", ({ request }) => {
        const url = new URL(request.url);
        // usage check (in name filter) — no other assets use this file
        if (url.searchParams.get("name")) {
          return json([]);
        }
        return json([assetRow]);
      }),
      db.patch("Project", () => {
        patchedProject = true;
        return json({ id: projectId });
      }),
      db.delete("Asset", () => {
        deletedAsset = true;
        return empty({ status: 204 });
      }),
      db.patch("File", () => empty({ status: 204 }))
    );

    await deleteAssets({ ids: ["asset-1"], projectId }, createContext());

    expect(patchedProject).toBe(true);
    expect(deletedAsset).toBe(true);
  });

  test("does not mark file deleted when another asset still uses it", async () => {
    const projectId = uid();
    const assetRow = {
      id: "asset-1",
      projectId,
      name: "photo.jpg",
      file: { name: "photo.jpg" },
    };
    let markedFileDeleted = false;
    let assetGetCount = 0;

    server.use(
      ownershipHandler,
      db.get("Asset", () => {
        assetGetCount += 1;
        // First call: load the assets to delete. Second call: usage check.
        if (assetGetCount === 1) {
          return json([assetRow]);
        }
        // usage check — another asset still references the file
        return json([{ name: "photo.jpg" }]);
      }),
      db.patch("Project", () => json({ id: projectId })),
      db.delete("Asset", () => empty({ status: 204 })),
      db.patch("File", () => {
        markedFileDeleted = true;
        return empty({ status: 204 });
      })
    );

    await deleteAssets({ ids: ["asset-1"], projectId }, createContext());

    expect(markedFileDeleted).toBe(false);
  });
});
