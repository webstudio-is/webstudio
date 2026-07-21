import { beforeEach, describe, expect, test, vi } from "vitest";
import { loader } from "./assets.server";

const projectId = "090e6e14-ae50-4b2e-bd22-71733cec05bb";
const dependencies = {
  createContext: vi.fn(),
  loadAssetsByProject: vi.fn(),
};

describe("legacy Assets system resource", () => {
  beforeEach(() => {
    dependencies.createContext.mockResolvedValue({} as never);
    dependencies.loadAssetsByProject.mockResolvedValue([
      {
        id: "asset-1",
        projectId,
        name: "document.pdf",
        type: "file",
        format: "pdf",
        size: 4096,
        description: undefined,
        createdAt: "2026-07-18T00:00:00.000Z",
        meta: {},
      },
    ]);
  });

  test("keeps returning every runtime asset keyed by asset ID", async () => {
    const response = await loader(
      {
        request: new Request(
          `https://p-${projectId}.localhost/$resources/assets`
        ),
      },
      dependencies
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      "asset-1": { url: "/cgi/asset/document.pdf?format=raw" },
    });
    expect(dependencies.loadAssetsByProject).toHaveBeenCalledWith(
      projectId,
      expect.anything()
    );
  });
});
