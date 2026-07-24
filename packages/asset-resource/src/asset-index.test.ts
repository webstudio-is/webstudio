import { describe, expect, test } from "vitest";
import { createCanonicalAssetFileEntry } from "./canonical";
import {
  createAssetIndex,
  serializeAssetIndex,
  verifyAssetIndex,
} from "./asset-index";

const entry = ({
  projectId = "project",
  id,
}: {
  projectId?: string;
  id: string;
}) =>
  createCanonicalAssetFileEntry({
    projectId,
    document: {
      _id: id,
      _type: "asset.file",
      name: `${id}.md`,
      path: `blog/${id}.md`,
      key: id,
      extension: "md",
      mimeType: "text/markdown",
      size: 20,
      revision: `revision-${id}`,
      contentRef: `files/${id}.md`,
      properties: { title: id, nested: { published: true } },
      excerpt: `${id} excerpt`,
    },
  });

describe("shared asset index", () => {
  test("creates one deterministic query-independent index and field catalog", async () => {
    const index = await createAssetIndex({
      projectId: "project",
      entries: [entry({ id: "beta" }), entry({ id: "alpha" })],
    });

    expect(index.format).toBe("webstudio-asset-index");
    expect(index.documents.map(({ _id }) => _id)).toEqual(["alpha", "beta"]);
    expect(index.fieldCatalog.canonicalRevision).toBe(index.assetRevision);
    expect(index.fieldCatalog.fields).toHaveProperty("properties.title");
    expect(index).not.toHaveProperty("resourceId");
    expect(index).not.toHaveProperty("queryHash");
    expect(index).not.toHaveProperty("plan");
    await expect(verifyAssetIndex(index)).resolves.toEqual(index);
  });

  test("rejects mixed projects, duplicate assets, and corrupted bytes", async () => {
    await expect(
      createAssetIndex({
        projectId: "project",
        entries: [
          entry({ id: "alpha" }),
          entry({ projectId: "other", id: "beta" }),
        ],
      })
    ).rejects.toThrow("multiple projects");
    await expect(
      createAssetIndex({
        projectId: "project",
        entries: [entry({ id: "alpha" }), entry({ id: "alpha" })],
      })
    ).rejects.toThrow("duplicate canonical assets");

    const index = await createAssetIndex({
      projectId: "project",
      entries: [entry({ id: "alpha" })],
    });
    await expect(
      verifyAssetIndex({
        ...index,
        documents: [{ ...index.documents[0], name: "changed.md" }],
      })
    ).rejects.toThrow("checksum");
    expect(serializeAssetIndex(index)).toContain('"webstudio-asset-index"');
  });
});
