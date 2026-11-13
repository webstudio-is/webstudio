import { describe, expect, test } from "vitest";
import {
  readAssetContentBytes,
  type AssetContentRepository,
} from "./asset-content-repository";

const createRepository = (size: number): AssetContentRepository => ({
  readContent: async () => ({
    asset: {
      id: "asset",
      projectId: "project",
      name: "article.mdx",
      type: "file",
      format: "mdx",
      size,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    data: (async function* () {
      yield new TextEncoder().encode("Current content");
    })(),
  }),
  updateContent: async () => {
    throw new Error("Not implemented");
  },
});

describe("readAssetContentBytes", () => {
  test("reads exact bounded content", async () => {
    const result = await readAssetContentBytes({
      repository: createRepository(15),
      assetId: "asset",
      maxSize: 100,
    });

    expect(new TextDecoder().decode(result.bytes)).toBe("Current content");
  });

  test("rejects content that does not match the descriptor size", async () => {
    await expect(
      readAssetContentBytes({
        repository: createRepository(14),
        assetId: "asset",
        maxSize: 100,
      })
    ).rejects.toThrow("does not match its declared size");
  });
});
