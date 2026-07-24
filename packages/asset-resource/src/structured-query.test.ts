import { describe, expect, test } from "vitest";
import type { AssetFileDocument } from "@webstudio-is/sdk";
import { executeAssetQuery } from "./structured-query";

const document = ({
  id,
  properties,
  excerpt,
}: {
  id: string;
  properties: AssetFileDocument["properties"];
  excerpt?: string;
}): AssetFileDocument => ({
  _id: id,
  _type: "asset.file",
  name: `${id}.md`,
  path: `blog/${id}.md`,
  key: `key-${id}`,
  extension: "md",
  mimeType: "text/markdown",
  size: 20,
  revision: `revision-${id}`,
  contentRef: `files/${id}.md`,
  properties,
  excerpt,
});

const documents = [
  document({
    id: "alpha",
    excerpt: "Alpha excerpt",
    properties: {
      title: "Alpha",
      publishedAt: "2025-01-01",
      draft: false,
      tags: ["news", "alpha"],
    },
  }),
  document({
    id: "beta",
    properties: {
      title: "Beta",
      publishedAt: "2024-01-01",
      draft: true,
      tags: ["private"],
    },
  }),
  document({
    id: "gamma",
    properties: {
      title: "Gamma",
      publishedAt: "2026-01-01",
      tags: ["news"],
    },
  }),
];

describe("structured asset query", () => {
  test("filters dynamic fields, sorts, paginates, and returns public records", async () => {
    const result = await executeAssetQuery({
      documents,
      query: {
        filters: [
          {
            field: ["properties", "draft"],
            operator: "ne",
            value: true,
          },
          {
            field: ["properties", "tags"],
            operator: "contains",
            value: "news",
          },
        ],
        sort: [
          {
            field: ["properties", "publishedAt"],
            direction: "desc",
          },
        ],
        limit: 1,
        offset: 0,
        content: { mode: "none" },
      },
    });

    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: "gamma",
          path: "blog/gamma.md",
          properties: expect.objectContaining({ title: "Gamma" }),
        }),
      ],
      totalCount: 2,
      hasMore: true,
    });
    expect(result.items[0]).not.toHaveProperty("contentRef");
    expect(result.items[0]).not.toHaveProperty("_id");
  });

  test("hydrates only selected Markdown content without exposing storage identity", async () => {
    const bytes = new TextEncoder().encode(
      "---\ntitle: Alpha\n---\n# Alpha body\n"
    );
    const result = await executeAssetQuery({
      documents: [{ ...documents[0], size: bytes.byteLength }],
      query: {
        filters: [{ field: ["id"], operator: "eq", value: "alpha" }],
        sort: [],
        limit: 1,
        offset: 0,
        content: { mode: "markdown-body" },
      },
      read: async () => ({
        data: {
          async *[Symbol.asyncIterator]() {
            yield bytes;
          },
        },
        contentLength: bytes.byteLength,
      }),
    });

    expect(result.items[0].content).toEqual({
      encoding: "utf-8",
      text: "# Alpha body\n",
    });
    expect(result.items[0].content).not.toHaveProperty("contentRef");
  });

  test("supports lexical date ranges and missing-field checks", async () => {
    const result = await executeAssetQuery({
      documents,
      query: {
        filters: [
          {
            field: ["properties", "publishedAt"],
            operator: "gte",
            value: "2025-01-01",
          },
          {
            field: ["properties", "draft"],
            operator: "exists",
            value: false,
          },
        ],
        sort: [],
        limit: 100,
        offset: 0,
        content: { mode: "none" },
      },
    });

    expect(result.items.map(({ id }) => id)).toEqual(["gamma"]);
  });
});
