import { createServer } from "node:http";
import { expect, test } from "vitest";
import type { ResourceRequest } from "@webstudio-is/sdk";
import { loadResource } from "@webstudio-is/sdk/runtime";

import { safeResourceFetch } from "./safe-resource-fetch.server";
import {
  loadResourceRequestList,
  resourceRequestListSchema,
} from "./resource-list-loader.server";
import { getResourceKey } from "~/shared/resource-utils";

test("inspected Resource requests preserve POST method, headers, and body", async () => {
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
    const output = await loadResourceRequestList({
      request: new Request("https://p-test.localhost/rest/resources-loader", {
        method: "POST",
      }),
      requestList: [resourceRequest],
      sourceOrigin: "https://source.example",
      includeDiagnostics: false,
      inspectResourceKey: key,
      customFetch: safeResourceFetch,
    });
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
  "loads the Holy Redeemer API through Builder's GET Resource transport",
  async () => {
    const url = "https://api.tilmaplatform.com/api/orgs/holyredeemer/en/";
    const result = await loadResource(
      safeResourceFetch,
      {
        name: "Holy Redeemer",
        method: "get",
        url,
        searchParams: [],
        headers: [],
      },
      undefined,
      { timeoutMs: 15_000 }
    );

    console.info("Live Builder Resource GET outcome", {
      ok: result.ok,
      status: result.status,
      statusText: result.statusText,
      dataType: typeof result.data,
      topLevelKeys:
        result.data !== null && typeof result.data === "object"
          ? Object.keys(result.data).slice(0, 6)
          : undefined,
    });

    expect(result).toMatchObject({
      ok: true,
      status: 200,
      data: {
        name: expect.any(String),
        slug: expect.any(String),
      },
    });
  },
  20_000
);

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
    // Match the external URL branch in rest.resources-loader.ts.
    const customFetch: typeof fetch = (input, init) => {
      if (input instanceof Request) {
        return safeResourceFetch(input, init);
      }
      if (typeof input !== "string") {
        return Promise.reject(
          new TypeError("Resource loader requires a URL string or Request")
        );
      }
      return safeResourceFetch(input, init);
    };
    const output = await loadResourceRequestList({
      request,
      requestList,
      sourceOrigin: "https://source.example",
      includeDiagnostics: false,
      inspectResourceKey: key,
      customFetch,
    });
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
