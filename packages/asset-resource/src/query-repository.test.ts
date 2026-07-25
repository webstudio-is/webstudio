import { describe, expect, test, vi } from "vitest";
import type { AssetIndexV1 } from "@webstudio-is/sdk";
import { createAssetQueryRepository } from "./query-repository";

const revision = `sha256:${"a".repeat(64)}`;
const index: AssetIndexV1 = {
  format: "webstudio-asset-index",
  version: 1,
  assetRevision: revision,
  documents: [
    {
      _id: "post",
      _type: "asset.file",
      name: "post.md",
      path: "post.md",
      key: "post.md",
      extension: "md",
      mimeType: "text/markdown",
      size: 4,
      revision,
      contentRef: "post.md",
      properties: { slug: "post" },
    },
  ],
  fieldCatalog: {
    format: "webstudio-builder-asset-field-catalog",
    version: 1,
    canonicalRevision: revision,
    documentCount: 1,
    fields: {
      "properties.slug": {
        queryPath: ["properties", "slug"],
        types: ["string"],
        occurrences: 1,
      },
    },
  },
  integrity: { algorithm: "sha256", checksum: revision },
};

describe("storage-neutral asset query repository", () => {
  test("queries an injected index without reading unselected content", async () => {
    const readContent = vi.fn();
    const repository = createAssetQueryRepository({
      loadIndex: async () => index,
      readContent,
    });

    await expect(
      repository.query({
        query: {
          where: {
            all: [
              {
                field: ["properties", "slug"],
                operator: "eq",
                value: "post",
              },
            ],
          },
        },
      })
    ).resolves.toMatchObject({ items: [{ id: "post" }], totalCount: 1 });
    expect(readContent).not.toHaveBeenCalled();
  });

  test("validates the requested revision before hydrating content", async () => {
    const readContent = vi.fn();
    const repository = createAssetQueryRepository({
      loadIndex: async () => index,
      readContent,
    });

    await expect(
      repository.query({
        indexRevision: `sha256:${"b".repeat(64)}`,
        query: { content: { mode: "full" } },
      })
    ).rejects.toMatchObject({ name: "AssetIndexRevisionError" });
    expect(readContent).not.toHaveBeenCalled();
  });
});
