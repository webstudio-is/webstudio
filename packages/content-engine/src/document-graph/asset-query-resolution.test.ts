import { describe, expect, test, vi } from "vitest";
import type { AssetQueryResult } from "../schema";
import { createDocumentGraph } from "./graph";
import { resolveAssetQueryDocumentGraph } from "./asset-query-resolution";

const graph = createDocumentGraph({
  nodes: [
    {
      id: "post",
      revision: "post-r1",
      contentRef: "cdn:post",
      format: "json",
    },
    {
      id: "author",
      revision: "author-r1",
      contentRef: "cdn:author",
      format: "markdown",
    },
  ],
  edges: [
    {
      sourceId: "post",
      referenceId: "#/author",
      reference: {
        documentId: "author",
        revision: "author-r1",
        representation: { type: "markdown-frontmatter" },
      },
    },
  ],
});

describe("Assets query document graph resolution", () => {
  test("assembles selected root properties without exposing unselected fields", async () => {
    const result: AssetQueryResult = {
      items: [
        {
          id: "post",
          properties: {
            title: "Hello",
            author: { $ref: "./author.md#frontmatter" },
          },
        },
      ],
      totalCount: 1,
      hasMore: false,
    };
    const load = vi.fn(async (node: (typeof graph.nodes)[number]) => ({
      format: node.format as "json" | "markdown",
      revision: node.revision,
      source:
        node.id === "post"
          ? '{"title":"Hello","private":"hidden","author":{"$ref":"./author.md#frontmatter"}}'
          : "---\nname: Ada\nrole: Writer\n---\nBio\n",
    }));

    const resolved = await resolveAssetQueryDocumentGraph({
      graph,
      rootIds: ["post"],
      result,
      load,
      concurrency: 2,
    });

    expect(resolved).toEqual({
      ...result,
      items: [
        {
          id: "post",
          properties: {
            title: "Hello",
            author: { name: "Ada", role: "Writer" },
          },
        },
      ],
    });
    expect(load).toHaveBeenCalledTimes(2);
  });

  test("does not load selected roots when query output has no properties", async () => {
    const result: AssetQueryResult = {
      items: [{ id: "post" }],
      totalCount: 1,
      hasMore: false,
    };
    const load = vi.fn();

    await expect(
      resolveAssetQueryDocumentGraph({
        graph,
        rootIds: ["post"],
        result,
        load,
        concurrency: 2,
      })
    ).resolves.toBe(result);
    expect(load).not.toHaveBeenCalled();
  });
});
