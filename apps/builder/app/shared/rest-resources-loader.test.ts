import { expect, test, vi } from "vitest";
import type { ResourceRequest } from "@webstudio-is/sdk";
import { loadResource } from "@webstudio-is/sdk/runtime";
import { loadResourceRequestList } from "../services/resource-list-loader.server";
import { getResourceKey } from "./resource-utils";

test("batches Assets while starting and preserving independent remote resources", async () => {
  const events: string[] = [];
  const assets: ResourceRequest[] = ["Tools", "Updates"].map((category) => ({
    name: category,
    method: "post",
    url: "/$resources/assets",
    searchParams: [],
    headers: [{ name: "content-type", value: "application/json" }],
    body: {
      query: {
        where: {
          field: ["properties", "category"],
          operator: "eq",
          value: category,
        },
      },
    },
  }));
  const remotes: ResourceRequest[] = ["First remote", "Second remote"].map(
    (name) => ({
      name,
      method: "get",
      url: "https://api.example/posts",
      searchParams: [],
      headers: [],
    })
  );
  const requests = [assets[0], remotes[0], assets[1], remotes[1]];
  const executeAssetQueries = vi.fn(async ({ resourceRequests }) => {
    events.push("assets");
    return resourceRequests.map((_: Request, index: number) =>
      Response.json({
        data: {
          items: [{ id: `post-${index}`, title: `Post ${index}` }],
          totalCount: 1,
          hasMore: false,
        },
      })
    );
  });
  const customFetch = vi.fn<typeof fetch>(async (_input, init) => {
    events.push("remote");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    return Response.json({ source: "remote" });
  });
  const request = new Request(
    "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.localhost/rest/resources-loader",
    { method: "POST" }
  );

  const output = await loadResourceRequestList(
    {
      request,
      requestList: requests,
      sourceOrigin: "https://source.example",
      includeDiagnostics: false,
      customFetch,
    },
    { executeAssetQueries: executeAssetQueries as never, loadResource }
  );

  expect(events).toEqual(["remote", "remote", "assets"]);
  expect(executeAssetQueries).toHaveBeenCalledOnce();
  expect(executeAssetQueries.mock.calls[0][0].resourceRequests).toHaveLength(2);
  expect(customFetch).toHaveBeenCalledTimes(2);
  expect(output.map(([key]) => key)).toEqual(requests.map(getResourceKey));
  expect(output[0][1]).toMatchObject({
    ok: true,
    data: { "post-0": { title: "Post 0" } },
  });
  expect(output[1][1]).toMatchObject({ ok: true, data: { source: "remote" } });
  expect(output[2][1]).toMatchObject({
    ok: true,
    data: { "post-1": { title: "Post 1" } },
  });
  expect(output[3][1]).toMatchObject({ ok: true, data: { source: "remote" } });
});

test("records non-bindable server duration and response size", async () => {
  const resource: ResourceRequest = {
    name: "Remote",
    method: "get",
    url: "https://api.example/posts",
    searchParams: [],
    headers: [],
  };
  const request = new Request(
    "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.localhost/rest/resources-loader",
    { method: "POST" }
  );
  const result = {
    ok: true,
    status: 200,
    statusText: "OK",
    data: { title: "Post" },
    __performance__: {
      assetQuery: { resolvedDocumentCount: 2 },
    },
  };
  const now = vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(35.5);

  const output = await loadResourceRequestList(
    {
      request,
      requestList: [resource],
      sourceOrigin: "https://source.example",
      includeDiagnostics: false,
      customFetch: vi.fn(),
    },
    {
      executeAssetQueries: vi.fn() as never,
      loadResource: vi.fn().mockResolvedValue(result),
      now,
    }
  );

  expect(output).toEqual([
    [
      getResourceKey(resource),
      {
        ...result,
        __performance__: {
          ...result.__performance__,
          serverDurationMs: 25.5,
          responseBytes: new TextEncoder().encode(
            JSON.stringify({
              ok: result.ok,
              status: result.status,
              statusText: result.statusText,
              data: result.data,
            })
          ).byteLength,
        },
      },
    ],
  ]);
});
