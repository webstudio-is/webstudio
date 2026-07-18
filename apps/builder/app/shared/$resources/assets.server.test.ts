import { beforeEach, describe, expect, test, vi } from "vitest";
import { loadAssetsByProject } from "@webstudio-is/asset-uploader/index.server";
import { createContext } from "../context.server";
import { loader } from "./assets.server";

vi.mock("@webstudio-is/asset-uploader/index.server", () => ({
  loadAssetsByProject: vi.fn(),
}));
vi.mock("../context.server", () => ({
  createContext: vi.fn(),
}));

const projectId = "090e6e14-ae50-4b2e-bd22-71733cec05bb";

describe("legacy Assets system resource", () => {
  beforeEach(() => {
    vi.mocked(createContext).mockResolvedValue({} as never);
    vi.mocked(loadAssetsByProject).mockResolvedValue([
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
    const response = await loader({
      request: new Request(
        `https://p-${projectId}.localhost/$resources/assets`
      ),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      "asset-1": { url: "/cgi/asset/document.pdf?format=raw" },
    });
    expect(loadAssetsByProject).toHaveBeenCalledWith(
      projectId,
      expect.anything()
    );
  });
});
