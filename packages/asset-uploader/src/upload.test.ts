import { describe, expect, test } from "vitest";
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

describe("createUploadTicket", () => {
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
      },
      {
        id: "asset-retry",
        projectId: "project-4",
        name: (insertedFiles[1] as { name: string }).name,
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
        expect(url.searchParams.get("name")).toBe("eq.existing.png");
        expect(url.searchParams.get("projectId")).toBe("eq.project-1");
        return json({
          id: "asset-1",
          projectId: "project-1",
          filename: "photo",
          description: "Photo",
        });
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
        },
        createContext(),
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
});
