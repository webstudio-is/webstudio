import { expect, test, vi } from "vitest";
import { contentEngineLimits } from "@webstudio-is/content-engine/limits";
import { createAssetContentBridge } from "./asset-content-bridge.client";

const origin = "https://builder.example";
const contentUrl = `${origin}/rest/assets/asset-1/content?projectId=project-1`;

const createBridge = ({
  authorized = true,
}: {
  authorized?: boolean;
} = {}) => {
  const request = vi.fn(async () => new Response("ok"));
  const authorize = vi.fn(() => authorized);
  return {
    bridge: createAssetContentBridge({ origin, request, authorize }),
    request,
    authorize,
  };
};

test("forwards only an authorized Asset content request", async () => {
  const { bridge, request, authorize } = createBridge();

  await expect(bridge.request(contentUrl)).resolves.toBeInstanceOf(Response);

  expect(authorize).toHaveBeenCalledWith({
    projectId: "project-1",
    assetId: "asset-1",
    operation: "read",
  });
  expect(request).toHaveBeenCalledTimes(1);
});

test("forwards a bounded authorized write", async () => {
  const { bridge, request, authorize } = createBridge();

  await expect(
    bridge.request(`${contentUrl}&expectedName=article.mdx`, {
      method: "PUT",
      headers: { "content-type": "application/octet-stream" },
      body: new TextEncoder().encode("# Updated"),
    })
  ).resolves.toBeInstanceOf(Response);

  expect(authorize).toHaveBeenCalledWith({
    projectId: "project-1",
    assetId: "asset-1",
    operation: "write",
  });
  expect(request).toHaveBeenCalledTimes(1);
});

const rejectedRequests: ReadonlyArray<{
  name: string;
  url: string;
  init?: RequestInit;
}> = [
  {
    name: "another origin",
    url: "https://attacker.example/rest/assets/asset-1/content?projectId=project-1",
  },
  {
    name: "another route",
    url: `${origin}/rest/assets/asset-1?projectId=project-1`,
  },
  {
    name: "an unsupported method",
    url: contentUrl,
    init: { method: "DELETE" },
  },
  {
    name: "an unknown query",
    url: `${contentUrl}&redirect=https://attacker.example`,
  },
];

test.each(rejectedRequests)("rejects $name", async ({ url, init }) => {
  const { bridge, request } = createBridge();

  await expect(bridge.request(url, init)).rejects.toThrow();
  expect(request).not.toHaveBeenCalled();
});

test("enforces project and Asset authorization inside the request path", async () => {
  const { bridge, request } = createBridge({ authorized: false });

  await expect(bridge.request(contentUrl)).rejects.toThrow("not authorized");
  expect(request).not.toHaveBeenCalled();
});

test("bounds Asset content writes before forwarding them", async () => {
  const { bridge, request } = createBridge();

  await expect(
    bridge.request(`${contentUrl}&expectedName=article.mdx`, {
      method: "PUT",
      headers: { "content-type": "application/octet-stream" },
      body: new Uint8Array(contentEngineLimits.hydratedFileBytes + 1),
    })
  ).rejects.toThrow("exceeds");
  expect(request).not.toHaveBeenCalled();
});
