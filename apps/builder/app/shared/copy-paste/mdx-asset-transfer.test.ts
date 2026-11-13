import { expect, test, vi } from "vitest";
import type { Asset } from "@webstudio-is/sdk";
import { rewriteTransferredDocumentAssetReferences } from "./mdx-asset-transfer";

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
const sourceMarkdown = {
  id: "author",
  projectId: "source",
  name: "oleg.md",
  type: "file",
  format: "md",
  size: 20,
  createdAt: "2026-01-01T00:00:00.000Z",
  description: null,
  meta: {},
} satisfies Asset;
const sourceJson = {
  ...sourceMarkdown,
  id: "author-json",
  name: "oleg.json",
  format: "json",
} satisfies Asset;

test("rewrites copied MDX to the imported Asset paths", async () => {
  const readSource = vi.fn(async () => "![Hero](../media/hero.png)");
  const writeSource = vi.fn(async () => {});

  await rewriteTransferredDocumentAssetReferences({
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
    expect.objectContaining({ id: "article-copy" }),
    "![Hero](hero_1.png)\n"
  );
});

test("preserves invalid copied MDX for destination diagnostics", async () => {
  const writeSource = vi.fn(async () => {});
  const result = await rewriteTransferredDocumentAssetReferences({
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

test("rewrites structured document references in copied MDX", async () => {
  const writeSource = vi.fn(async () => {});

  await rewriteTransferredDocumentAssetReferences({
    sourceOrigin: "https://source.example.com",
    projectId: "target",
    sourceAssets: [sourceMdx, sourceMarkdown],
    sourceAssetPaths: {
      article: "posts/article.mdx",
      author: "authors/oleg.md",
    },
    importedAssets: new Map([
      [sourceMdx.id, { ...sourceMdx, id: "article-copy", projectId: "target" }],
      [
        sourceMarkdown.id,
        {
          ...sourceMarkdown,
          id: "author-copy",
          projectId: "target",
          filename: "oleg_1",
        },
      ],
    ]),
    readSource: async () =>
      "---\nauthor:\n  $ref: ../authors/oleg.md#frontmatter\n---\n",
    writeSource,
  });

  expect(writeSource).toHaveBeenCalledWith(
    expect.objectContaining({ id: "article-copy" }),
    "---\nauthor:\n  $ref: oleg_1.md#frontmatter\n---\n\n"
  );
});

test("rewrites references in copied Markdown dependencies", async () => {
  const writeSource = vi.fn(async () => {});

  await rewriteTransferredDocumentAssetReferences({
    sourceOrigin: "https://source.example.com",
    projectId: "target",
    sourceAssets: [sourceMarkdown, sourceImage],
    sourceAssetPaths: {
      author: "authors/oleg.md",
      hero: "media/hero.png",
    },
    importedAssets: new Map([
      [
        sourceMarkdown.id,
        { ...sourceMarkdown, id: "author-copy", projectId: "target" },
      ],
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
    readSource: async () =>
      "---\navatar: ../media/hero.png#profile\n---\n\n<!-- HTML remains valid Markdown -->\n\n![Avatar](../media/hero.png)",
    writeSource,
  });

  expect(writeSource).toHaveBeenCalledWith(
    expect.objectContaining({ id: "author-copy" }),
    "---\navatar: hero_1.png#profile\n---\n\n<!-- HTML remains valid Markdown -->\n\n![Avatar](hero_1.png)"
  );
});

test("rewrites references in copied JSON dependencies", async () => {
  const writeSource = vi.fn(async () => {});

  await rewriteTransferredDocumentAssetReferences({
    sourceOrigin: "https://source.example.com",
    projectId: "target",
    sourceAssets: [sourceJson, sourceImage],
    sourceAssetPaths: {
      "author-json": "authors/oleg.json",
      hero: "media/hero.png",
    },
    importedAssets: new Map([
      [
        sourceJson.id,
        { ...sourceJson, id: "author-copy", projectId: "target" },
      ],
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
    readSource: async () =>
      JSON.stringify({ avatar: "../media/hero.png#profile" }),
    writeSource,
  });

  expect(writeSource).toHaveBeenCalledWith(
    expect.objectContaining({ id: "author-copy" }),
    '{\n  "avatar": "hero_1.png#profile"\n}\n'
  );
});
