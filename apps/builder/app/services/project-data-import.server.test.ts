import { describe, expect, test } from "vitest";
import { syncDataVersion, type Data } from "@webstudio-is/http-client";
import { __testing__ } from "./project-data-import.server";

const createData = (overrides: Partial<Data> = {}): Data => ({
  syncDataVersion,
  origin: "https://example.com",
  projectDomain: "example",
  page: {
    id: "home",
    name: "Home",
    path: "",
    title: "Home",
    meta: {},
    rootInstanceId: "root",
  },
  pages: [],
  assets: [
    {
      id: "asset-1",
      projectId: "source-project",
      name: "image.png",
      filename: "Image",
      description: "Hero image",
      size: 100,
      type: "image",
      createdAt: "2024-01-01T00:00:00.000Z",
      format: "png",
      meta: { width: 100, height: 100 },
    },
  ],
  build: {
    id: "build-1",
    projectId: "source-project",
    version: 3,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    pages: {
      meta: {},
      homePageId: "home",
      rootFolderId: "root-folder",
      pages: [
        {
          id: "home",
          name: "Home",
          path: "",
          title: "Home",
          meta: { socialImageAssetId: "asset-1" },
          rootInstanceId: "root",
        },
      ],
      folders: [
        {
          id: "root-folder",
          name: "Root",
          slug: "",
          children: ["home"],
        },
      ],
    },
    breakpoints: [["base", { id: "base", label: "Base" }]],
    styles: [],
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
    dataSources: [],
    resources: [],
  },
  ...overrides,
});

describe("build import helpers", () => {
  test("rejects missing synced data version with sync-again message", () => {
    expect(() =>
      __testing__.assertSyncDataVersion({} as Pick<Data, "syncDataVersion">)
    ).toThrow("Please run webstudio sync again");
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
});
