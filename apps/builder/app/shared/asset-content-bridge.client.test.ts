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
  const requireReload = vi.fn();
  return {
    bridge: createAssetContentBridge({
      origin,
      request,
      authorize,
      requireReload,
    }),
    request,
    authorize,
    requireReload,
  };
};

test("delegates stale revision handling to the bridge owner", () => {
  const { bridge, requireReload } = createBridge();

  bridge.requireReload("The file changed.");

  expect(requireReload).toHaveBeenCalledWith("The file changed.");
});

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

test("routes frontmatter writes to the mounted document owner and cleans up safely", async () => {
  const { bridge, authorize } = createBridge();
  const update = vi.fn(async () => {});
  const registration = {
    rootKey: "root",
    projectId: "project-1",
    assetId: "asset-1",
    update,
  };
  const release = bridge.registerFrontmatterWriter(registration);
  const input = { rootKey: "root", path: ["title"], value: "Updated" };
  await bridge.updateFrontmatter(input);
  expect(update).toHaveBeenCalledWith(input);
  expect(authorize).toHaveBeenLastCalledWith({
    projectId: "project-1",
    assetId: "asset-1",
    operation: "write",
  });

  const replacement = vi.fn(async () => {});
  const releaseReplacement = bridge.registerFrontmatterWriter({
    ...registration,
    update: replacement,
  });
  release();
  await bridge.updateFrontmatter(input);
  expect(replacement).toHaveBeenCalledWith(input);
  releaseReplacement();
  await expect(bridge.updateFrontmatter(input)).rejects.toThrow("not open");
});

test("rejects unauthorized frontmatter writes before calling the document owner", async () => {
  const { bridge } = createBridge({ authorized: false });
  const update = vi.fn(async () => {});
  bridge.registerFrontmatterWriter({
    rootKey: "root",
    projectId: "project-1",
    assetId: "asset-1",
    update,
  });
  await expect(
    bridge.updateFrontmatter({
      rootKey: "root",
      path: ["title"],
      value: "Updated",
    })
  ).rejects.toThrow("not authorized");
  expect(update).not.toHaveBeenCalled();
});
