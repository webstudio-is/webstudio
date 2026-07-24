import { describe, expect, test } from "vitest";
import { createAssetResourceIndex } from "./resource-index";
import { verifyPublishedAssetResourceIndex } from "./runtime-index";

const createIndex = () =>
  createAssetResourceIndex({
    format: "webstudio-resource-index",
    version: 1,
    resourceId: "posts",
    query: "{ assets { items { id } } }",
    assetRevision: `sha256:${"a".repeat(64)}`,
    documents: [
      {
        _id: "post",
        _type: "asset.file",
        name: "post.md",
        path: "blog/post.md",
        key: "post",
        extension: "md",
        mimeType: "text/markdown",
        size: 10,
        revision: "revision-1",
        contentRef: "post.md",
        properties: { title: "Post" },
      },
    ],
  });

describe("dependency-free published index verification", () => {
  test("accepts an authoring-built index", async () => {
    const index = await createIndex();
    await expect(verifyPublishedAssetResourceIndex(index)).resolves.toEqual(
      index
    );
  });

  test("rejects unknown fields and malformed documents before execution", async () => {
    const index = await createIndex();
    await expect(
      verifyPublishedAssetResourceIndex({ ...index, unexpected: true })
    ).rejects.toThrow("invalid fields");
    await expect(
      verifyPublishedAssetResourceIndex({
        ...index,
        documents: [{ ...index.documents[0], size: -1 }],
      })
    ).rejects.toThrow("document is invalid");
  });
});
