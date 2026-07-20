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

const { getRevisionFilename } = __testing__;
const server = createTestServer();

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
  });

  test("uploads an immutable revision and keeps the asset id", async () => {
    let revisionName = "";
    let swapInput: unknown;
    server.use(
      ownershipHandler,
      db.get("Asset", () => json(assetRow)),
      db.post("File", async ({ request }) => {
        const input = (await request.json()) as { name: string };
        revisionName = input.name;
        expect(input).toMatchObject({
          name: expect.stringMatching(/^settings_.+\.json$/),
          status: "UPLOADING",
          uploaderProjectId: "project",
          createdAt: oldFile.createdAt,
        });
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
          size: 7,
          updatedAt: "2026-07-18T00:00:01.000Z",
        })
      ),
      http.post(
        "http://test-postgrest/rpc/swap_asset_file",
        async ({ request }) => {
          swapInput = await request.json();
          return HttpResponse.json("updated");
        }
      )
    );

    const asset = await updateAssetContent(
      {
        assetId: "asset",
        projectId: "project",
        expectedName: oldFile.name,
        data: new Blob(['{"a":1}']).stream(),
      },
      {
        uploadFile: async (name, type, data) => {
          expect(name).toBe(revisionName);
          expect(type).toBe("file");
          expect(await new Response(data as ReadableStream).text()).toBe(
            '{"a":1}'
          );
          return { format: "json", size: 7, meta: {} };
        },
      },
      createContext()
    );

    expect(asset).toMatchObject({
      id: "asset",
      projectId: "project",
      name: revisionName,
      description: "Settings",
      folderId: "data",
      format: "json",
      createdAt: oldFile.createdAt,
      updatedAt: "2026-07-18T00:00:01.000Z",
    });
    expect(swapInput).toEqual({
      project_id: "project",
      asset_id: "asset",
      expected_name: oldFile.name,
      replacement_name: revisionName,
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
      updateAssetContent(
        {
          assetId: "asset",
          projectId: "project",
          expectedName: oldFile.name,
          data: new Blob(["updated"]).stream(),
        },
        {
          uploadFile: async () => ({ format: "json", size: 7, meta: {} }),
        },
        createContext()
      )
    ).rejects.toBeInstanceOf(AssetRevisionConflictError);
    expect(discardedRevision).toBe(true);
  });

  test("accepts a revision when the swap commits without a response", async () => {
    let assetLoadCount = 0;
    let revisionName = "";
    server.use(
      ownershipHandler,
      db.get("Asset", () => {
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
