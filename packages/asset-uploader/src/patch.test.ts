import { describe, test, expect } from "vitest";
import { enablePatches, enableMapSet } from "immer";
import {
  createTestServer,
  db,
  json,
  empty,
  testContext,
} from "@webstudio-is/postgrest/testing";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { patchAssets } from "./patch";
import type { Patch } from "immer";

enablePatches();
enableMapSet();

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
    const localAssetRow = { ...assetRow, projectId };
    let updatedDescription: string | undefined;

    server.use(
      ownershipHandler,
      db.get("Asset", () => json([localAssetRow])),
      db.patch("Asset", async ({ request }) => {
        const body = (await request.json()) as { description?: string };
        updatedDescription = body.description ?? undefined;
        return json({ id: "asset-1" });
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
});
