import { expect, test } from "vitest";
import type { Asset } from "@webstudio-is/sdk";
import type { CompactBuild } from "@webstudio-is/project-build";
import {
  createAssetDeletePayload,
  createAssetUsageList,
} from "./asset-style-value";

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

test("creates asset delete payload", () => {
  expect(createAssetDeletePayload([createAsset("asset-1")])).toEqual([
    {
      namespace: "assets",
      patches: [{ op: "remove", path: ["asset-1"] }],
    },
  ]);
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
    pages: {
      meta: { faviconAssetId: asset.id },
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
    resources: [{ id: "resource-1", name: "Resource", value: asset.id }],
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
