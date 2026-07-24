import {
  createTestServer,
  db,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import type { CompactBuild } from "@webstudio-is/project-build";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import type { Asset } from "@webstudio-is/sdk";
import { describe, expect, test, vi } from "vitest";
import {
  createPostgresProjectAssetReference,
  createPostgresProjectSnapshotData,
  PostgresProjectReader,
} from "./postgres-project-reader";

const server = createTestServer();
const projectId = "postgres-reader-project";
const timestamp = "2026-07-24T00:00:00.000Z";

const asset = {
  id: "asset-1",
  projectId,
  name: "stored/post.md",
  filename: "post.md",
  size: 5,
  type: "file",
  format: "file",
  meta: {},
  createdAt: timestamp,
  updatedAt: timestamp,
} satisfies Asset;

const build = {
  id: "build-1",
  projectId,
  version: 7,
  createdAt: timestamp,
  updatedAt: timestamp,
  pages: {
    homePageId: "page-1",
    rootFolderId: "folder-1",
    pages: new Map([
      [
        "page-1",
        {
          id: "page-1",
          name: "Home",
          path: "",
          title: "Home",
          rootInstanceId: "body-1",
          meta: {},
        },
      ],
    ]),
    folders: new Map([
      [
        "folder-1",
        {
          id: "folder-1",
          name: "Root",
          slug: "",
          children: ["page-1"],
        },
      ],
    ]),
  },
  breakpoints: [],
  styles: [],
  styleSources: [],
  styleSourceSelections: [],
  props: [],
  dataSources: [],
  resources: [],
  instances: [
    { id: "body-1", type: "instance", component: "Body", children: [] },
  ],
  projectSettings: { meta: {}, compiler: {} },
} satisfies CompactBuild;

const rawBuildRow = {
  id: build.id,
  projectId,
  version: build.version,
  createdAt: timestamp,
  updatedAt: timestamp,
  pages: JSON.stringify({
    meta: {},
    homePage: {
      id: "page-1",
      name: "Home",
      path: "/",
      title: '"Home"',
      meta: {},
      rootInstanceId: "body-1",
    },
    pages: [],
  }),
  breakpoints: "[]",
  styles: "[]",
  styleSources: "[]",
  styleSourceSelections: "[]",
  props: "[]",
  dataSources: "[]",
  resources: "[]",
  instances: JSON.stringify(build.instances),
  deployment: null,
  marketplaceProduct: "{}",
  projectSettings: JSON.stringify(build.projectSettings),
};

const rawAssetRow = {
  assetId: asset.id,
  projectId,
  filename: asset.filename,
  description: null,
  folderId: null,
  file: {
    name: asset.name,
    format: asset.format,
    description: null,
    size: asset.size,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    meta: "{}",
    status: "UPLOADED",
  },
};

const context = {
  ...testContext,
  authorization: { type: "user", userId: "reader-user" },
  getOwnerPlanFeatures: async () => ({}),
} as unknown as AppContext;

const projectOwnershipHandler = db.get("Project", () =>
  json({ id: projectId })
);

describe("PostgreSQL project reader", () => {
  test("creates deterministic snapshot and asset references", async () => {
    const first = await createPostgresProjectSnapshotData({
      build,
      assets: [asset],
      assetFolders: [],
    });
    const repeated = await createPostgresProjectSnapshotData({
      build,
      assets: [asset],
      assetFolders: [],
    });
    const changed = await createPostgresProjectSnapshotData({
      build,
      assets: [{ ...asset, updatedAt: "2026-07-25T00:00:00.000Z" }],
      assetFolders: [],
    });

    expect(repeated).toEqual(first);
    expect(changed.reference.assetRevision).not.toBe(
      first.reference.assetRevision
    );
    expect(first.collections["assets/blobs"]).toEqual([
      [asset.id, createPostgresProjectAssetReference(asset)],
    ]);
  });

  test("reads a revision-checked snapshot through existing PostgreSQL loaders", async () => {
    server.use(
      projectOwnershipHandler,
      db.get("Build", () => json([rawBuildRow])),
      db.get("Asset", () => json([rawAssetRow])),
      db.get("AssetFolder", () => json([]))
    );
    const { reference, collections } = await createPostgresProjectSnapshotData({
      build,
      assets: [asset],
      assetFolders: [],
    });
    const reader = new PostgresProjectReader({
      projectId,
      context,
      assetClient: { readFile: vi.fn() },
    });

    await expect(
      reader.readCollections({ reference, names: ["assets/blobs"] })
    ).resolves.toEqual({ "assets/blobs": collections["assets/blobs"] });
  });

  test("validates file ownership and revision before a ranged read", async () => {
    server.use(
      projectOwnershipHandler,
      db.get("File", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("uploaderProjectId")).toBe(
          `eq.${projectId}`
        );
        return json({
          name: asset.name,
          size: asset.size,
          updatedAt: asset.updatedAt,
        });
      })
    );
    const bytes = new TextEncoder().encode("hello");
    const readFile = vi.fn(
      async (_name: string, range?: { offset: number; length: number }) => {
        const data =
          range === undefined
            ? bytes
            : bytes.slice(range.offset, range.offset + range.length);
        return {
          async *data() {
            yield data;
          },
          contentLength: data.byteLength,
        };
      }
    );
    const reader = new PostgresProjectReader({
      projectId,
      context,
      assetClient: {
        readFile: async (name, range) => {
          const result = await readFile(name, range);
          return { data: result.data(), contentLength: result.contentLength };
        },
      },
    });

    await expect(
      reader.readAsset(createPostgresProjectAssetReference(asset), {
        offset: 1,
        length: 3,
      })
    ).resolves.toEqual(new TextEncoder().encode("ell"));
    expect(readFile).toHaveBeenCalledWith(asset.name, { offset: 1, length: 3 });
  });

  test("rejects a stale asset reference before reading storage", async () => {
    server.use(
      projectOwnershipHandler,
      db.get("File", () =>
        json({
          name: asset.name,
          size: asset.size,
          updatedAt: "2026-07-25T00:00:00.000Z",
        })
      )
    );
    const readFile = vi.fn();
    const reader = new PostgresProjectReader({
      projectId,
      context,
      assetClient: { readFile },
    });

    await expect(
      reader.readAsset(createPostgresProjectAssetReference(asset))
    ).rejects.toThrow("revision is no longer current");
    expect(readFile).not.toHaveBeenCalled();
  });

  test("authorizes before reading file metadata or storage", async () => {
    let didReadFileMetadata = false;
    server.use(
      db.get("Project", () => json(null)),
      db.get("WorkspaceProjectAuthorization", () => json([])),
      db.get("File", () => {
        didReadFileMetadata = true;
        return json({});
      })
    );
    const readFile = vi.fn();
    const deniedProjectId = "postgres-reader-denied-project";
    const reader = new PostgresProjectReader({
      projectId: deniedProjectId,
      context,
      assetClient: { readFile },
    });

    await expect(
      reader.readAsset({
        ...createPostgresProjectAssetReference(asset),
        projectId: deniedProjectId,
      })
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(didReadFileMetadata).toBe(false);
    expect(readFile).not.toHaveBeenCalled();
  });
});
