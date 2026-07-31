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

  test("does not load selected roots when projected properties contain no references", async () => {
    const result: AssetQueryResult = {
      items: [{ id: "post", properties: { title: "Hello" } }],
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

  test("reports graph resolution completion and failures without exposing source data", async () => {
    const result: AssetQueryResult = {
      items: [
        {
          id: "post",
          properties: { author: { $ref: "./author.md#frontmatter" } },
        },
      ],
      totalCount: 1,
      hasMore: false,
    };
    const events: unknown[] = [];
    const load = vi.fn(async (node: (typeof graph.nodes)[number]) => ({
      format: node.format as "json" | "markdown",
      revision: node.revision,
      source:
        node.id === "post"
          ? '{"title":"Hello","secret":"must not be observed","author":{"$ref":"./author.md#frontmatter"}}'
          : "---\nname: Ada\n---\nBio\n",
    }));

    await resolveAssetQueryDocumentGraph({
      graph,
      rootIds: ["post"],
      result,
      load,
      concurrency: 2,
      onEvent: (event) => events.push(event),
    });

    expect(events).toEqual([
      { type: "resolution-started", rootCount: 1, documentCount: 2 },
      { type: "resolution-completed", rootCount: 1, documentCount: 2 },
    ]);
    expect(JSON.stringify(events)).not.toContain("secret");

    const failedEvents: unknown[] = [];
    await expect(
      resolveAssetQueryDocumentGraph({
        graph,
        rootIds: ["post"],
        result,
        load: async () => {
          throw new Error("private source failure");
        },
        concurrency: 2,
        onEvent: (event) => failedEvents.push(event),
      })
    ).rejects.toThrow("could not be loaded");
    expect(failedEvents).toEqual([
      { type: "resolution-started", rootCount: 1, documentCount: 2 },
      {
        type: "resolution-failed",
        rootCount: 1,
        documentCount: 2,
        errorCode: "DOCUMENT_LOAD_FAILED",
      },
    ]);
  });
});
