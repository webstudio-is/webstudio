import { createServer } from "node:http";
import { expect, test, vi } from "vitest";
import type { ResourceRequest } from "@webstudio-is/sdk";

import { safeResourceFetch } from "./safe-resource-fetch.server";
import {
  loadResourceRequestList,
  resourceRequestListSchema,
} from "./resource-list-loader.server";
import { getResourceKey } from "~/shared/resource-utils";

// Match the external URL branch in rest.resources-loader.ts, including its
// string-only transport contract and existing public-address validation.
const externalResourceFetch: typeof fetch = (input, init) => {
  if (typeof input !== "string") {
    return Promise.reject(
      new TypeError("Resource loader requires a URL string")
    );
  }
  return safeResourceFetch(input, init);
};

test.each([307, 308])(
  "inspected Resource POST and PUT bodies survive a %i redirect",
  async (redirectStatus) => {
    const originalAllowLocal = process.env.E2E_ALLOW_LOCAL_RESOURCE_URLS;
    process.env.E2E_ALLOW_LOCAL_RESOURCE_URLS = "true";
    const received: Array<{ path: string; method: string; body: string }> = [];
    const server = createServer(async (incoming, outgoing) => {
      const chunks: Buffer[] = [];
      for await (const chunk of incoming) {
        chunks.push(chunk);
      }
      const exchange = {
        path: incoming.url ?? "",
        method: incoming.method ?? "",
        body: Buffer.concat(chunks).toString(),
      };
      received.push(exchange);
      if (incoming.url === "/redirect") {
        outgoing.writeHead(redirectStatus, { location: "/receive" });
        outgoing.end();
      } else {
        outgoing.setHeader("content-type", "application/json");
        outgoing.end(JSON.stringify(exchange));
      }
    });
    try {
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve)
      );
      const address = server.address();
      if (address === null || typeof address === "string") {
        throw new Error("Expected a local test server port");
      }
      for (const method of ["post", "put"] as const) {
        received.length = 0;
        const resourceRequest = {
          name: "Redirect inspection",
          method,
          url: `http://127.0.0.1:${address.port}/redirect`,
          searchParams: [],
          headers: [],
          body: { id: 42 },
        } satisfies ResourceRequest;
        const customFetch = vi.fn(externalResourceFetch);
        const output = await loadResourceRequestList({
          request: new Request(
            "https://p-test.localhost/rest/resources-loader",
            {
              method: "POST",
            }
          ),
          requestList: [resourceRequest],
          sourceOrigin: "https://source.example",
          includeDiagnostics: false,
          inspectResourceKey: getResourceKey(resourceRequest),
          customFetch,
        });
        expect(customFetch).toHaveBeenCalledWith(
          resourceRequest.url,
          expect.objectContaining({ method, body: '{"id":42}' })
        );
        expect(received).toEqual([
          {
            path: "/redirect",
            method: method.toUpperCase(),
            body: '{"id":42}',
          },
          { path: "/receive", method: method.toUpperCase(), body: '{"id":42}' },
        ]);
        expect(output.resources[0]?.[1]).toMatchObject({
          ok: true,
          status: 200,
          data: received[1],
        });
        expect(output.inspection).toMatchObject({
          request: { method: method.toUpperCase(), url: resourceRequest.url },
          response: { status: 200 },
        });
      }
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
      if (originalAllowLocal === undefined) {
        delete process.env.E2E_ALLOW_LOCAL_RESOURCE_URLS;
      } else {
        process.env.E2E_ALLOW_LOCAL_RESOURCE_URLS = originalAllowLocal;
      }
    }
  }
);

test("inspected Resource GET and POST requests preserve their methods and bodies", async () => {
  const originalAllowLocal = process.env.E2E_ALLOW_LOCAL_RESOURCE_URLS;
  process.env.E2E_ALLOW_LOCAL_RESOURCE_URLS = "true";
  const server = createServer(async (incoming, outgoing) => {
    const chunks: Buffer[] = [];
    for await (const chunk of incoming) {
      chunks.push(chunk);
    }
    outgoing.setHeader("content-type", "application/json");
    outgoing.end(
      JSON.stringify({
        method: incoming.method,
        header: incoming.headers["x-resource-test"],
        body: Buffer.concat(chunks).toString(),
      })
    );
  });
  try {
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve)
    );
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected a local test server port");
    }
    const resourceRequest = {
      name: "Local inspection",
      method: "post",
      url: `http://127.0.0.1:${address.port}/receive`,
      searchParams: [],
      headers: [{ name: "x-resource-test", value: "preserved" }],
      body: { id: 42 },
    } satisfies ResourceRequest;
    const key = getResourceKey(resourceRequest);
    const customFetch = vi.fn(externalResourceFetch);
    const output = await loadResourceRequestList({
      request: new Request("https://p-test.localhost/rest/resources-loader", {
        method: "POST",
      }),
      requestList: [resourceRequest],
      sourceOrigin: "https://source.example",
      includeDiagnostics: false,
      inspectResourceKey: key,
      customFetch,
    });
    expect(customFetch).toHaveBeenCalledWith(
      resourceRequest.url,
      expect.objectContaining({
        method: "post",
        headers: expect.any(Headers),
        body: '{"id":42}',
      })
    );
    expect(output.resources[0]?.[1]).toMatchObject({
      ok: true,
      status: 200,
      data: {
        method: "POST",
        header: "preserved",
        body: '{"id":42}',
      },
    });
    expect(output.inspection).toMatchObject({
      request: { method: "POST", url: resourceRequest.url },
      response: { status: 200 },
    });
    const getRequest = {
      name: "Local GET inspection",
      method: "get",
      url: resourceRequest.url,
      searchParams: [],
      headers: [],
    } satisfies ResourceRequest;
    const getFetch = vi.fn(externalResourceFetch);
    const getOutput = await loadResourceRequestList({
      request: new Request("https://p-test.localhost/rest/resources-loader", {
        method: "POST",
      }),
      requestList: [getRequest],
      sourceOrigin: "https://source.example",
      includeDiagnostics: false,
      inspectResourceKey: getResourceKey(getRequest),
      customFetch: getFetch,
    });
    expect(getFetch).toHaveBeenCalledWith(
      getRequest.url,
      expect.objectContaining({ method: "get", headers: expect.any(Headers) })
    );
    expect(getOutput.resources[0]?.[1]).toMatchObject({
      ok: true,
      status: 200,
      data: { method: "GET", body: "" },
    });
    expect(getOutput.inspection).toMatchObject({
      request: { method: "GET", url: getRequest.url },
      response: { status: 200 },
    });
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
    if (originalAllowLocal === undefined) {
      delete process.env.E2E_ALLOW_LOCAL_RESOURCE_URLS;
    } else {
      process.env.E2E_ALLOW_LOCAL_RESOURCE_URLS = originalAllowLocal;
    }
  }
});

test.skipIf(process.env.WEBSTUDIO_LIVE_RESOURCE_GET !== "1")(
  "uses the Resource editor request in the inspected server loader path",
  async () => {
    const url = "https://api.tilmaplatform.com/api/orgs/holyredeemer/en/";
    const resourceRequest = {
      name: "Holy Redeemer",
      method: "get",
      url,
      searchParams: [],
      headers: [],
    } satisfies ResourceRequest;

    const key = getResourceKey(resourceRequest);
    const request = new Request(
      `https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.localhost/rest/resources-loader?inspect=${encodeURIComponent(key)}`,
      { method: "POST", body: JSON.stringify([resourceRequest]) }
    );
    const requestList = resourceRequestListSchema.parse(await request.json());
    const customFetch = vi.fn(externalResourceFetch);
    const output = await loadResourceRequestList({
      request,
      requestList,
      sourceOrigin: "https://source.example",
      includeDiagnostics: false,
      inspectResourceKey: key,
      customFetch,
    });
    expect(customFetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({ method: "get", headers: expect.any(Headers) })
    );
    const result = output.resources[0]?.[1];
    console.info("Inspected Resource editor GET outcome", {
      ok: (result as { ok?: unknown })?.ok,
      status: (result as { status?: unknown })?.status,
      inspectionStatus: output.inspection?.response.status,
    });
    expect(result).toMatchObject({
      ok: true,
      status: 200,
      data: {
        name: expect.any(String),
        slug: expect.any(String),
      },
    });
    expect(output.inspection).toMatchObject({
      request: { method: "GET", url },
      response: { status: 200 },
    });
  },
  20_000
);
