import { expect, test, vi } from "vitest";
import type { Asset } from "@webstudio-is/sdk";
import { rewriteTransferredMdxAssets } from "./mdx-asset-transfer";

const sourceMdx = {
  id: "article",
  projectId: "source",
  name: "article.mdx",
  type: "file",
  format: "mdx",
  size: 20,
  createdAt: "2026-01-01T00:00:00.000Z",
  description: null,
  meta: {},
} satisfies Asset;
const sourceImage = {
  id: "hero",
  projectId: "source",
  name: "hero.png",
  type: "image",
  format: "png",
  size: 20,
  createdAt: "2026-01-01T00:00:00.000Z",
  description: null,
  meta: { width: 100, height: 100 },
} satisfies Asset;

test("rewrites copied MDX to the imported Asset paths", async () => {
  const readSource = vi.fn(async () => "![Hero](../media/hero.png)");
  const writeSource = vi.fn(async () => {});

  await rewriteTransferredMdxAssets({
    sourceOrigin: "https://source.example.com",
    projectId: "target",
    sourceAssets: [sourceMdx, sourceImage],
    sourceAssetPaths: {
      article: "articles/article.mdx",
      hero: "media/hero.png",
    },
    importedAssets: new Map([
      [sourceMdx.id, { ...sourceMdx, id: "article-copy", projectId: "target" }],
      [
        sourceImage.id,
        {
          ...sourceImage,
          id: "hero-copy",
          projectId: "target",
          filename: "hero_1",
        },
      ],
    ]),
    readSource,
    writeSource,
  });

  expect(writeSource).toHaveBeenCalledWith(
    "article-copy",
    "![Hero](hero_1.png)\n"
  );
});

test("preserves invalid copied MDX for destination diagnostics", async () => {
  const writeSource = vi.fn(async () => {});
  const result = await rewriteTransferredMdxAssets({
    sourceOrigin: "https://source.example.com",
    projectId: "target",
    sourceAssets: [sourceMdx],
    importedAssets: new Map([
      [sourceMdx.id, { ...sourceMdx, id: "article-copy", projectId: "target" }],
    ]),
    readSource: async () => "<broken",
    writeSource,
  });

  expect(result.skippedInvalidAssetIds).toEqual([sourceMdx.id]);
  expect(writeSource).not.toHaveBeenCalled();
});
