import { expect, test, vi } from "vitest";
import type { Asset, WebstudioFragment } from "@webstudio-is/sdk";
import { transferFragmentAssets } from "./asset-transfer-utils";

const imageAsset = {
  id: "source-image",
  projectId: "source-project",
  name: "hero.png",
  type: "image",
  size: 128,
  format: "png",
  createdAt: "2026-01-01T00:00:00.000Z",
  description: null,
  meta: { width: 1200, height: 800 },
} satisfies Asset;

const fontAsset = {
  id: "source-font",
  projectId: "source-project",
  name: "heading.woff2",
  type: "font",
  size: 64,
  format: "woff2",
  createdAt: "2026-01-01T00:00:00.000Z",
  description: null,
  meta: { family: "Source heading", style: "normal", weight: 600 },
} satisfies Asset;

const fragment = {
  children: [{ type: "id", value: "image" }],
  instances: [
    { type: "instance", id: "image", component: "Image", children: [] },
  ],
  assets: [imageAsset, fontAsset],
  dataSources: [],
  resources: [],
  props: [
    {
      id: "image-src",
      instanceId: "image",
      name: "src",
      type: "asset",
      value: imageAsset.id,
    },
  ],
  breakpoints: [],
  styleSourceSelections: [],
  styleSources: [],
  styles: [
    {
      styleSourceId: "local",
      breakpointId: "base",
      property: "backgroundImage",
      value: {
        type: "layers",
        value: [
          {
            type: "image",
            value: { type: "asset", value: imageAsset.id },
          },
        ],
      },
    },
    {
      styleSourceId: "local",
      breakpointId: "base",
      property: "fontFamily",
      value: {
        type: "fontFamily",
        value: [fontAsset.meta.family, "sans-serif"],
      },
    },
  ],
} satisfies WebstudioFragment;

test("imports and remaps every fragment asset reference", async () => {
  const importedImage = {
    ...imageAsset,
    id: "imported-image",
    projectId: "target-project",
  } satisfies Asset;
  const importedFont = {
    ...fontAsset,
    id: "imported-font",
    projectId: "target-project",
    meta: { ...fontAsset.meta, family: "Imported heading" },
  } satisfies Asset;
  const importAssets = vi.fn(
    async () =>
      new Map<Asset["id"], Asset>([
        [imageAsset.id, importedImage],
        [fontAsset.id, importedFont],
      ])
  );

  const result = await transferFragmentAssets({
    sourceOrigin: "https://source.example.com",
    projectId: "target-project",
    fragments: [fragment],
    importAssets,
  });

  expect(importAssets).toHaveBeenCalledWith("target-project", [
    {
      asset: imageAsset,
      url: "https://source.example.com/cgi/image/hero.png?format=raw",
    },
    {
      asset: fontAsset,
      url: "https://source.example.com/cgi/asset/heading.woff2?format=raw",
    },
  ]);
  expect(result.success).toBe(true);
  if (result.success === false) {
    return;
  }
  expect(result.assets).toEqual(
    new Map<Asset["id"], Asset>([
      [imageAsset.id, importedImage],
      [fontAsset.id, importedFont],
    ])
  );
  expect(result.fragments.get(fragment)).toEqual({
    ...fragment,
    assets: [],
    props: [expect.objectContaining({ value: importedImage.id })],
    styles: [
      expect.objectContaining({
        value: {
          type: "layers",
          value: [
            {
              type: "image",
              value: { type: "asset", value: importedImage.id },
            },
          ],
        },
      }),
      expect.objectContaining({
        value: {
          type: "fontFamily",
          value: [importedFont.meta.family, "sans-serif"],
        },
      }),
    ],
  });
});
