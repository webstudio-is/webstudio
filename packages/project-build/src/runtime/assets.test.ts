import { describe, expect, test } from "vitest";
import type { StyleValue } from "@webstudio-is/css-engine";
import {
  createDefaultPages,
  type CompactBuild,
} from "@webstudio-is/project-build";
import type {
  Asset,
  Page,
  Pages,
  Prop,
  Props,
  StyleDecl,
  Styles,
} from "@webstudio-is/sdk";
import type { BuilderState } from "../state/builder-state";
import {
  addAsset,
  assetAddInput,
  calculateUsagesByAssetId,
  createAssetDeletePayload,
  createAssetReplacementPayload,
  createAssetUsageList,
  deleteAssets,
  findAsset,
  findAssetUsage,
  getAssetInfoFallback,
  getBrowserAssetFormat,
  imageDescriptionsSetInput,
  listAssets,
  formatAssetName,
  parseAssetName,
  parseAssetType,
  replaceAsset,
  replaceAssetInStyleValueMutable,
  replaceAssetMutable,
  setImageDescriptions,
  updateAsset,
} from "./assets";

const imageAsset = (id: string, name = `${id}.png`): Asset =>
  ({
    id,
    projectId: "project",
    name,
    type: "image",
    size: 1,
    format: "png",
    createdAt: "2026-01-01T00:00:00.000Z",
    description: null,
    meta: { width: 100, height: 100 },
  }) as Asset;

const assetProp: Prop = {
  id: "prop",
  instanceId: "body",
  name: "src",
  type: "asset",
  value: "asset",
};

const pages: Pages = {
  homePageId: "home",
  rootFolderId: "root",
  meta: {},
  pages: new Map([
    [
      "home",
      {
        id: "home",
        name: "Home",
        title: "Home",
        path: "",
        rootInstanceId: "body",
        meta: {},
      },
    ],
  ]),
  folders: new Map([
    [
      "root",
      {
        id: "root",
        name: "Root",
        slug: "",
        children: ["home"],
      },
    ],
  ]),
};

const state = {
  pages,
  projectSettings: { meta: pages.meta ?? {}, compiler: pages.compiler ?? {} },
  assets: new Map([
    ["asset", imageAsset("asset", "asset.png")],
    ["next", imageAsset("next", "next.png")],
    ["unused", imageAsset("unused", "unused.png")],
  ]),
  props: new Map([["prop", assetProp]]),
  styles: new Map(),
  resources: new Map(),
  dataSources: new Map(),
} satisfies BuilderState;

describe("asset name helpers", () => {
  test("parses name with hash and extension", () => {
    expect(parseAssetName("hello_hash.ext")).toEqual({
      basename: "hello",
      hash: "hash",
      ext: "ext",
    });
  });

  test("parses name without hash", () => {
    expect(parseAssetName("hello.ext")).toEqual({
      basename: "hello",
      hash: "",
      ext: "ext",
    });
  });

  test("parses name with multiple underscores", () => {
    expect(parseAssetName("hello_hash1.ext_hash2")).toEqual({
      basename: "hello",
      hash: "hash1",
      ext: "ext_hash2",
    });
  });

  test("parses name with hash but no extension", () => {
    expect(parseAssetName("hello_hash1_hash2")).toEqual({
      basename: "hello_hash1",
      hash: "hash2",
      ext: "",
    });
  });

  test("formats asset with filename", () => {
    expect(
      formatAssetName({
        name: "uploaded_abc123.jpg",
        filename: "myimage",
      })
    ).toBe("myimage.jpg");
  });

  test("formats asset without filename", () => {
    expect(
      formatAssetName({
        name: "uploaded_abc123.jpg",
        filename: undefined,
      })
    ).toBe("uploaded.jpg");
  });

  test("formats asset with no extension", () => {
    expect(
      formatAssetName({
        name: "uploaded_abc123",
        filename: "document",
      })
    ).toBe("document.");
  });
});

describe("asset upload helpers", () => {
  test("preserves browser asset format detection", () => {
    expect(
      getBrowserAssetFormat({
        contentType: "application/font-woff",
        name: "font.woff",
      })
    ).toBeUndefined();
    expect(
      getBrowserAssetFormat({
        contentType: "application/octet-stream",
        name: "video.mp4",
      })
    ).toBe("mp4");
    expect(() =>
      getBrowserAssetFormat({
        contentType: "script/javascript",
        name: "script.unknown",
      })
    ).toThrow('MIME type "script/*" is not allowed');
  });

  test("accepts only stored asset types for API uploads", () => {
    expect(parseAssetType("image")).toBe("image");
    expect(parseAssetType("font")).toBe("font");
    expect(parseAssetType("file")).toBe("file");
    expect(parseAssetType("video")).toBeUndefined();
    expect(parseAssetType(null)).toBeUndefined();
  });

  test("uses image metadata fallback only when complete", () => {
    expect(
      getAssetInfoFallback({
        format: "png",
        searchParams: new URLSearchParams({
          width: "10",
          height: "20",
        }),
      })
    ).toEqual({ width: 10, height: 20, format: "png" });
    expect(
      getAssetInfoFallback({
        format: undefined,
        searchParams: new URLSearchParams({
          width: "10",
          height: "20",
        }),
      })
    ).toBeUndefined();
    expect(
      getAssetInfoFallback({
        format: "png",
        searchParams: new URLSearchParams({
          width: "10",
        }),
      })
    ).toBeUndefined();
  });
});

describe("asset runtime operations", () => {
  test("adds uploaded assets", () => {
    const asset = imageAsset("new-asset", "new.png");
    const { projectId, ...assetInput } = asset;

    expect(addAsset(state, { asset: assetInput }, { projectId })).toEqual({
      kind: "mutation",
      noop: false,
      result: { assetId: "new-asset" },
      invalidatesNamespaces: ["assets"],
      payload: [
        {
          namespace: "assets",
          patches: [{ op: "add", path: ["new-asset"], value: asset }],
        },
      ],
    });
  });

  test("rejects adding duplicate assets", () => {
    const { projectId, ...asset } = imageAsset("asset");
    expect(() => addAsset(state, { asset }, { projectId })).toThrow(
      "Asset already exists"
    );
  });

  test("lists assets with usage counts", () => {
    expect(listAssets(state, { sort: "usage" })).toMatchObject({
      items: [
        { id: "asset", usageCount: 1 },
        { id: "next", usageCount: 0 },
        { id: "unused", usageCount: 0 },
      ],
      nextCursor: null,
    });
  });

  test("expands asset descriptions only in verbose output", () => {
    const asset = imageAsset("described");
    asset.description = `Team collaborating around a whiteboard. ${"Detailed visual context. ".repeat(80)}`;
    const assetState = { ...state, assets: new Map([[asset.id, asset]]) };
    const compact = listAssets(assetState);
    const verbose = listAssets(assetState, { verbose: true });
    expect(compact).toMatchObject({
      detail: "compact",
      items: [{ id: "described" }],
    });
    expect(compact.items[0]).not.toHaveProperty("description");
    expect(verbose).toMatchObject({
      detail: "verbose",
      items: [
        {
          id: "described",
          record: {
            description: expect.stringContaining(
              "Team collaborating around a whiteboard"
            ),
          },
        },
      ],
    });
    expect(JSON.stringify(compact).length).toBeLessThan(
      JSON.stringify(verbose).length * 0.5
    );
  });

  test("lists editable filenames separately from immutable asset names", () => {
    const asset = imageAsset("renamed");
    asset.name = "uploaded_hash.png";
    asset.filename = "campaign-hero.png";

    expect(
      listAssets({ ...state, assets: new Map([[asset.id, asset]]) })
    ).toMatchObject({
      items: [
        {
          id: "renamed",
          name: "uploaded_hash.png",
          filename: "campaign-hero.png",
        },
      ],
    });
  });

  test("paginates assets and rejects invalid cursors", () => {
    expect(listAssets(state, { cursor: "1", limit: 1 })).toMatchObject({
      items: [{ id: "next" }],
      nextCursor: "2",
    });
    expect(() => listAssets(state, { cursor: "nope" })).toThrow(
      "Invalid asset cursor"
    );
  });

  test("finds asset usage", () => {
    expect(findAssetUsage(state, { assetId: "asset" })).toEqual({
      usages: [
        { namespace: "props", instanceId: "body", path: ["prop", "value"] },
      ],
      detail: "compact",
      total: 1,
      returnedCount: 1,
      nextCursor: null,
      filters: { assetId: "asset" },
    });
  });

  test("builds asset replacement mutations", () => {
    expect(
      replaceAsset(state, { fromAssetId: "asset", toAssetId: "next" })
    ).toMatchObject({
      kind: "mutation",
      result: { fromAssetId: "asset", toAssetId: "next" },
      payload: [
        { namespace: "props" },
        { namespace: "assets", patches: [{ op: "remove", path: ["asset"] }] },
      ],
    });
  });

  test("blocks replacing assets referenced by resources or variables", () => {
    expect(() =>
      replaceAsset(
        {
          ...state,
          resources: new Map([
            [
              "resource",
              {
                id: "resource",
                name: "Resource",
                method: "get",
                url: "asset",
                headers: [],
              },
            ],
          ]),
        },
        { fromAssetId: "asset", toAssetId: "next" }
      )
    ).toThrow(
      "Asset is referenced in resources or variables. Update those references before replacing the asset."
    );
  });

  test("blocks deleting referenced assets without force", () => {
    expect(() =>
      deleteAssets(state, { assetIdsOrPrefixes: ["asset"] })
    ).toThrow("Assets are still referenced: asset");
  });

  test("builds asset delete mutations", () => {
    expect(
      deleteAssets(state, { assetIdsOrPrefixes: ["unused"] })
    ).toMatchObject({
      kind: "mutation",
      result: { assetIds: ["unused"] },
      payload: [
        { namespace: "assets", patches: [{ op: "remove", path: ["unused"] }] },
      ],
    });
  });
});
const createPages = ({
  meta = {},
  homeMeta = {},
  pages = new Map(),
}: {
  meta?: Pages["meta"];
  homeMeta?: Page["meta"];
  pages?: Map<Page["id"], Page>;
} = {}): Pages => ({
  meta,
  homePageId: "home",
  rootFolderId: "root",
  pages: new Map([
    [
      "home",
      {
        id: "home",
        name: "Home",
        path: "",
        title: "Home",
        meta: homeMeta,
        rootInstanceId: "root",
      },
    ],
    ...pages,
  ]),
  folders: new Map([
    [
      "root",
      {
        id: "root",
        name: "Root",
        slug: "",
        children: ["home", ...pages.keys()],
      },
    ],
  ]),
});

describe("asset-info", () => {
  describe("calculateUsagesByAssetId", () => {
    test("tracks favicon asset usage", () => {
      const pages = createPages({
        meta: { faviconAssetId: "favicon-asset" },
      });
      const props: Props = new Map();
      const styles: Styles = new Map();
      const assets = new Map<Asset["id"], Asset>();

      const usages = calculateUsagesByAssetId({
        pages,
        projectSettings: {
          meta: { faviconAssetId: "favicon-asset" },
          compiler: {},
        },
        props,
        styles,
        assets,
      });

      expect(usages.get("favicon-asset")).toEqual([{ type: "favicon" }]);
    });

    test("tracks social image asset usage", () => {
      const pages = createPages({
        homeMeta: { socialImageAssetId: "social-asset" },
      });
      const props: Props = new Map();
      const styles: Styles = new Map();
      const assets = new Map<Asset["id"], Asset>();

      const usages = calculateUsagesByAssetId({ pages, props, styles, assets });

      expect(usages.get("social-asset")).toEqual([
        { type: "socialImage", pageId: "home" },
      ]);
    });

    test("tracks marketplace thumbnail asset usage", () => {
      const pages = createPages({
        pages: new Map([
          [
            "page-1",
            {
              id: "page-1",
              name: "Page 1",
              path: "/page-1",
              title: "Page 1",
              meta: {},
              rootInstanceId: "root-1",
              marketplace: { thumbnailAssetId: "thumbnail-asset" },
            },
          ],
        ]),
      });
      const props: Props = new Map();
      const styles: Styles = new Map();
      const assets = new Map<Asset["id"], Asset>();

      const usages = calculateUsagesByAssetId({ pages, props, styles, assets });

      expect(usages.get("thumbnail-asset")).toEqual([
        { type: "marketplaceThumbnail", pageId: "page-1" },
      ]);
    });

    test("tracks prop asset usage", () => {
      const pages = createPages();
      const props: Props = new Map([
        [
          "prop-1",
          {
            id: "prop-1",
            instanceId: "instance-1",
            type: "asset",
            name: "src",
            value: "asset-1",
          },
        ],
      ]);
      const styles: Styles = new Map();
      const assets = new Map<Asset["id"], Asset>();

      const usages = calculateUsagesByAssetId({ pages, props, styles, assets });

      expect(usages.get("asset-1")).toEqual([
        { type: "prop", propId: "prop-1" },
      ]);
    });

    test("ignores width and height props", () => {
      const pages = createPages();
      const props: Props = new Map([
        [
          "prop-width",
          {
            id: "prop-width",
            instanceId: "instance-1",
            type: "asset",
            name: "width",
            value: "asset-1",
          },
        ],
        [
          "prop-height",
          {
            id: "prop-height",
            instanceId: "instance-1",
            type: "asset",
            name: "height",
            value: "asset-1",
          },
        ],
      ]);
      const styles: Styles = new Map();
      const assets = new Map<Asset["id"], Asset>();

      const usages = calculateUsagesByAssetId({ pages, props, styles, assets });

      expect(usages.get("asset-1")).toBeUndefined();
    });

    test("tracks image asset usage in styles", () => {
      const pages = createPages();
      const props: Props = new Map();
      const styles: Styles = new Map([
        [
          "style-1:breakpoint-1:property",
          {
            breakpointId: "breakpoint-1",
            styleSourceId: "style-1",
            property: "backgroundImage",
            value: {
              type: "image",
              value: { type: "asset", value: "asset-1" },
            },
          },
        ],
      ]);
      const assets = new Map<Asset["id"], Asset>();

      const usages = calculateUsagesByAssetId({ pages, props, styles, assets });

      expect(usages.get("asset-1")).toEqual([
        { type: "style", styleDeclKey: "style-1:breakpoint-1:property" },
      ]);
    });

    test("returns empty map when no usages", () => {
      const pages = createPages();
      const props: Props = new Map();
      const styles: Styles = new Map();
      const assets = new Map<Asset["id"], Asset>();

      const usages = calculateUsagesByAssetId({ pages, props, styles, assets });

      expect(usages.size).toBe(0);
    });

    test("aggregates multiple usages for same asset", () => {
      const pages = createPages({
        meta: { faviconAssetId: "asset-1" },
        homeMeta: { socialImageAssetId: "asset-1" },
      });
      const props: Props = new Map([
        [
          "prop-1",
          {
            id: "prop-1",
            instanceId: "instance-1",
            type: "asset",
            name: "src",
            value: "asset-1",
          },
        ],
      ]);
      const styles: Styles = new Map([
        [
          "style-1:breakpoint-1:property",
          {
            breakpointId: "breakpoint-1",
            styleSourceId: "style-1",
            property: "backgroundImage",
            value: {
              type: "image",
              value: { type: "asset", value: "asset-1" },
            },
          },
        ],
      ]);
      const assets = new Map<Asset["id"], Asset>();

      const usages = calculateUsagesByAssetId({
        pages,
        projectSettings: {
          meta: { faviconAssetId: "asset-1" },
          compiler: {},
        },
        props,
        styles,
        assets,
      });

      expect(usages.get("asset-1")).toHaveLength(4);
      expect(usages.get("asset-1")).toEqual([
        { type: "favicon" },
        { type: "socialImage", pageId: "home" },
        { type: "prop", propId: "prop-1" },
        { type: "style", styleDeclKey: "style-1:breakpoint-1:property" },
      ]);
    });

    test("handles undefined pages", () => {
      const pages = undefined;
      const props: Props = new Map();
      const styles: Styles = new Map();
      const assets = new Map<Asset["id"], Asset>();

      const usages = calculateUsagesByAssetId({ pages, props, styles, assets });

      expect(usages.size).toBe(0);
    });

    test("tracks multiple assets in tuple style value", () => {
      const pages = createPages();
      const props: Props = new Map();
      const styles: Styles = new Map([
        [
          "style-1:breakpoint-1:property",
          {
            breakpointId: "breakpoint-1",
            styleSourceId: "style-1",
            property: "backgroundImage",
            value: {
              type: "tuple",
              value: [
                {
                  type: "image",
                  value: { type: "asset", value: "asset-1" },
                },
                {
                  type: "image",
                  value: { type: "asset", value: "asset-2" },
                },
              ],
            },
          },
        ],
      ]);
      const assets = new Map<Asset["id"], Asset>();

      const usages = calculateUsagesByAssetId({ pages, props, styles, assets });

      expect(usages.get("asset-1")).toEqual([
        { type: "style", styleDeclKey: "style-1:breakpoint-1:property" },
      ]);
      expect(usages.get("asset-2")).toEqual([
        { type: "style", styleDeclKey: "style-1:breakpoint-1:property" },
      ]);
    });

    test("tracks font asset usage in fontFamily styles", () => {
      const pages = createPages();
      const props: Props = new Map();
      const styles: Styles = new Map([
        [
          "style-1:breakpoint-1:fontFamily",
          {
            breakpointId: "breakpoint-1",
            styleSourceId: "style-1",
            property: "fontFamily",
            value: {
              type: "fontFamily",
              value: ["CustomFont", "Arial", "sans-serif"],
            },
          },
        ],
      ]);
      const assets = new Map<Asset["id"], Asset>([
        [
          "font-asset-1",
          {
            id: "font-asset-1",
            type: "font",
            name: "CustomFont",
            format: "woff2",
            size: 5000,
            meta: { family: "CustomFont", style: "normal", weight: 400 },
            createdAt: "2024-01-01",
            projectId: "project-id",
          },
        ],
      ]);

      const usages = calculateUsagesByAssetId({ pages, props, styles, assets });

      expect(usages.get("font-asset-1")).toEqual([
        { type: "style", styleDeclKey: "style-1:breakpoint-1:fontFamily" },
      ]);
    });

    test("tracks font asset usage in nested style values", () => {
      const pages = createPages();
      const props: Props = new Map();
      const styles: Styles = new Map([
        [
          "style-1:breakpoint-1:fontFamily",
          {
            breakpointId: "breakpoint-1",
            styleSourceId: "style-1",
            property: "fontFamily",
            value: {
              type: "layers",
              value: [
                {
                  type: "fontFamily",
                  value: ["CustomFont", "sans-serif"],
                },
              ],
            } as unknown as StyleValue,
          },
        ],
      ]);
      const assets = new Map<Asset["id"], Asset>([
        [
          "font-asset-1",
          {
            id: "font-asset-1",
            type: "font",
            name: "CustomFont",
            format: "woff2",
            size: 5000,
            meta: { family: "CustomFont", style: "normal", weight: 400 },
            createdAt: "2024-01-01",
            projectId: "project-id",
          },
        ],
      ]);

      const usages = calculateUsagesByAssetId({ pages, props, styles, assets });

      expect(usages.get("font-asset-1")).toEqual([
        { type: "style", styleDeclKey: "style-1:breakpoint-1:fontFamily" },
      ]);
    });

    test("tracks multiple font assets in same fontFamily style", () => {
      const pages = createPages();
      const props: Props = new Map();
      const styles: Styles = new Map([
        [
          "style-1:breakpoint-1:fontFamily",
          {
            breakpointId: "breakpoint-1",
            styleSourceId: "style-1",
            property: "fontFamily",
            value: {
              type: "fontFamily",
              value: ["CustomFont", "AnotherFont"],
            },
          },
        ],
      ]);
      const assets = new Map<Asset["id"], Asset>([
        [
          "font-asset-1",
          {
            id: "font-asset-1",
            type: "font",
            name: "CustomFont",
            format: "woff2",
            size: 5000,
            meta: { family: "CustomFont", style: "normal", weight: 400 },
            createdAt: "2024-01-01",
            projectId: "project-id",
          },
        ],
        [
          "font-asset-2",
          {
            id: "font-asset-2",
            type: "font",
            name: "AnotherFont",
            format: "woff2",
            size: 6000,
            meta: { family: "AnotherFont", style: "normal", weight: 400 },
            createdAt: "2024-01-01",
            projectId: "project-id",
          },
        ],
      ]);

      const usages = calculateUsagesByAssetId({ pages, props, styles, assets });

      expect(usages.get("font-asset-1")).toEqual([
        { type: "style", styleDeclKey: "style-1:breakpoint-1:fontFamily" },
      ]);
      expect(usages.get("font-asset-2")).toEqual([
        { type: "style", styleDeclKey: "style-1:breakpoint-1:fontFamily" },
      ]);
    });

    test("ignores font families without matching assets", () => {
      const pages = createPages();
      const props: Props = new Map();
      const styles: Styles = new Map([
        [
          "style-1:breakpoint-1:fontFamily",
          {
            breakpointId: "breakpoint-1",
            styleSourceId: "style-1",
            property: "fontFamily",
            value: {
              type: "fontFamily",
              value: ["Arial", "sans-serif"],
            },
          },
        ],
      ]);
      const assets = new Map<Asset["id"], Asset>();

      const usages = calculateUsagesByAssetId({ pages, props, styles, assets });

      expect(usages.size).toBe(0);
    });

    test("tracks same font used in multiple styles", () => {
      const pages = createPages();
      const props: Props = new Map();
      const styles: Styles = new Map([
        [
          "style-1:breakpoint-1:fontFamily",
          {
            breakpointId: "breakpoint-1",
            styleSourceId: "style-1",
            property: "fontFamily",
            value: {
              type: "fontFamily",
              value: ["CustomFont"],
            },
          },
        ],
        [
          "style-2:breakpoint-1:fontFamily",
          {
            breakpointId: "breakpoint-1",
            styleSourceId: "style-2",
            property: "fontFamily",
            value: {
              type: "fontFamily",
              value: ["CustomFont"],
            },
          },
        ],
      ]);
      const assets = new Map<Asset["id"], Asset>([
        [
          "font-asset-1",
          {
            id: "font-asset-1",
            type: "font",
            name: "CustomFont",
            format: "woff2",
            size: 5000,
            meta: { family: "CustomFont", style: "normal", weight: 400 },
            createdAt: "2024-01-01",
            projectId: "project-id",
          },
        ],
      ]);

      const usages = calculateUsagesByAssetId({ pages, props, styles, assets });

      expect(usages.get("font-asset-1")).toEqual([
        { type: "style", styleDeclKey: "style-1:breakpoint-1:fontFamily" },
        { type: "style", styleDeclKey: "style-2:breakpoint-1:fontFamily" },
      ]);
    });
  });
});
const createAsset = (id: string): Asset =>
  ({
    id,
    projectId: "project",
    name: `${id}.png`,
    type: "image",
    size: 1,
    format: "png",
    createdAt: "2024-01-01T00:00:00.000Z",
    description: null,
  }) as Asset;

describe("addAsset", () => {
  const assetInput = {
    id: "asset-1",
    name: "asset-1.png",
    type: "image" as const,
    size: 1,
    format: "png",
    createdAt: "2024-01-01T00:00:00.000Z",
    description: null,
    meta: { width: 100, height: 100 },
  };

  test("uses the configured project instead of caller-owned identity", () => {
    const input = assetAddInput.parse({
      asset: { ...assetInput, projectId: "another-project" },
    });
    const result = addAsset({ assets: new Map() }, input, {
      projectId: "configured-project",
    });

    expect(result.payload).toEqual([
      {
        namespace: "assets",
        patches: [
          {
            op: "add",
            path: ["asset-1"],
            value: { ...assetInput, projectId: "configured-project" },
          },
        ],
      },
    ]);
  });

  test("requires configured project ownership", () => {
    expect(() =>
      addAsset(
        { assets: new Map() },
        { asset: assetInput },
        { projectId: undefined }
      )
    ).toThrow("A configured project is required to add an asset");
  });
});

test("creates asset delete payload", () => {
  expect(createAssetDeletePayload([createAsset("asset-1")])).toEqual([
    {
      namespace: "assets",
      patches: [{ op: "remove", path: ["asset-1"] }],
    },
  ]);
});

describe("updateAsset", () => {
  test("updates filename and description", () => {
    const result = updateAsset(
      {
        assets: new Map([["asset-1", imageAsset("asset-1")]]),
      },
      {
        assetId: "asset-1",
        values: {
          filename: "Hero",
          description: "Product hero",
        },
      }
    );

    expect(result.payload).toEqual([
      {
        namespace: "assets",
        patches: [
          {
            op: "add",
            path: ["asset-1", "filename"],
            value: "Hero",
          },
          {
            op: "replace",
            path: ["asset-1", "description"],
            value: "Product hero",
          },
        ],
      },
    ]);
  });

  test("does not invalidate assets when values are unchanged", () => {
    const asset = {
      ...imageAsset("asset-1"),
      filename: "Hero",
      description: "Product hero",
    };
    const result = updateAsset(
      { assets: new Map([[asset.id, asset]]) },
      {
        assetId: asset.id,
        values: { filename: "Hero", description: "Product hero" },
      }
    );

    expect(result.payload).toEqual([]);
    expect(result.invalidatesNamespaces).toEqual([]);
  });

  test("rejects invalid filename", () => {
    expect(() =>
      updateAsset(
        {
          assets: new Map([["asset-1", imageAsset("asset-1")]]),
        },
        {
          assetId: "asset-1",
          values: { filename: "bad/name" },
        }
      )
    ).toThrow("Invalid filename");
  });

  test("rejects duplicate display filename", () => {
    expect(() =>
      updateAsset(
        {
          assets: new Map([
            ["asset-1", imageAsset("asset-1")],
            ["asset-2", { ...imageAsset("asset-2"), filename: "Hero" }],
          ]),
        },
        {
          assetId: "asset-1",
          values: { filename: "Hero" },
        }
      )
    ).toThrow("Filename already used");
  });
});

describe("setImageDescriptions", () => {
  test("strips the internally injected project id", () => {
    expect(
      imageDescriptionsSetInput.parse({
        projectId: "project",
        updates: [{ assetId: "hero", description: "Dashboard overview" }],
      })
    ).toEqual({
      updates: [{ assetId: "hero", description: "Dashboard overview" }],
    });
  });

  test("stores generated descriptions and explicit decorative markers", () => {
    const result = setImageDescriptions(
      {
        assets: new Map([
          ["hero", imageAsset("hero")],
          ["texture", imageAsset("texture")],
        ]),
      },
      {
        updates: [
          { assetId: "hero", description: "Product dashboard overview" },
          { assetId: "texture", decorative: true },
        ],
      }
    );

    expect(result.result).toEqual({
      updated: [
        { assetId: "hero", decorative: false },
        { assetId: "texture", decorative: true },
      ],
    });
    expect(result.payload).toEqual([
      {
        namespace: "assets",
        patches: [
          {
            op: "replace",
            path: ["hero", "description"],
            value: "Product dashboard overview",
          },
          {
            op: "replace",
            path: ["texture", "description"],
            value: "",
          },
        ],
      },
    ]);
  });

  test("reports and invalidates only descriptions that changed", () => {
    const result = setImageDescriptions(
      {
        assets: new Map([
          [
            "unchanged",
            { ...imageAsset("unchanged"), description: "Already described" },
          ],
          ["changed", imageAsset("changed")],
        ]),
      },
      {
        updates: [
          { assetId: "unchanged", description: "Already described" },
          { assetId: "changed", description: "New description" },
        ],
      }
    );

    expect(result.result).toEqual({
      updated: [{ assetId: "changed", decorative: false }],
    });
    expect(result.payload).toEqual([
      {
        namespace: "assets",
        patches: [
          {
            op: "replace",
            path: ["changed", "description"],
            value: "New description",
          },
        ],
      },
    ]);
    expect(result.invalidatesNamespaces).toEqual(["assets"]);
  });

  test("returns a complete no-op when every description is unchanged", () => {
    const result = setImageDescriptions(
      {
        assets: new Map([
          ["hero", { ...imageAsset("hero"), description: "Hero image" }],
        ]),
      },
      { updates: [{ assetId: "hero", description: "Hero image" }] }
    );

    expect(result.result).toEqual({ updated: [] });
    expect(result.payload).toEqual([]);
    expect(result.invalidatesNamespaces).toEqual([]);
  });

  test("rejects duplicate, empty, missing, and non-image updates", () => {
    expect(() =>
      imageDescriptionsSetInput.parse({
        updates: [
          { assetId: "hero", description: "Hero" },
          { assetId: "hero", decorative: true },
        ],
      })
    ).toThrow();
    expect(() =>
      imageDescriptionsSetInput.parse({
        updates: [{ assetId: "hero", description: "" }],
      })
    ).toThrow();
    expect(() =>
      setImageDescriptions(
        { assets: new Map([["hero", imageAsset("hero")]]) },
        { updates: [{ assetId: "missing", description: "Missing" }] }
      )
    ).toThrow('Image asset "missing" not found');
    expect(() =>
      setImageDescriptions(
        {
          assets: new Map([
            ["font", { ...imageAsset("font"), type: "font" } as Asset],
          ]),
        },
        { updates: [{ assetId: "font", description: "Font" }] }
      )
    ).toThrow('Asset "font" is not an image');
  });
});

test("creates asset usage list from project, pages, props, styles, and resources", () => {
  const asset = createAsset("asset-1");
  const fontAsset: Asset = {
    ...createAsset("font-1"),
    type: "font",
    name: "font.woff2",
    format: "woff2",
    meta: { family: "Inter", style: "normal", weight: 400 },
  };
  const build = {
    projectSettings: {
      meta: { faviconAssetId: asset.id },
      compiler: {},
    },
    pages: {
      homePage: { id: "page-1" },
      pages: new Map([
        [
          "page-1",
          {
            id: "page-1",
            name: "Home",
            path: "/",
            title: "",
            meta: { socialImageAssetId: asset.id },
            rootInstanceId: "root",
          },
        ],
        [
          "page-2",
          {
            id: "page-2",
            name: "Product",
            path: "/product",
            title: "",
            meta: {},
            marketplace: { thumbnailAssetId: asset.id },
            rootInstanceId: "root",
          },
        ],
      ]),
      folders: new Map([["root", { id: "root", name: "", children: [] }]]),
    },
    props: [
      {
        id: "prop-1",
        instanceId: "box",
        name: "src",
        type: "asset",
        value: asset.id,
      },
    ],
    styles: [
      {
        styleSourceId: "local",
        breakpointId: "base",
        property: "backgroundImage",
        value: { type: "image", value: { type: "asset", value: asset.id } },
      },
      {
        styleSourceId: "local",
        breakpointId: "base",
        property: "fontFamily",
        value: { type: "fontFamily", value: ["Inter"] },
      },
    ],
    resources: [
      {
        id: "resource-1",
        name: "Resource",
        method: "get",
        url: asset.id,
        headers: [],
      },
    ],
    dataSources: [
      {
        id: "data-source-1",
        type: "variable",
        name: "Variable",
        value: { type: "string", value: asset.id },
      },
    ],
  } as unknown as CompactBuild;

  expect(
    createAssetUsageList({ asset, assets: [asset, fontAsset], build })
  ).toEqual([
    { namespace: "project", path: ["meta", "faviconAssetId"] },
    {
      namespace: "pages",
      pageId: "page-1",
      path: ["pages", "page-1", "meta", "socialImageAssetId"],
    },
    {
      namespace: "pages",
      pageId: "page-2",
      path: ["pages", "page-2", "marketplace", "thumbnailAssetId"],
    },
    { namespace: "props", instanceId: "box", path: ["prop-1", "value"] },
    { namespace: "styles", path: ["local:base:backgroundImage:", "value"] },
    { namespace: "resources", path: ["resource-1"] },
    { namespace: "dataSources", path: ["data-source-1"] },
  ]);

  expect(
    createAssetUsageList({
      asset: fontAsset,
      assets: [asset, fontAsset],
      build,
    })
  ).toEqual([
    { namespace: "styles", path: ["local:base:fontFamily:", "value"] },
  ]);
});

test("does not count resource or data source metadata as asset usage", () => {
  const asset = createAsset("asset-1");
  const build = {
    pages: createDefaultPages({ rootInstanceId: "root" }),
    props: [],
    styles: [],
    resources: [
      {
        id: asset.id,
        name: asset.id,
        method: "get",
        url: "https://example.com",
        headers: [{ name: asset.id, value: "header-value" }],
      },
    ],
    dataSources: [
      {
        id: asset.id,
        type: "resource",
        name: asset.id,
        resourceId: asset.id,
      },
    ],
  } as unknown as CompactBuild;

  expect(createAssetUsageList({ asset, assets: [asset], build })).toEqual([]);
});

const replaceAssetInStyleValue = (
  value: StyleValue,
  fromAssetId: string,
  toAssetId: string
) => replaceAssetInStyleValueMutable(value, { fromAssetId, toAssetId });

describe("replaceAssetInStyleValue", () => {
  test("finds assets by id", () => {
    expect(
      findAsset(
        [
          { id: "asset-1", type: "image" },
          { id: "asset-2", type: "image" },
        ] as never,
        "asset-2"
      )
    ).toEqual({ id: "asset-2", type: "image" });
    expect(findAsset([], "missing")).toBeUndefined();
  });

  test("replaces asset id in a direct image value", () => {
    const value: StyleValue = {
      type: "image",
      value: { type: "asset", value: "old-id" },
    };
    replaceAssetInStyleValue(value, "old-id", "new-id");
    expect(value).toEqual({
      type: "image",
      value: { type: "asset", value: "new-id" },
    });
  });

  test("does not mutate image value with a different asset id", () => {
    const value: StyleValue = {
      type: "image",
      value: { type: "asset", value: "other-id" },
    };
    replaceAssetInStyleValue(value, "old-id", "new-id");
    expect(value).toEqual({
      type: "image",
      value: { type: "asset", value: "other-id" },
    });
  });

  test("does not mutate image value with url type", () => {
    const value: StyleValue = {
      type: "image",
      value: { type: "url", url: "https://example.com/img.png" },
    };
    replaceAssetInStyleValue(value, "old-id", "new-id");
    expect(value).toEqual({
      type: "image",
      value: { type: "url", url: "https://example.com/img.png" },
    });
  });

  test("replaces asset id inside a tuple value", () => {
    const value: StyleValue = {
      type: "tuple",
      value: [
        { type: "image", value: { type: "asset", value: "old-id" } },
        { type: "image", value: { type: "asset", value: "other-id" } },
      ],
    };
    replaceAssetInStyleValue(value, "old-id", "new-id");
    expect(value).toEqual({
      type: "tuple",
      value: [
        { type: "image", value: { type: "asset", value: "new-id" } },
        { type: "image", value: { type: "asset", value: "other-id" } },
      ],
    });
  });

  test("replaces asset id inside a layers value", () => {
    const value: StyleValue = {
      type: "layers",
      value: [
        { type: "image", value: { type: "asset", value: "old-id" } },
        { type: "image", value: { type: "asset", value: "old-id" } },
      ],
    };
    replaceAssetInStyleValue(value, "old-id", "new-id");
    expect(value).toEqual({
      type: "layers",
      value: [
        { type: "image", value: { type: "asset", value: "new-id" } },
        { type: "image", value: { type: "asset", value: "new-id" } },
      ],
    });
  });

  test("does not mutate non-image value types", () => {
    const value: StyleValue = { type: "keyword", value: "auto" };
    replaceAssetInStyleValue(value, "old-id", "new-id");
    expect(value).toEqual({ type: "keyword", value: "auto" });
  });

  test("replaces font family when provided", () => {
    const value: StyleValue = {
      type: "fontFamily",
      value: ["Inter", "sans-serif"],
    };
    replaceAssetInStyleValueMutable(value, {
      fromAssetId: "old-id",
      toAssetId: "new-id",
      fromFontFamily: "Inter",
      toFontFamily: "Roboto",
    });
    expect(value).toEqual({
      type: "fontFamily",
      value: ["Roboto", "sans-serif"],
    });
  });

  test("replaces asset references in pages props and styles", () => {
    const pages = createDefaultPages({ rootInstanceId: "root" });
    const projectSettings = {
      meta: { faviconAssetId: "old-id" },
      compiler: {},
    };
    const homePage = pages.pages.get(pages.homePageId);
    if (homePage === undefined) {
      throw new Error("Expected home page");
    }
    homePage.meta.socialImageAssetId = "old-id";
    homePage.marketplace = { thumbnailAssetId: "old-id" };
    const prop = {
      id: "prop",
      instanceId: "root",
      name: "src",
      type: "asset" as const,
      value: "old-id",
    };
    const style: StyleDecl = {
      styleSourceId: "local",
      breakpointId: "base",
      property: "backgroundImage",
      value: {
        type: "image" as const,
        value: { type: "asset" as const, value: "old-id" },
      },
    };

    replaceAssetMutable({
      pages,
      projectSettings,
      props: [prop],
      styles: [style],
      replacement: { fromAssetId: "old-id", toAssetId: "new-id" },
    });

    expect(projectSettings.meta.faviconAssetId).toBe("new-id");
    expect(homePage.meta.socialImageAssetId).toBe("new-id");
    expect(homePage.marketplace.thumbnailAssetId).toBe("new-id");
    expect(prop.value).toBe("new-id");
    expect(style.value).toEqual({
      type: "image",
      value: { type: "asset", value: "new-id" },
    });
  });

  test("creates asset replacement payload", () => {
    const pages = createDefaultPages({ rootInstanceId: "root" });
    const projectSettings = {
      meta: { faviconAssetId: "old-id" },
      compiler: {},
    };
    const homePage = pages.pages.get(pages.homePageId);
    if (homePage === undefined) {
      throw new Error("Expected home page");
    }
    homePage.meta.socialImageAssetId = "old-id";

    expect(
      createAssetReplacementPayload({
        build: {
          pages,
          projectSettings,
          props: [
            {
              id: "prop",
              instanceId: "root",
              name: "src",
              type: "asset",
              value: "old-id",
            },
          ],
          styles: [
            {
              styleSourceId: "local",
              breakpointId: "base",
              property: "backgroundImage",
              value: {
                type: "image",
                value: { type: "asset", value: "old-id" },
              },
            },
          ],
        } as never,
        fromAsset: {
          id: "old-id",
          type: "image",
        } as never,
        toAsset: {
          id: "new-id",
          type: "image",
        } as never,
      })
    ).toEqual([
      {
        namespace: "projectSettings",
        patches: [
          {
            op: "replace",
            path: ["meta", "faviconAssetId"],
            value: "new-id",
          },
        ],
      },
      {
        namespace: "pages",
        patches: [
          {
            op: "replace",
            path: ["pages", pages.homePageId, "meta", "socialImageAssetId"],
            value: "new-id",
          },
        ],
      },
      {
        namespace: "props",
        patches: [
          {
            op: "replace",
            path: ["prop"],
            value: {
              id: "prop",
              instanceId: "root",
              name: "src",
              type: "asset",
              value: "new-id",
            },
          },
        ],
      },
      {
        namespace: "styles",
        patches: [
          {
            op: "replace",
            path: ["local:base:backgroundImage:"],
            value: {
              styleSourceId: "local",
              breakpointId: "base",
              property: "backgroundImage",
              value: {
                type: "image",
                value: { type: "asset", value: "new-id" },
              },
            },
          },
        ],
      },
      {
        namespace: "assets",
        patches: [{ op: "remove", path: ["old-id"] }],
      },
    ]);
  });

  test("preserves replaced asset description on the new asset", () => {
    const pages = createDefaultPages({ rootInstanceId: "root" });

    expect(
      createAssetReplacementPayload({
        build: {
          pages,
          projectSettings: { meta: {}, compiler: {} },
          props: [],
          styles: [],
        } as never,
        fromAsset: {
          id: "old-id",
          type: "image",
          description: "Original description",
        } as never,
        toAsset: {
          id: "new-id",
          type: "image",
        } as never,
      })
    ).toEqual([
      {
        namespace: "assets",
        patches: [
          {
            op: "add",
            path: ["new-id", "description"],
            value: "Original description",
          },
          { op: "remove", path: ["old-id"] },
        ],
      },
    ]);
  });

  test("removes new asset description when replaced asset has none", () => {
    const pages = createDefaultPages({ rootInstanceId: "root" });

    expect(
      createAssetReplacementPayload({
        build: {
          pages,
          projectSettings: { meta: {}, compiler: {} },
          props: [],
          styles: [],
        } as never,
        fromAsset: {
          id: "old-id",
          type: "image",
        } as never,
        toAsset: {
          id: "new-id",
          type: "image",
          description: "Uploaded description",
        } as never,
      })
    ).toEqual([
      {
        namespace: "assets",
        patches: [
          { op: "remove", path: ["new-id", "description"] },
          { op: "remove", path: ["old-id"] },
        ],
      },
    ]);
  });
});
