import { describe, expect, test } from "vitest";
import type { AssetFileDocument } from "./schema";
import { createAssetIndex } from "./asset-index";
import { createCanonicalAssetFileEntry } from "./canonical";
import { createContentRuntimeArtifact } from "./content-runtime-artifact";
import { createPublishedAssetResourceFetch } from "./published-runtime";
import { discoverMarkdownAssetReferenceRanges } from "./markdown-assets";

const postContent = "# Hello\n\n![Hero](../images/hero.png)";

const document: AssetFileDocument = {
  _id: "post-1",
  _type: "asset.file",
  name: "hello.md",
  path: "blog/hello.md",
  key: "hello",
  extension: "md",
  mimeType: "text/markdown",
  size: postContent.length,
  revision: "post-1-revision",
  contentRef: "hello.md",
  properties: {
    title: "Hello",
    slug: "hello",
    publishedAt: "2026-07-18",
    draft: false,
  },
  excerpt: "Excerpt",
};

describe("published Markdown blog end-to-end", () => {
  test("lists metadata and hydrates one detail from the same index", async () => {
    const index = await createAssetIndex({
      projectId: "project-1",
      entries: [
        {
          ...createCanonicalAssetFileEntry({
            projectId: "project-1",
            document,
          }),
          content: postContent,
        },
      ],
      assetReferences: {
        "hello.md": discoverMarkdownAssetReferenceRanges({
          markdown: postContent,
          sourcePath: document.path,
          assetIdsByPath: new Map([["images/hero.png", "hero-image"]]),
        }),
      },
    });
    const runtimeFetch = createPublishedAssetResourceFetch({
      baseUrl: "https://blog.example",
      deploymentId: "blog-deployment",
      artifact: createContentRuntimeArtifact(index),
      runtimeAssets: {
        "post-1": { url: "/assets/hello.md" },
        "hero-image": { url: "/assets/hero.png", width: 1200, height: 630 },
      },
    });
    const request = (query: unknown) =>
      runtimeFetch("/$resources/assets", {
        method: "POST",
        body: JSON.stringify({ query }),
      });

    const listing = await request({
      where: {
        all: [
          {
            field: ["properties", "draft"],
            operator: "ne",
            value: true,
          },
        ],
      },
      sort: [{ field: ["properties", "publishedAt"], direction: "desc" }],
      limit: 20,
      output: { mode: "all", includeMetadata: true },
    });
    expect(await listing?.json()).toMatchObject({
      items: [
        {
          excerpt: "Excerpt",
          properties: { title: "Hello", slug: "hello" },
        },
      ],
    });

    const detail = await request({
      where: {
        all: [
          {
            field: ["properties", "slug"],
            operator: "eq",
            value: "hello",
          },
        ],
      },
      limit: 1,
      output: { mode: "all", includeMetadata: true },
      content: { mode: "markdown-body-ref" },
    });
    expect(await detail?.json()).toMatchObject({
      items: [
        {
          id: "post-1",
          properties: { title: "Hello" },
          content: {
            text: expect.stringContaining("![Hero](/assets/hero.png)"),
          },
        },
      ],
    });
  });
});
