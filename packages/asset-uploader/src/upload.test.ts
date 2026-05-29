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
      db.get("Asset", () => json(null)),
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
      db.get("Asset", () => json(null)),
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

  test("returns the existing upload name for an interrupted upload", async () => {
    let existingFileUpdate: unknown;
    let attemptedFileInsert = false;
    let attemptedAssetInsert = false;
    let attemptedAssetCount = false;
    let attemptedUploadingCount = false;
    const ownerPlanCalls: string[] = [];
    const existingFileName = "old-photo_existing.png";

    server.use(
      ownershipHandler,
      db.head("Asset", () => {
        attemptedAssetCount = true;
        return empty({ headers: { "Content-Range": "*/350" } });
      }),
      db.head("File", () => {
        attemptedUploadingCount = true;
        return empty({ headers: { "Content-Range": "*/1" } });
      }),
      db.post("File", () => {
        attemptedFileInsert = true;
        return empty({ status: 201 });
      }),
      db.post("Asset", () => {
        attemptedAssetInsert = true;
        return empty({ status: 201 });
      }),
      db.get("Asset", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("id")).toBe("eq.asset-4");
        expect(url.searchParams.get("projectId")).toBe("eq.project-4");
        expect(url.searchParams.get("file.status")).toBe("eq.UPLOADING");
        expect(url.searchParams.get("file.isDeleted")).toBe("eq.false");
        expect(url.searchParams.get("file.uploaderProjectId")).toBe(
          "eq.project-4"
        );
        return json({
          name: existingFileName,
          file: { status: "UPLOADING" },
        });
      }),
      db.patch("File", async ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("name")).toBe(`eq.${existingFileName}`);
        expect(url.searchParams.get("status")).toBe("eq.UPLOADING");
        expect(url.searchParams.get("isDeleted")).toBe("eq.false");
        expect(url.searchParams.get("uploaderProjectId")).toBe("eq.project-4");
        existingFileUpdate = await request.json();
        expect(
          typeof (existingFileUpdate as { createdAt?: unknown }).createdAt
        ).toBe("string");
        return json({ name: existingFileName });
      })
    );

    const name = await createUploadName(
      {
        assetId: "asset-4",
        projectId: "project-4",
        type: "image/png",
        filename: "renamed-photo.png",
      },
      createContext({ maxAssetsPerProject: 0, ownerPlanCalls })
    );

    expect(name).toBe(existingFileName);
    expect(existingFileUpdate).toBeDefined();
    expect(attemptedFileInsert).toBe(false);
    expect(attemptedAssetInsert).toBe(false);
    expect(attemptedAssetCount).toBe(false);
    expect(attemptedUploadingCount).toBe(false);
    expect(ownerPlanCalls).toEqual([]);
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
      createUploadName(
        {
          assetId: "asset-5",
          projectId: "project-5",
          type: "image/png",
          filename: "photo.png",
        },
        createContext()
      )
    ).rejects.toThrow(
      'duplicate key value violates unique constraint "Asset_pkey"'
    );

    expect(attemptedFileUpdate).toBe(false);
  });
});
