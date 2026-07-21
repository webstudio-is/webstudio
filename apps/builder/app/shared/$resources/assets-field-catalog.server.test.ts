import { beforeEach, describe, expect, test, vi } from "vitest";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import { loader } from "./assets-field-catalog.server";

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
  documentCount: 2,
  fields: {
    "properties.title": {
      types: ["string" as const],
      occurrences: 2,
    },
  },
};

describe("asset field catalog system resource", () => {
  beforeEach(() => {
    dependencies.createContext.mockResolvedValue({} as never);
    dependencies.loadBuilderAssetFieldCatalog.mockResolvedValue(catalog);
  });

  test("returns the authenticated project's compact field catalog", async () => {
    const response = await loader(
      {
        request: new Request(
          `https://p-${projectId}.localhost/$resources/assets/field-catalog`
        ),
      },
      dependencies
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("private");
    await expect(response.json()).resolves.toEqual(catalog);
    expect(dependencies.loadBuilderAssetFieldCatalog).toHaveBeenCalledWith({
      projectId,
      context: expect.anything(),
      assetClient,
    });
  });

  test("returns a structured forbidden response", async () => {
    dependencies.loadBuilderAssetFieldCatalog.mockRejectedValue(
      new AuthorizationError("denied")
    );

    const response = await loader(
      {
        request: new Request(
          `https://p-${projectId}.localhost/$resources/assets/field-catalog`
        ),
      },
      dependencies
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN", retryable: false },
    });
  });
});
