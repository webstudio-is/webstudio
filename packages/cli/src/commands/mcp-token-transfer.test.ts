import { expect, test } from "vitest";
import { copyDesignToken } from "@webstudio-is/project-build/runtime";
import { parseTokenTransferData } from "@webstudio-is/project-build/transfer";
import { getStyleDeclKey, type Asset, type StyleDecl } from "@webstudio-is/sdk";
import { prepareMcpTokenPasteData } from "./mcp-token-transfer";

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

test("MCP paste transfers token assets before passing data to the runtime", async () => {
  const steps: string[] = [];
  const prepared = await prepareMcpTokenPasteData({
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
    upload: async (asset, bytes) => {
      steps.push(`upload:${asset.id}:${bytes.byteLength}`);
      return [{ ...image, id: "target-image", projectId: "target" }];
    },
    refreshAssets: async () => {
      steps.push("refresh");
    },
  });
  expect(steps).toEqual([
    "download:/cgi/image/image.png",
    "upload:source-image:3",
    "refresh",
  ]);
  const parsed = parseTokenTransferData(prepared);
  expect(parsed.valid).toBe(true);
  if (parsed.valid === false) {
    return;
  }
  expect(parsed.data.fragment.assets).toEqual([]);
  expect(parsed.data.fragment.styles[0]?.value).toEqual({
    type: "image",
    value: { type: "asset", value: "target-image" },
  });
});

test("MCP dry runs do not upload token assets", async () => {
  let requested = false;
  await expect(
    prepareMcpTokenPasteData({
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
    prepareMcpTokenPasteData({
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
