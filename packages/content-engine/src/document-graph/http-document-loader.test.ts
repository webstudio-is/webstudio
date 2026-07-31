import { describe, expect, test, vi } from "vitest";
import { parseDocumentSource } from "./document-adapter";
import { createHttpDocumentSourceLoader } from "./http-document-loader";

const node = {
  id: "post",
  revision: "post-r1",
  contentRef: "content:post",
};

describe("HTTP document loader", () => {
  test("streams a successful response through injected request and metadata mappings", async () => {
    const request = new Request("https://cdn.webstudio.test/post.json");
    const fetch = vi.fn(async () =>
      Promise.resolve(
        new Response('{"title":"Hello"}', {
          headers: { "x-content-revision": "post-r1" },
        })
      )
    );
    const load = createHttpDocumentSourceLoader({
      fetch,
      getRequest: () => request,
      getMetadata: ({ response }) => ({
        format: "json",
        revision: response.headers.get("x-content-revision"),
      }),
    });

    const loaded = await load(node, {});
    expect(fetch).toHaveBeenCalledWith(request, { signal: undefined });
    expect(loaded).toMatchObject({ format: "json", revision: "post-r1" });
    await expect(parseDocumentSource(loaded)).resolves.toEqual({
      format: "json",
      value: { title: "Hello" },
    });
  });

  test("reports non-success responses without consuming their body", async () => {
    let bodyRead = false;
    const response = {
      ok: false,
      status: 503,
      get body() {
        bodyRead = true;
        return new Response("private details").body;
      },
    } as Response;
    const load = createHttpDocumentSourceLoader({
      fetch: async () => response,
      getRequest: () => "https://cdn.webstudio.test/post.json",
      getMetadata: () => ({ format: "json", revision: "post-r1" }),
    });

    await expect(load(node, {})).rejects.toMatchObject({
      code: "HTTP_STATUS",
      documentId: "post",
      status: 503,
    });
    expect(bodyRead).toBe(false);
  });

  test("wraps invalid response metadata and forwards cancellation", async () => {
    const controller = new AbortController();
    const fetch = vi.fn(async () => new Response("{}"));
    const load = createHttpDocumentSourceLoader({
      fetch,
      getRequest: () => "https://cdn.webstudio.test/post.json",
      getMetadata: () => ({ format: "json", revision: undefined }),
    });

    await expect(
      load(node, { signal: controller.signal })
    ).rejects.toMatchObject({
      code: "INVALID_METADATA",
      documentId: "post",
    });
    expect(fetch).toHaveBeenCalledWith("https://cdn.webstudio.test/post.json", {
      signal: controller.signal,
    });
  });

  test("reports document fetch completion and sanitized failures", async () => {
    const events: unknown[] = [];
    const load = createHttpDocumentSourceLoader({
      fetch: async () => new Response("{}"),
      getRequest: () =>
        "https://cdn.webstudio.test/private-path.json?token=secret",
      getMetadata: () => ({ format: "json", revision: "post-r1" }),
      onEvent: (event) => events.push(event),
    });

    await load(node, {});
    expect(events).toEqual([
      {
        type: "document-fetch-started",
        documentId: "post",
        revision: "post-r1",
      },
      {
        type: "document-fetch-completed",
        documentId: "post",
        revision: "post-r1",
      },
    ]);

    const failedEvents: unknown[] = [];
    const failedLoad = createHttpDocumentSourceLoader({
      fetch: async () => {
        throw new Error("https://private.example/?token=secret");
      },
      getRequest: () => "https://cdn.webstudio.test/private.json",
      getMetadata: () => ({ format: "json", revision: "post-r1" }),
      onEvent: (event) => failedEvents.push(event),
    });
    await expect(failedLoad(node, {})).rejects.toMatchObject({
      code: "REQUEST_FAILED",
    });
    expect(failedEvents).toEqual([
      {
        type: "document-fetch-started",
        documentId: "post",
        revision: "post-r1",
      },
      {
        type: "document-fetch-failed",
        documentId: "post",
        revision: "post-r1",
        errorCode: "REQUEST_FAILED",
      },
    ]);
    expect(JSON.stringify(failedEvents)).not.toContain("secret");
  });
});
