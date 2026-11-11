import { expect, test } from "vitest";
import {
  copyDesignToken,
  copyStyleSourceTransfer,
} from "@webstudio-is/project-build/runtime";
import {
  getStyleDeclKey,
  getTagStyleId,
  type Asset,
  type StyleDecl,
} from "@webstudio-is/sdk";
import { prepareMcpStyleSourcePasteData } from "./mcp-style-source-transfer";

const image: Asset = {
  id: "source-image",
  projectId: "source",
  name: "image.png",
  type: "image",
  format: "png",
  meta: { width: 100, height: 100 },
  size: 3,
  description: null,
  createdAt: "2026-01-01",
};
const style: StyleDecl = {
  styleSourceId: "token",
  breakpointId: "base",
  property: "backgroundImage",
  value: { type: "image", value: { type: "asset", value: image.id } },
};
const data = copyDesignToken(
  {
    assets: new Map([[image.id, image]]),
    breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
    styleSources: new Map([
      ["token", { type: "token", id: "token", name: "Card" }],
    ]),
    styleSourceSelections: new Map(),
    styles: new Map([[getStyleDeclKey(style), style]]),
  },
  { tokenId: "token", sourceOrigin: "https://builder.example.com" }
).data;

const tagId = getTagStyleId("button");
const tagStyle = { ...style, styleSourceId: tagId };
const tagData = copyStyleSourceTransfer(
  {
    assets: new Map([[image.id, image]]),
    breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
    styleSources: new Map([[tagId, { type: "tag", id: tagId, tag: "button" }]]),
    styleSourceSelections: new Map(),
    styles: new Map([[getStyleDeclKey(tagStyle), tagStyle]]),
  },
  {
    styleSourceId: tagId,
    sourceType: "tag",
    sourceOrigin: "https://builder.example.com",
  }
).data;

const localId = "local-source";
const localStyle = { ...style, styleSourceId: localId };
const localData = copyStyleSourceTransfer(
  {
    assets: new Map([[image.id, image]]),
    breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
    styleSources: new Map([[localId, { type: "local", id: localId }]]),
    styleSourceSelections: new Map(),
    styles: new Map([[getStyleDeclKey(localStyle), localStyle]]),
  },
  {
    styleSourceId: localId,
    sourceType: "local",
    sourceOrigin: "https://builder.example.com",
  }
).data;

test("MCP paste transfers Local style assets", async () => {
  const prepared = await prepareMcpStyleSourcePasteData({
    data: localData,
    projectOrigin: "https://builder.example.com",
    dryRun: false,
    download: async (url) => ({
      ok: true,
      url: url.href,
      arrayBuffer: async () => new ArrayBuffer(3),
    }),
    upload: async () => [{ ...image, id: "target-image", projectId: "target" }],
    refreshAssets: async () => {},
  });
  expect(prepared).toEqual([
    [
      "https://builder.example.com/cgi/image/image.png?format=raw",
      "target-image",
    ],
  ]);
});

test("MCP paste transfers Tag style assets", async () => {
  const prepared = await prepareMcpStyleSourcePasteData({
    data: tagData,
    projectOrigin: "https://builder.example.com",
    dryRun: false,
    download: async (url) => ({
      ok: true,
      url: url.href,
      arrayBuffer: async () => new ArrayBuffer(3),
    }),
    upload: async () => [{ ...image, id: "target-image", projectId: "target" }],
    refreshAssets: async () => {},
  });
  expect(prepared).toEqual([
    [
      "https://builder.example.com/cgi/image/image.png?format=raw",
      "target-image",
    ],
  ]);
});

test("MCP paste transfers token assets before passing data to the runtime", async () => {
  const steps: string[] = [];
  const prepared = await prepareMcpStyleSourcePasteData({
    data,
    projectOrigin: "https://builder.example.com",
    dryRun: false,
    download: async (url) => {
      steps.push(`download:${url.pathname}`);
      return {
        ok: true,
        url: url.href,
        arrayBuffer: async () => new ArrayBuffer(3),
      };
    },
    upload: async (asset, bytes, detectMetadata) => {
      steps.push(`upload:${asset.name}:${bytes.byteLength}:${detectMetadata}`);
      return [{ ...image, id: "target-image", projectId: "target" }];
    },
    refreshAssets: async () => {
      steps.push("refresh");
    },
  });
  expect(steps).toEqual([
    "download:/cgi/image/image.png",
    "upload:image.png:3:true",
    "refresh",
  ]);
  expect(prepared).toEqual([
    [
      "https://builder.example.com/cgi/image/image.png?format=raw",
      "target-image",
    ],
  ]);
});

test("MCP dry runs do not upload token assets", async () => {
  let requested = false;
  await expect(
    prepareMcpStyleSourcePasteData({
      data,
      projectOrigin: "https://builder.example.com",
      dryRun: true,
      download: async () => {
        requested = true;
        throw new Error("Unexpected download");
      },
      upload: async () => {
        requested = true;
        throw new Error("Unexpected upload");
      },
      refreshAssets: async () => {
        requested = true;
      },
    })
  ).rejects.toThrow();
  expect(requested).toBe(false);
});

test("MCP paste rejects assets from another origin before downloading", async () => {
  let requested = false;
  await expect(
    prepareMcpStyleSourcePasteData({
      data,
      projectOrigin: "https://another-builder.example.com",
      dryRun: false,
      download: async () => {
        requested = true;
        throw new Error("Unexpected download");
      },
      upload: async () => {
        requested = true;
        throw new Error("Unexpected upload");
      },
      refreshAssets: async () => {
        requested = true;
      },
    })
  ).rejects.toThrow();
  expect(requested).toBe(false);
});
