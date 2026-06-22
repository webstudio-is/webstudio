import { Buffer } from "node:buffer";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  createImageAssetFixture,
  createPageFixture,
  createPublishedProjectBundleFixture,
} from "@webstudio-is/protocol/fixtures";
import { type PublishedProjectBundle } from "@webstudio-is/protocol";
import {
  __testing__,
  importPublishedProjectBundle,
} from "./project-bundle-import.server";

const createData = (
  overrides: Partial<PublishedProjectBundle> = {}
): PublishedProjectBundle => {
  const page = createPageFixture({ meta: { socialImageAssetId: "asset-1" } });
  return createPublishedProjectBundleFixture({
    assets: [
      createImageAssetFixture({
        id: "asset-1",
        filename: "Image",
        description: "Hero image",
      }),
    ],
    build: {
      version: 3,
      breakpoints: [["base", { id: "base", label: "Base" }]],
      styleSources: [["source-1", { id: "source-1", type: "local" }]],
      styleSourceSelections: [
        ["root", { instanceId: "root", values: ["source-1"] }],
      ],
      props: [
        [
          "prop-1",
          {
            id: "prop-1",
            instanceId: "root",
            name: "id",
            type: "string",
            value: "hero",
          },
        ],
      ],
      instances: [
        [
          "root",
          {
            type: "instance",
            id: "root",
            component: "Body",
            children: [],
          },
        ],
      ],
    },
    buildPages: {
      meta: {},
      pages: [page],
      folders: [
        {
          id: "root-folder",
          name: "Root",
          slug: "",
          children: ["home"],
        },
      ],
    },
    page,
    ...overrides,
  });
};

const createPostgrestClient = (
  calls: string[],
  options: { existingFileNames?: string[] } = {}
) => ({
  from: (table: string) => {
    if (table === "File") {
      return {
        select: () => ({
          in: async () => {
            calls.push("files-select");
            return {
              data: (options.existingFileNames ?? []).map((name) => ({
                name,
              })),
              error: undefined,
            };
          },
        }),
        update: () => ({
          in: async () => {
            calls.push("files-restore");
            return { error: undefined };
          },
        }),
        insert: async () => {
          calls.push("files-insert");
          return { error: undefined };
        },
      };
    }

    if (table === "Build") {
      return {
        update: () => ({
          match: async () => {
            calls.push("build-update");
            return { count: 1, error: undefined };
          },
        }),
      };
    }

    if (table === "Project") {
      return {
        update: (data: { previewImageAssetId: string | null }) => ({
          eq: async () => {
            calls.push(
              data.previewImageAssetId === null
                ? "project-preview-reset"
                : "project-preview-update"
            );
            return { error: undefined };
          },
        }),
      };
    }

    if (table === "Asset") {
      return {
        delete: () => ({
          eq: async () => {
            calls.push("assets-delete");
            return { error: undefined };
          },
        }),
        insert: async () => {
          calls.push("assets-insert");
          return { error: undefined };
        },
      };
    }

    throw new Error(`Unexpected table ${table}`);
  },
});

describe("build import helpers", () => {
  const createAssetClient = vi.fn();
  const hasProjectPermit = vi.fn();
  const loadDevBuildByProjectId = vi.fn();
  const uploadImportedAssetFiles = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    createAssetClient.mockReturnValue({ uploadFile: vi.fn() });
    hasProjectPermit.mockResolvedValue(true);
    loadDevBuildByProjectId.mockResolvedValue({
      id: "target-build",
      projectId: "target-project",
      version: 3,
    });
    uploadImportedAssetFiles.mockResolvedValue(undefined);
  });

  test("rejects missing synced data version with compatibility message", () => {
    expect(() =>
      __testing__.assertBundleVersion(
        {} as Pick<PublishedProjectBundle, "bundleVersion">
      )
    ).toThrow("Sync with a compatible API/CLI version");
  });

  test("rejects missing build permission", async () => {
    hasProjectPermit.mockResolvedValue(false);

    await expect(
      __testing__.assertProjectBuildPermit({
        ctx: {} as never,
        hasProjectPermit,
        projectId: "target-project",
      })
    ).rejects.toThrow("You don't have permission to build this project.");
    expect(hasProjectPermit).toHaveBeenCalledWith(
      { projectId: "target-project", permit: "build" },
      {}
    );
  });

  test("serializes imported build data into compact build columns", () => {
    const update = __testing__.createBuildImportUpdate({
      data: createData(),
      lastTransactionId: "import-tx",
      updatedAt: "2024-02-01T00:00:00.000Z",
      version: 4,
    });

    expect(update).toMatchObject({
      version: 4,
      lastTransactionId: "import-tx",
      updatedAt: "2024-02-01T00:00:00.000Z",
    });
    expect(JSON.parse(update.breakpoints)).toEqual([
      { id: "base", label: "Base" },
    ]);
    expect(JSON.parse(update.styleSources)).toEqual([
      { id: "source-1", type: "local" },
    ]);
    expect(JSON.parse(update.styleSourceSelections)).toEqual([
      { instanceId: "root", values: ["source-1"] },
    ]);
    expect(JSON.parse(update.props)).toEqual([
      {
        id: "prop-1",
        instanceId: "root",
        name: "id",
        type: "string",
        value: "hero",
      },
    ]);
  });

  test("uses imported home social image only when corresponding asset exists", () => {
    expect(__testing__.getImportedPreviewImageAssetId(createData())).toBe(
      "asset-1"
    );

    expect(
      __testing__.getImportedPreviewImageAssetId(createData({ assets: [] }))
    ).toBeNull();
  });

  test("remaps imported asset rows to destination project", () => {
    expect(
      __testing__.createImportedAssetRows({
        assets: [
          createData().assets[0],
          {
            ...createData().assets[0],
            id: "asset-2",
            filename: undefined,
            description: undefined,
          },
        ],
        projectId: "destination-project",
      })
    ).toEqual([
      {
        id: "asset-1",
        projectId: "destination-project",
        name: "image.png",
        filename: "Image",
        description: "Hero image",
      },
      {
        id: "asset-2",
        projectId: "destination-project",
        name: "image.png",
        filename: null,
        description: null,
      },
    ]);
  });

  test("creates imported file rows from asset metadata", () => {
    expect(
      __testing__.createImportedFileRows({
        assets: [createData().assets[0]],
        projectId: "destination-project",
      })
    ).toEqual([
      {
        name: "image.png",
        status: "UPLOADED",
        format: "png",
        size: 100,
        meta: JSON.stringify({ width: 100, height: 100 }),
        createdAt: "2024-01-01T00:00:00.000Z",
        uploaderProjectId: "destination-project",
        isDeleted: false,
      },
    ]);
  });

  test("updates the build before replacing existing asset rows", async () => {
    const calls: string[] = [];
    uploadImportedAssetFiles.mockImplementation(async () => {
      calls.push("asset-files-upload");
    });

    await importPublishedProjectBundle(
      {
        assetFiles: [{ name: "image.png", data: "aGVsbG8=" }],
        ctx: {
          postgrest: {
            client: createPostgrestClient(calls),
          },
        } as never,
        data: createData(),
        projectId: "target-project",
      },
      {
        createAssetClient,
        hasProjectPermit,
        loadDevBuildByProjectId,
        uploadImportedAssetFiles,
      }
    );

    expect(calls).toEqual([
      "files-select",
      "asset-files-upload",
      "files-insert",
      "build-update",
      "project-preview-reset",
      "assets-delete",
      "assets-insert",
      "project-preview-update",
    ]);
  });

  test("allows importing data without version when check is explicitly ignored", async () => {
    const calls: string[] = [];

    await importPublishedProjectBundle(
      {
        ctx: {
          postgrest: {
            client: createPostgrestClient(calls),
          },
        } as never,
        data: createData({ assets: [], bundleVersion: undefined }),
        ignoreVersionCheck: true,
        projectId: "target-project",
      },
      {
        createAssetClient,
        hasProjectPermit,
        loadDevBuildByProjectId,
        uploadImportedAssetFiles,
      }
    );

    expect(calls).toContain("build-update");
  });

  test("rejects import with assets when asset files are missing", async () => {
    await expect(
      importPublishedProjectBundle(
        {
          ctx: {
            postgrest: {
              client: createPostgrestClient([]),
            },
          } as never,
          data: createData(),
          projectId: "target-project",
        },
        {
          createAssetClient,
          hasProjectPermit,
          loadDevBuildByProjectId,
          uploadImportedAssetFiles,
        }
      )
    ).rejects.toThrow("Imported asset files are required.");
  });

  test("uploads missing imported asset files before creating file rows", async () => {
    const calls: string[] = [];
    uploadImportedAssetFiles.mockImplementation(async () => {
      calls.push("asset-files-upload");
    });

    await importPublishedProjectBundle(
      {
        assetFiles: [{ name: "image.png", data: "aGVsbG8=" }],
        ctx: {
          postgrest: {
            client: createPostgrestClient(calls),
          },
        } as never,
        data: createData(),
        projectId: "target-project",
      },
      {
        createAssetClient,
        hasProjectPermit,
        loadDevBuildByProjectId,
        uploadImportedAssetFiles,
      }
    );

    expect(uploadImportedAssetFiles).toHaveBeenCalledWith({
      assetClient: expect.objectContaining({
        uploadFile: expect.any(Function),
      }),
      assetFiles: [{ name: "image.png", data: "aGVsbG8=" }],
      assets: createData().assets,
    });
    expect(calls.indexOf("files-select")).toBeLessThan(
      calls.indexOf("asset-files-upload")
    );
    expect(calls.indexOf("asset-files-upload")).toBeLessThan(
      calls.indexOf("files-insert")
    );
  });

  test("loads existing imported file rows by global file name", async () => {
    const calls: string[] = [];

    await expect(
      __testing__.loadExistingImportedAssetFileNames({
        assets: createData().assets,
        ctx: {
          postgrest: {
            client: createPostgrestClient(calls, {
              existingFileNames: ["image.png"],
            }),
          },
        } as never,
      })
    ).resolves.toEqual(new Set(["image.png"]));

    expect(calls).toEqual(["files-select"]);
  });

  test("restores imported file rows by global file name", async () => {
    const calls: string[] = [];
    uploadImportedAssetFiles.mockImplementation(async () => {
      calls.push("asset-files-upload");
    });

    await importPublishedProjectBundle(
      {
        assetFiles: [{ name: "image.png", data: "aGVsbG8=" }],
        ctx: {
          postgrest: {
            client: createPostgrestClient(calls, {
              existingFileNames: ["image.png"],
            }),
          },
        } as never,
        data: createData(),
        projectId: "target-project",
      },
      {
        createAssetClient,
        hasProjectPermit,
        loadDevBuildByProjectId,
        uploadImportedAssetFiles,
      }
    );

    expect(calls).toContain("files-restore");
  });

  test("uploads imported asset files even when file rows already exist", async () => {
    const calls: string[] = [];

    await importPublishedProjectBundle(
      {
        assetFiles: [{ name: "image.png", data: "aGVsbG8=" }],
        ctx: {
          postgrest: {
            client: createPostgrestClient(calls, {
              existingFileNames: ["image.png"],
            }),
          },
        } as never,
        data: createData(),
        projectId: "target-project",
      },
      {
        createAssetClient,
        hasProjectPermit,
        loadDevBuildByProjectId,
        uploadImportedAssetFiles,
      }
    );

    expect(uploadImportedAssetFiles).toHaveBeenCalledWith({
      assetClient: expect.objectContaining({
        uploadFile: expect.any(Function),
      }),
      assetFiles: [{ name: "image.png", data: "aGVsbG8=" }],
      assets: createData().assets,
    });
    expect(calls).not.toContain("files-insert");
  });

  test("uploads imported asset file bytes through asset client", async () => {
    type AssetClient = ReturnType<
      typeof import("~/shared/asset-client").createAssetClient
    >;
    const uploadFile = vi.fn<AssetClient["uploadFile"]>(async () => ({
      format: "png",
      meta: { width: 100, height: 100 },
      size: 5,
    }));

    await __testing__.uploadImportedAssetFiles({
      assetClient: { uploadFile },
      assetFiles: [{ name: "image.png", data: "aGVsbG8=" }],
      assets: createData().assets,
    });

    expect(uploadFile).toHaveBeenCalledWith(
      "image.png",
      "image",
      expect.anything(),
      { width: 100, height: 100, format: "png" }
    );
    const stream = uploadFile.mock.calls[0][2] as AsyncIterable<Uint8Array>;
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    expect(Buffer.concat(chunks).toString("utf8")).toBe("hello");
  });

  test("rejects partial imported asset file payloads", () => {
    expect(() =>
      __testing__.assertAssetFilesMatchAssets({
        assetFiles: [],
        assets: createData().assets,
      })
    ).toThrow("Imported asset file is missing: image.png");
  });

  test("rejects missing imported asset file payload", () => {
    expect(() =>
      __testing__.assertAssetFilesMatchAssets({
        assetFiles: undefined,
        assets: createData().assets,
      })
    ).toThrow("Imported asset files are required.");
  });

  test("rejects imported asset files not present in data assets", () => {
    expect(() =>
      __testing__.assertAssetFilesMatchAssets({
        assetFiles: [{ name: "other.png", data: "aGVsbG8=" }],
        assets: createData().assets,
      })
    ).toThrow("Imported asset file does not exist in data assets: other.png");
  });

  test("rejects imported asset names with path separators", () => {
    expect(() =>
      __testing__.assertImportedAssetNames([
        { ...createData().assets[0], name: "../image.png" },
      ])
    ).toThrow("Imported asset name is invalid: ../image.png");
  });

  test("rejects duplicated imported asset names", () => {
    expect(() =>
      __testing__.assertImportedAssetNames([
        createData().assets[0],
        { ...createData().assets[0], id: "asset-2" },
      ])
    ).toThrow("Imported asset name is duplicated: image.png");
  });

  test("rejects duplicated imported asset ids", () => {
    expect(() =>
      __testing__.assertImportedAssetNames([
        createData().assets[0],
        { ...createData().assets[0], name: "other.png" },
      ])
    ).toThrow("Imported asset id is duplicated: asset-1");
  });

  test("rejects empty imported asset ids", () => {
    expect(() =>
      __testing__.assertImportedAssetNames([
        { ...createData().assets[0], id: "" },
      ])
    ).toThrow("Imported asset id is invalid.");
  });

  test("rejects duplicated imported asset file payloads", () => {
    expect(() =>
      __testing__.assertAssetFilesMatchAssets({
        assetFiles: [
          { name: "image.png", data: "aGVsbG8=" },
          { name: "image.png", data: "aGVsbG8=" },
        ],
        assets: createData().assets,
      })
    ).toThrow("Imported asset file is duplicated: image.png");
  });

  test("rejects invalid imported asset file data", () => {
    expect(() =>
      __testing__.assertAssetFilesMatchAssets({
        assetFiles: [{ name: "image.png", data: "not base64" }],
        assets: createData().assets,
      })
    ).toThrow("Imported asset file data is invalid: image.png");
  });
});
