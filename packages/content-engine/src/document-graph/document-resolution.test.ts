import { describe, expect, test, vi } from "vitest";
import { createDocumentGraph } from "./graph";
import {
  createDocumentResolutionSession,
  resolveAdaptedDocumentGraph,
} from "./document-resolution";

const graph = createDocumentGraph({
  nodes: [
    { id: "post", revision: "post-r1", contentRef: "content:post" },
    { id: "author", revision: "author-r1", contentRef: "content:author" },
    { id: "avatar", revision: "avatar-r1", contentRef: "content:avatar" },
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
    {
      sourceId: "post",
      referenceId: "#/bio",
      reference: {
        documentId: "author",
        revision: "author-r1",
        representation: { type: "markdown-body" },
      },
    },
    {
      sourceId: "author",
      referenceId: "#frontmatter/avatar",
      reference: {
        documentId: "avatar",
        revision: "avatar-r1",
        representation: { type: "json", path: ["url"] },
      },
    },
  ],
});

describe("adapted document graph resolution", () => {
  test("parses once and assembles nested shared cross-format references", async () => {
    const sources = new Map([
      [
        "content:post",
        {
          format: "json" as const,
          revision: "post-r1",
          source:
            '{"title":"Hello","author":{"$ref":"./author.md#frontmatter"},"bio":{"$ref":"./author.md#body"}}',
        },
      ],
      [
        "content:author",
        {
          format: "markdown" as const,
          revision: "author-r1",
          source:
            "---\nname: Ada\navatar:\n  $ref: ./avatar.json#/url\n---\nWrites about the web.\n",
        },
      ],
      [
        "content:avatar",
        {
          format: "json" as const,
          revision: "avatar-r1",
          source: '{"url":"/ada.png"}',
        },
      ],
    ]);
    const loaded: string[] = [];

    const result = await resolveAdaptedDocumentGraph({
      graph,
      rootIds: ["post"],
      concurrency: 3,
      load: async (node) => {
        loaded.push(node.contentRef);
        const source = sources.get(node.contentRef);
        if (source === undefined) {
          throw new Error("missing fixture source");
        }
        return source;
      },
    });

    expect(loaded.sort()).toEqual([...sources.keys()].sort());
    expect(result.roots).toEqual([
      {
        format: "json",
        value: {
          title: "Hello",
          author: { name: "Ada", avatar: "/ada.png" },
          bio: "Writes about the web.\n",
        },
      },
    ]);
    expect(result.values.get("author")).toMatchObject({
      format: "markdown",
      value: { frontmatter: { name: "Ada", avatar: "/ada.png" } },
    });
  });

  test("applies the byte limit while loading document sources", async () => {
    await expect(
      resolveAdaptedDocumentGraph({
        graph: createDocumentGraph({
          nodes: [
            { id: "post", revision: "post-r1", contentRef: "content:post" },
          ],
          edges: [],
        }),
        rootIds: ["post"],
        concurrency: 1,
        maximumBytes: 4,
        load: async () => ({
          format: "json",
          revision: "post-r1",
          source: '{"title":"Hello"}',
        }),
      })
    ).rejects.toMatchObject({
      code: "DOCUMENT_LOAD_FAILED",
      documentId: "post",
      cause: expect.objectContaining({ code: "CONTENT_LIMIT_EXCEEDED" }),
    });
  });

  test("rejects a loaded revision before parsing stale document bytes", async () => {
    await expect(
      resolveAdaptedDocumentGraph({
        graph: createDocumentGraph({
          nodes: [
            { id: "post", revision: "post-r1", contentRef: "content:post" },
          ],
          edges: [],
        }),
        rootIds: ["post"],
        concurrency: 1,
        load: async () => ({
          format: "json",
          revision: "stale-r1",
          source: "not valid JSON",
        }),
      })
    ).rejects.toMatchObject({
      code: "DOCUMENT_LOAD_FAILED",
      documentId: "post",
      cause: expect.objectContaining({
        code: "REVISION_MISMATCH",
        expectedRevision: "post-r1",
        actualRevision: "stale-r1",
      }),
    });
  });

  test("limits the reachable document count before loading", async () => {
    const load = async () => ({
      format: "json" as const,
      revision: "unused",
      source: "{}",
    });

    await expect(
      resolveAdaptedDocumentGraph({
        graph,
        rootIds: ["post"],
        concurrency: 3,
        maximumDocuments: 2,
        load,
      })
    ).rejects.toMatchObject({
      code: "DOCUMENT_COUNT_EXCEEDED",
      documentCount: 3,
      documentLimit: 2,
    });
  });

  test("limits aggregate source bytes before parsing", async () => {
    await expect(
      resolveAdaptedDocumentGraph({
        graph: createDocumentGraph({
          nodes: [
            { id: "post", revision: "post-r1", contentRef: "content:post" },
          ],
          edges: [],
        }),
        rootIds: ["post"],
        concurrency: 1,
        maximumBytes: 10,
        maximumTotalBytes: 2,
        load: async () => ({
          format: "json",
          revision: "post-r1",
          source: "{}\n",
        }),
      })
    ).rejects.toMatchObject({
      code: "DOCUMENT_LOAD_FAILED",
      documentId: "post",
      cause: expect.objectContaining({
        code: "TOTAL_BYTES_EXCEEDED",
        totalBytes: 3,
        totalByteLimit: 2,
      }),
    });
  });

  test("shares immutable document work while enforcing each resolution budget", async () => {
    const singleDocumentGraph = createDocumentGraph({
      nodes: [{ id: "post", revision: "post-r1", contentRef: "content:post" }],
      edges: [],
    });
    const load = vi.fn(async () => ({
      format: "json" as const,
      revision: "post-r1",
      source: "{}\n",
    }));
    const session = createDocumentResolutionSession({ load, concurrency: 1 });
    const parse = vi.spyOn(JSON, "parse");

    try {
      await expect(
        session.resolve({
          graph: singleDocumentGraph,
          rootIds: ["post"],
          maximumTotalBytes: 3,
        })
      ).resolves.toMatchObject({ roots: [{ format: "json", value: {} }] });
      await expect(
        session.resolve({
          graph: singleDocumentGraph,
          rootIds: ["post"],
          maximumTotalBytes: 3,
        })
      ).resolves.toMatchObject({ roots: [{ format: "json", value: {} }] });
      await expect(
        session.resolve({
          graph: singleDocumentGraph,
          rootIds: ["post"],
          maximumTotalBytes: 2,
        })
      ).rejects.toMatchObject({
        code: "DOCUMENT_LOAD_FAILED",
        cause: expect.objectContaining({
          code: "TOTAL_BYTES_EXCEEDED",
          totalBytes: 3,
          totalByteLimit: 2,
        }),
      });

      expect(
        parse.mock.calls.filter(([source]) => source === "{}\n")
      ).toHaveLength(1);
    } finally {
      parse.mockRestore();
    }

    expect(load).toHaveBeenCalledOnce();
  });

  test("checks each resolution budget before parsing shared bytes", async () => {
    const singleDocumentGraph = createDocumentGraph({
      nodes: [{ id: "post", revision: "post-r1", contentRef: "content:post" }],
      edges: [],
    });
    const load = vi.fn(async () => ({
      format: "json" as const,
      revision: "post-r1",
      source: "not json",
    }));
    const session = createDocumentResolutionSession({ load, concurrency: 1 });

    await expect(
      session.resolve({
        graph: singleDocumentGraph,
        rootIds: ["post"],
        maximumTotalBytes: 2,
      })
    ).rejects.toMatchObject({
      code: "DOCUMENT_LOAD_FAILED",
      cause: expect.objectContaining({
        code: "TOTAL_BYTES_EXCEEDED",
        totalByteLimit: 2,
      }),
    });
    expect(load).toHaveBeenCalledOnce();
  });

  test("reports the session byte limit for an oversized shared source", async () => {
    const singleDocumentGraph = createDocumentGraph({
      nodes: [{ id: "post", revision: "post-r1", contentRef: "content:post" }],
      edges: [],
    });
    const session = createDocumentResolutionSession({
      load: async () => ({
        format: "json",
        revision: "post-r1",
        source: "123456",
      }),
      concurrency: 1,
      maximumDocumentBytes: 4,
    });

    await expect(
      session.resolve({
        graph: singleDocumentGraph,
        rootIds: ["post"],
      })
    ).rejects.toMatchObject({
      code: "DOCUMENT_LOAD_FAILED",
      cause: expect.objectContaining({
        code: "CONTENT_LIMIT_EXCEEDED",
        contentByteLimit: 4,
      }),
    });
  });

  test("bounds source materialization across concurrent resolutions", async () => {
    const independentGraph = createDocumentGraph({
      nodes: ["a", "b", "c", "d"].map((id) => ({
        id,
        revision: `${id}-r1`,
        contentRef: `content:${id}`,
      })),
      edges: [],
    });
    let activeLoads = 0;
    let maximumActiveLoads = 0;
    const load = vi.fn(
      async (node: (typeof independentGraph.nodes)[number]) => {
        activeLoads += 1;
        maximumActiveLoads = Math.max(maximumActiveLoads, activeLoads);
        await Promise.resolve();
        activeLoads -= 1;
        return {
          format: "json" as const,
          revision: node.revision,
          source: "{}",
        };
      }
    );
    const session = createDocumentResolutionSession({ load, concurrency: 2 });

    await Promise.all([
      session.resolve({ graph: independentGraph, rootIds: ["a", "b"] }),
      session.resolve({ graph: independentGraph, rootIds: ["c", "d"] }),
    ]);

    expect(maximumActiveLoads).toBe(2);
  });

  test("keeps total-byte failures stable when one source is cached", async () => {
    const independentGraph = createDocumentGraph({
      nodes: ["a", "b"].map((id) => ({
        id,
        revision: `${id}-r1`,
        contentRef: `content:${id}`,
      })),
      edges: [],
    });
    const warmSession = createDocumentResolutionSession({
      load: async (node) => ({
        format: "json",
        revision: node.revision,
        source: "{}",
      }),
      concurrency: 2,
    });
    await warmSession.resolve({ graph: independentGraph, rootIds: ["a"] });

    const cachedFailure = warmSession.resolve({
      graph: independentGraph,
      rootIds: ["a", "b"],
      maximumTotalBytes: 3,
    });
    const cachedExpectation = expect(cachedFailure).rejects.toMatchObject({
      cause: expect.objectContaining({ documentId: "b" }),
    });

    let releaseA = () => {};
    const waitForA = new Promise<void>((resolve) => {
      releaseA = resolve;
    });
    const load = vi.fn(
      async (node: (typeof independentGraph.nodes)[number]) => {
        if (node.id === "a") {
          await waitForA;
        }
        return {
          format: "json" as const,
          revision: node.revision,
          source: "{}",
        };
      }
    );
    const freshSession = createDocumentResolutionSession({
      load,
      concurrency: 2,
    });
    const freshFailure = freshSession.resolve({
      graph: independentGraph,
      rootIds: ["a", "b"],
      maximumTotalBytes: 3,
    });
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    releaseA();

    await cachedExpectation;
    await expect(freshFailure).rejects.toMatchObject({
      cause: expect.objectContaining({ documentId: "b" }),
    });
  });

  test("settles active, shared, and queued resolutions when cancelled", async () => {
    const independentGraph = createDocumentGraph({
      nodes: ["a", "b"].map((id) => ({
        id,
        revision: `${id}-r1`,
        contentRef: `content:${id}`,
      })),
      edges: [],
    });
    const controller = new AbortController();
    let releaseFirstLoad = () => {};
    const firstLoad = new Promise<void>((resolve) => {
      releaseFirstLoad = resolve;
    });
    const load = vi.fn(
      async (node: (typeof independentGraph.nodes)[number]) => {
        if (node.id === "a") {
          await firstLoad;
        }
        return {
          format: "json" as const,
          revision: node.revision,
          source: "{}",
        };
      }
    );
    const session = createDocumentResolutionSession({
      load,
      concurrency: 1,
      signal: controller.signal,
    });
    const first = session.resolve({
      graph: independentGraph,
      rootIds: ["a"],
    });
    await vi.waitFor(() => expect(load).toHaveBeenCalledOnce());
    const pending = [
      first,
      session.resolve({ graph: independentGraph, rootIds: ["a"] }),
      session.resolve({ graph: independentGraph, rootIds: ["b"] }),
    ];
    const results: Array<PromiseSettledResult<unknown> | undefined> =
      Array.from({ length: pending.length });
    const tracked = pending.map((promise, index) =>
      promise.then(
        (value) => {
          results[index] = { status: "fulfilled", value };
        },
        (reason) => {
          results[index] = { status: "rejected", reason };
        }
      )
    );

    controller.abort("test cancellation");
    try {
      await vi.waitFor(() =>
        expect(results).toMatchObject(
          Array.from({ length: pending.length }, () => ({
            status: "rejected",
            reason: { code: "REQUEST_CANCELLED" },
          }))
        )
      );
    } finally {
      releaseFirstLoad();
    }
    await Promise.all(tracked);
    expect(load).toHaveBeenCalledOnce();
  });
});
