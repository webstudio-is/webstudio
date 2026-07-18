import { beforeEach, describe, expect, test, vi } from "vitest";
import { loadBuilderAssetFieldCatalog } from "@webstudio-is/asset-uploader/index.server";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import { createContext } from "../context.server";
import { loader } from "./assets-field-catalog.server";

vi.mock("@webstudio-is/asset-uploader/index.server", () => ({
  loadBuilderAssetFieldCatalog: vi.fn(),
}));
vi.mock("../context.server", () => ({
  createContext: vi.fn(),
}));

const projectId = "090e6e14-ae50-4b2e-bd22-71733cec05bb";
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
    vi.mocked(createContext).mockResolvedValue({} as never);
    vi.mocked(loadBuilderAssetFieldCatalog).mockResolvedValue(catalog);
  });

  test("returns the authenticated project's compact field catalog", async () => {
    const response = await loader({
      request: new Request(
        `https://p-${projectId}.localhost/$resources/assets/field-catalog`
      ),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("private");
    await expect(response.json()).resolves.toEqual(catalog);
    expect(loadBuilderAssetFieldCatalog).toHaveBeenCalledWith({
      projectId,
      context: expect.anything(),
    });
  });

  test("returns a structured forbidden response", async () => {
    vi.mocked(loadBuilderAssetFieldCatalog).mockRejectedValue(
      new AuthorizationError("denied")
    );

    const response = await loader({
      request: new Request(
        `https://p-${projectId}.localhost/$resources/assets/field-catalog`
      ),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN", retryable: false },
    });
  });
});
