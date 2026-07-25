import { beforeEach, describe, expect, test, vi } from "vitest";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import { parseAssetQueryCapabilities } from "@webstudio-is/sdk";
import { loader as capabilitiesLoader } from "./assets-query-capabilities.server";
import { loader as openApiLoader } from "./assets-openapi.server";

const projectId = "090e6e14-ae50-4b2e-bd22-71733cec05bb";
const assetClient = { readFile: vi.fn() };
const dependencies = {
  createContext: vi.fn(),
  createAssetClient: vi.fn(() => assetClient),
  loadBuilderAssetFieldCatalog: vi.fn(),
};
const catalog = {
  format: "webstudio-builder-asset-field-catalog" as const,
  version: 1 as const,
  canonicalRevision: `sha256:${"a".repeat(64)}`,
  documentCount: 1,
  fields: {
    slug: {
      queryPath: ["properties", "slug"],
      types: ["string" as const],
      occurrences: 1,
    },
  },
};

const request = (path: string, hostname = `p-${projectId}.localhost`) =>
  new Request(`https://${hostname}${path}`);

describe("asset API descriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.createContext.mockResolvedValue({} as never);
    dependencies.loadBuilderAssetFieldCatalog.mockResolvedValue(catalog);
  });

  test("serves authenticated project-specific query capabilities", async () => {
    const response = await capabilitiesLoader(
      { request: request("/$resources/assets/query-capabilities") },
      dependencies
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("private");
    const capabilities = parseAssetQueryCapabilities(await response.json());
    expect(capabilities.fields).toContainEqual({
      path: ["properties", "slug"],
      label: "properties / slug",
      types: ["string"],
    });
  });

  test("serves project-specific OpenAPI without storage configuration", async () => {
    const response = await openApiLoader(
      { request: request("/$resources/assets/openapi.json") },
      dependencies
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/vnd.oai.openapi+json;version=3.1"
    );
    await expect(response.json()).resolves.toMatchObject({
      openapi: "3.1.1",
      paths: {
        "/rest/assets/query": {
          post: { operationId: "queryAssets" },
        },
      },
    });
    expect(dependencies.loadBuilderAssetFieldCatalog).toHaveBeenCalledWith({
      projectId,
      context: expect.anything(),
      assetClient,
    });
  });

  test("rejects requests outside Builder before loading project data", async () => {
    const response = await capabilitiesLoader(
      {
        request: request(
          "/$resources/assets/query-capabilities",
          "example.com"
        ),
      },
      dependencies
    );

    expect(response.status).toBe(403);
    expect(dependencies.loadBuilderAssetFieldCatalog).not.toHaveBeenCalled();
  });

  test("does not expose descriptions without project authorization", async () => {
    dependencies.loadBuilderAssetFieldCatalog.mockRejectedValue(
      new AuthorizationError("denied")
    );

    const response = await openApiLoader(
      { request: request("/$resources/assets/openapi.json") },
      dependencies
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN", retryable: false },
    });
  });
});
