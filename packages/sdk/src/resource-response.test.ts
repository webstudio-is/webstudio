import { createServer } from "node:http";
import { gzipSync } from "node:zlib";
import { afterEach, expect, test, vi } from "vitest";
import { cachedFetch, loadResource, loadResources } from "./resource-loader";
import { createProtectedResourceFetch } from "./protected-resource-fetch";
import { shouldRetryManagedFormDestination } from "./form/server-submission";
import type { ResourceRequest } from "./schema/resources";

const request: ResourceRequest = {
  name: "CMS",
  method: "get",
  url: "https://cms.example/data",
  headers: [],
  searchParams: [],
};
const limit = 1024 * 1024;
const failure = {
  ok: false,
  data: { error: { code: "RESPONSE_TOO_LARGE", retryable: false } },
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

for (const protectedTransport of [false, true]) {
  test.each(["get", "post"] as const)(
    `limits %s response bytes with protected transport ${protectedTransport}`,
    async (method) => {
      let content = "é".repeat(limit / 2);
      const transport = async () => new Response(content);
      const resourceFetch = protectedTransport
        ? createProtectedResourceFetch({
            deniedHostnames: [],
            transport: async () => ({ response: await transport() }),
          })
        : transport;
      expect(
        await loadResource(resourceFetch, { ...request, method })
      ).toMatchObject({ ok: true, data: content });
      content += "a";
      expect(
        await loadResource(resourceFetch, { ...request, method })
      ).toMatchObject(failure);
    }
  );
}

test.each([undefined, "1"])(
  "cancels a streamed overflow with Content-Length %s",
  async (length) => {
    let pulls = 0;
    const cancel = vi.fn();
    const body = new ReadableStream(
      {
        pull(controller) {
          pulls++;
          controller.enqueue(new Uint8Array(pulls === 1 ? limit : 1));
          if (pulls === 3) {
            controller.close();
          }
        },
        cancel,
      },
      { highWaterMark: 0 }
    );
    const result = await loadResource(
      async () =>
        new Response(body, {
          headers: length ? { "content-length": length } : {},
        }),
      request
    );
    expect(result).toMatchObject(failure);
    expect(cancel).toHaveBeenCalledOnce();
    expect(pulls).toBe(2);
  }
);

test("limits decompressed HTTP bytes, not the compressed Content-Length", async () => {
  const compressed = gzipSync("x".repeat(limit + 1));
  const server = createServer((_req, res) => {
    res.writeHead(200, {
      "content-encoding": "gzip",
      "content-length": compressed.length,
    });
    res.end(compressed);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Missing port");
    }
    expect(compressed.length).toBeLessThan(limit);
    expect(
      await loadResource(fetch, {
        ...request,
        url: `http://127.0.0.1:${address.port}`,
      })
    ).toMatchObject(failure);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test.each([false, true])(
  "rejects oversized cached Resources (cache hit: %s)",
  async (hit) => {
    const cache = {
      match: vi.fn(async () =>
        hit ? new Response("x".repeat(limit + 1)) : undefined
      ),
      put: vi.fn(),
    };
    const upstream = vi.fn(async () => new Response("x".repeat(limit + 1)));
    vi.stubGlobal("caches", { open: async () => cache });
    vi.stubGlobal("fetch", upstream);
    expect(
      await loadResource((input, init) => cachedFetch("project", input, init), {
        ...request,
        headers: [{ name: "cache-control", value: "max-age=60" }],
      })
    ).toMatchObject(failure);
    expect(cache.put).not.toHaveBeenCalled();
    expect(upstream).toHaveBeenCalledTimes(hit ? 0 : 1);
  }
);

test("Form roots do not retry an oversized response and dependencies use the same limit", async () => {
  const resourceFetch = vi.fn(async () => new Response("x".repeat(limit + 1)));
  const createRequest = () => ({ ...request, method: "post" as const });
  const dependencyResults: unknown[] = [];
  const result = await loadResources(
    resourceFetch,
    {
      resources: [
        {
          id: "dependency",
          outputName: "Dependency",
          dependencies: [],
          createRequest,
        },
        {
          id: "action",
          outputName: "Action",
          dependencies: ["dependency"],
          createRequest: (documents) => {
            dependencyResults.push(documents.get("dependency"));
            return createRequest();
          },
        },
      ],
      rootIds: ["action"],
    },
    undefined,
    { shouldRetryFailedRoot: shouldRetryManagedFormDestination }
  );
  expect(dependencyResults).toMatchObject([failure]);
  expect(result).toMatchObject({ Action: failure });
  expect(resourceFetch).toHaveBeenCalledTimes(2);
});

test("caches decoded responses with accurate headers and preserves empty responses", async () => {
  let stored: Response | undefined;
  let response = new Response("decoded body", {
    headers: {
      "content-encoding": "gzip",
      "content-length": "30",
      "content-type": "text/plain",
    },
  });
  const cache = {
    match: async () => stored?.clone(),
    put: async (_key: URL, value: Response) => {
      stored = new Response(
        value.body === null ? null : await value.arrayBuffer(),
        value
      );
    },
  };
  const upstream = vi.fn(async () => response);
  vi.stubGlobal("caches", { open: async () => cache });
  vi.stubGlobal("fetch", upstream);
  const resourceFetch: typeof fetch = (input, init) =>
    cachedFetch("project", input, init);
  const cachedRequest = {
    ...request,
    headers: [{ name: "cache-control", value: "max-age=60" }],
  };
  for (let index = 0; index < 2; index++) {
    expect(await loadResource(resourceFetch, cachedRequest)).toMatchObject({
      ok: true,
      data: "decoded body",
    });
  }
  expect(upstream).toHaveBeenCalledOnce();
  expect(stored?.headers.get("content-encoding")).toBeNull();
  expect(stored?.headers.get("content-length")).toBeNull();
  expect(stored?.headers.get("content-type")).toBe("text/plain");
  expect(stored?.headers.get("cache-control")).toBe("max-age=60");
  stored = undefined;
  response = new Response(null, { status: 204 });
  expect(await loadResource(resourceFetch, cachedRequest)).toMatchObject({
    ok: true,
    status: 204,
    data: "",
  });
});

test("classifies a size error by code across bundles, independently of its wording", async () => {
  const result = await loadResource(async () => {
    throw Object.assign(new Error("different wording"), {
      code: "RESPONSE_TOO_LARGE",
    });
  }, request);
  expect(result).toMatchObject(failure);
  // This exact recovery message was approved as the user-facing size-limit contract.
  expect(result.statusText).toBe(
    "Resource response exceeds 1 MiB. Request fewer fields or use pagination."
  );
});

test("protected responses describe the decoded body and release the transport", async () => {
  const release = vi.fn(async () => {});
  const resourceFetch = createProtectedResourceFetch({
    deniedHostnames: [],
    transport: async () => ({
      response: new Response("decoded body", {
        status: 201,
        headers: {
          "content-encoding": "gzip",
          "content-length": "30",
          "content-type": "text/plain",
        },
      }),
      release,
    }),
  });
  const response = await resourceFetch(request.url);
  expect(response.status).toBe(201);
  expect(await response.text()).toBe("decoded body");
  expect(release).toHaveBeenCalledOnce();
  expect(response.headers.get("content-type")).toBe("text/plain");
  expect(response.headers.has("content-encoding")).toBe(false);
  expect(response.headers.has("content-length")).toBe(false);
});

test.each(["overflow", "redirect"])(
  "handles %s without waiting for an unread response clone",
  async (scenario) => {
    const original =
      scenario === "overflow"
        ? new Response("x".repeat(limit + 1))
        : new Response("redirect", {
            status: 302,
            headers: { location: "/next" },
          });
    const clone = original.clone();
    const resourceFetch = createProtectedResourceFetch({
      deniedHostnames: [],
      transport: async ({ url }) => ({
        response: url.pathname === "/next" ? new Response("ok") : clone,
      }),
    });
    const result = loadResource(resourceFetch, request);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // Cancelling one tee branch waits for the other; loading must not.
      expect(
        await Promise.race([
          result,
          new Promise((resolve) => {
            timer = setTimeout(() => resolve("blocked by unread clone"), 1000);
          }),
        ])
      ).toMatchObject(
        scenario === "overflow" ? failure : { ok: true, data: "ok" }
      );
      expect(clone.body?.locked).toBe(false);
    } finally {
      clearTimeout(timer);
      await original.body?.cancel();
      await result;
    }
  }
);
