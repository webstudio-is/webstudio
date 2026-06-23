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
} from "./project-import.server";

const {
  assertBundleVersion,
  assertImportedAssetFilesUploaded,
  assertImportedAssetNames,
  assertProjectBuildPermit,
  createBuildImportUpdate,
  createImportedAssetRows,
  getImportedPreviewImageAssetId,
} = __testing__;

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
  options: {
    existingFileNames?: string[];
    fileFilters?: [string, string][];
  } = {}
) => ({
  from: (table: string) => {
    if (table === "File") {
      const selectFiles = {
        eq: (column: string, value: string) => {
          options.fileFilters?.push([column, value]);
          return selectFiles;
        },
        in: async () => {
          calls.push("files-select");
          return {
            data: (options.existingFileNames ?? []).map((name) => ({
              name,
            })),
            error: undefined,
          };
        },
      };
      return {
        select: () => selectFiles,
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
  const hasProjectPermit = vi.fn();
  const loadDevBuildByProjectId = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    hasProjectPermit.mockResolvedValue(true);
    loadDevBuildByProjectId.mockResolvedValue({
      id: "target-build",
      projectId: "target-project",
      version: 3,
    });
  });

  test("rejects missing synced data version with compatibility message", () => {
    expect(() =>
      assertBundleVersion({} as Pick<PublishedProjectBundle, "bundleVersion">)
    ).toThrow("Sync with a compatible API/CLI version");
  });

  test("rejects missing build permission", async () => {
    hasProjectPermit.mockResolvedValue(false);

    await expect(
      assertProjectBuildPermit({
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
    const update = createBuildImportUpdate({
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
    expect(getImportedPreviewImageAssetId(createData())).toBe("asset-1");

    expect(
      getImportedPreviewImageAssetId(createData({ assets: [] }))
    ).toBeNull();
  });

  test("remaps imported asset rows to destination project", () => {
    expect(
      createImportedAssetRows({
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

  test("updates the build before replacing asset rows", async () => {
    const calls: string[] = [];

    await importPublishedProjectBundle(
      {
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
        hasProjectPermit,
        loadDevBuildByProjectId,
      }
    );

    expect(calls).toEqual([
      "files-select",
      "files-restore",
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
        hasProjectPermit,
        loadDevBuildByProjectId,
      }
    );

    expect(calls).toContain("build-update");
  });

  test("rejects import with assets when uploaded file rows are missing", async () => {
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
          hasProjectPermit,
          loadDevBuildByProjectId,
        }
      )
    ).rejects.toThrow('Imported asset files are missing: ["image.png"]');
  });

  test("requires uploaded destination file rows for imported assets", async () => {
    const calls: string[] = [];
    const fileFilters: [string, string][] = [];

    await expect(
      assertImportedAssetFilesUploaded({
        assets: createData().assets,
        ctx: {
          postgrest: {
            client: createPostgrestClient(calls, {
              existingFileNames: ["image.png"],
              fileFilters,
            }),
          },
        } as never,
        projectId: "target-project",
      })
    ).resolves.toBeUndefined();

    expect(calls).toEqual(["files-select", "files-restore"]);
    expect(fileFilters).toEqual([
      ["status", "UPLOADED"],
      ["uploaderProjectId", "target-project"],
    ]);
  });

  test("makes imported file rows visible", async () => {
    const calls: string[] = [];

    await importPublishedProjectBundle(
      {
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
        hasProjectPermit,
        loadDevBuildByProjectId,
      }
    );

    expect(calls).toContain("files-restore");
  });

  test("rejects imported asset names with path separators", () => {
    expect(() =>
      assertImportedAssetNames([
        { ...createData().assets[0], name: "../image.png" },
      ])
    ).toThrow("Imported asset name is invalid: ../image.png");
  });

  test("rejects duplicated imported asset names", () => {
    expect(() =>
      assertImportedAssetNames([
        createData().assets[0],
        { ...createData().assets[0], id: "asset-2" },
      ])
    ).toThrow("Imported asset name is duplicated: image.png");
  });

  test("rejects duplicated imported asset ids", () => {
    expect(() =>
      assertImportedAssetNames([
        createData().assets[0],
        { ...createData().assets[0], name: "other.png" },
      ])
    ).toThrow("Imported asset id is duplicated: asset-1");
  });

  test("rejects empty imported asset ids", () => {
    expect(() =>
      assertImportedAssetNames([{ ...createData().assets[0], id: "" }])
    ).toThrow("Imported asset id is invalid.");
  });
});
