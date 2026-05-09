import { describe, expect, test } from "vitest";
import {
  createTestServer,
  db,
  empty,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { createUploadName } from "./upload";

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

describe("createUploadName", () => {
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
        return empty({ headers: { "Content-Range": "*/0" } });
      }),
      db.post("File", async ({ request }) => {
        insertedFile = await request.json();
        return empty({ status: 201 });
      }),
      db.post("Asset", async ({ request }) => {
        expect(await request.json()).toEqual({
          id: "asset-1",
          projectId: "project-1",
          name: expect.stringMatching(/^photo_.+\.png$/),
        });
        return empty({ status: 201 });
      })
    );

    const name = await createUploadName(
      {
        assetId: "asset-1",
        projectId: "project-1",
        type: "image/png",
        filename: "photo.png",
      },
      createContext()
    );

    expect(name).toMatch(/^photo_.+\.png$/);
    expect(insertedFile).toMatchObject({
      name,
      status: "UPLOADING",
      uploaderProjectId: "project-1",
    });
  });

  test("throws when uploaded assets and recent uploads reach the limit", async () => {
    server.use(
      ownershipHandler,
      db.head("Asset", () => empty({ headers: { "Content-Range": "*/349" } })),
      db.head("File", () => empty({ headers: { "Content-Range": "*/1" } }))
    );

    await expect(
      createUploadName(
        {
          assetId: "asset-2",
          projectId: "project-2",
          type: "image/png",
          filename: "photo.png",
        },
        createContext()
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
      db.post("File", () => {
        insertedFile = true;
        return empty({ status: 201 });
      }),
      db.post("Asset", () => empty({ status: 201 }))
    );

    await expect(
      createUploadName(
        {
          assetId: "asset-3",
          projectId: "workspace-project",
          type: "image/png",
          filename: "photo.png",
        },
        createContext({ maxAssetsPerProject: 350, ownerPlanCalls })
      )
    ).resolves.toMatch(/^photo_.+\.png$/);

    expect(insertedFile).toBe(true);
    expect(ownerPlanCalls).toEqual(["team-owner"]);
  });
});
