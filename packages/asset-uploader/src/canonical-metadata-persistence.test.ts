import { describe, expect, test } from "vitest";
import { createCanonicalAssetFileEntry } from "@webstudio-is/asset-resource";
import {
  createTestServer,
  db,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import {
  deleteStaleCanonicalAssetFileEntries,
  loadCanonicalAssetFileEntries,
  loadCanonicalAssetFileEntry,
  loadCanonicalAssetFileSnapshot,
  replaceCanonicalAssetFileEntry,
} from "./canonical-metadata-persistence";

const server = createTestServer();
const document = {
  _id: "asset-1",
  _type: "asset.file" as const,
  name: "post.md",
  path: "blog/post.md",
  key: "post",
  folderId: "blog",
  extension: "md",
  mimeType: "text/markdown",
  size: 100,
  revision: "sha256:one",
  contentRef: "asset:post.md:sha256:one",
  properties: { title: "Post" },
  excerpt: "Post excerpt",
};
const entry = createCanonicalAssetFileEntry({
  projectId: "project-1",
  document,
});
const row = {
  ...entry,
  metadataToken: "metadata-token-1",
  document,
  fieldContributions: entry.fieldContributions,
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
};

describe("canonical asset metadata persistence", () => {
  test("loads one exact revision without falling back to another", async () => {
    server.use(
      db.get("AssetFileMetadata", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("projectId")).toBe("eq.project-1");
        expect(url.searchParams.get("assetId")).toBe("eq.asset-1");
        expect(url.searchParams.get("revision")).toBe("eq.sha256:one");
        return json(row);
      })
    );

    await expect(
      loadCanonicalAssetFileEntry({
        client: testContext.postgrest.client,
        projectId: "project-1",
        assetId: "asset-1",
        revision: "sha256:one",
      })
    ).resolves.toEqual(entry);
  });

  test("loads metadata tokens atomically with canonical entries", async () => {
    server.use(db.get("AssetFileMetadata", () => json([row])));

    await expect(
      loadCanonicalAssetFileSnapshot({
        client: testContext.postgrest.client,
        projectId: "project-1",
      })
    ).resolves.toEqual({
      entries: [entry],
      metadataSnapshot: [
        { assetId: "asset-1", metadataToken: "metadata-token-1" },
      ],
    });
  });

  test("replaces older revisions for one canonical asset", async () => {
    server.use(
      db.post("rpc/replace_asset_file_metadata", async ({ request }) => {
        expect(await request.json()).toEqual({
          p_project_id: "project-1",
          p_asset_id: "asset-1",
          p_revision: "sha256:one",
          p_document: document,
          p_field_contributions: entry.fieldContributions,
          p_source: {
            storageName: "stored.md",
            fileUpdatedAt: "2026-07-18T00:00:00.000Z",
            fileSize: 100,
            filename: "post.md",
            folderId: "blog",
          },
        });
        return json(true);
      })
    );
    await expect(
      replaceCanonicalAssetFileEntry({
        client: testContext.postgrest.client,
        entry,
        source: {
          storageName: "stored.md",
          fileUpdatedAt: "2026-07-18T00:00:00.000Z",
          fileSize: 100,
          filename: "post.md",
          folderId: "blog",
        },
      })
    ).resolves.toEqual(entry);
  });

  test("rejects a replacement when its source snapshot is stale", async () => {
    server.use(db.post("rpc/replace_asset_file_metadata", () => json(false)));
    await expect(
      replaceCanonicalAssetFileEntry({
        client: testContext.postgrest.client,
        entry,
        source: {
          storageName: "stored.md",
          fileUpdatedAt: "2026-07-18T00:00:00.000Z",
          fileSize: 100,
        },
      })
    ).rejects.toThrow("source changed during update");
  });

  test("returns undefined when an exact revision is absent", async () => {
    server.use(db.get("AssetFileMetadata", () => json(null)));
    await expect(
      loadCanonicalAssetFileEntry({
        client: testContext.postgrest.client,
        projectId: "project-1",
        assetId: "asset-1",
        revision: "missing",
      })
    ).resolves.toBeUndefined();
  });

  test("loads project entries in deterministic key order", async () => {
    server.use(
      db.get("AssetFileMetadata", ({ request }) => {
        expect(new URL(request.url).searchParams.get("order")).toBe(
          "assetId.asc,revision.asc"
        );
        return json([row]);
      })
    );
    await expect(
      loadCanonicalAssetFileEntries({
        client: testContext.postgrest.client,
        projectId: "project-1",
      })
    ).resolves.toEqual([entry]);
  });

  test("rejects rows whose database and document identities disagree", async () => {
    server.use(
      db.get("AssetFileMetadata", () => json({ ...row, assetId: "asset-2" }))
    );
    await expect(
      loadCanonicalAssetFileEntry({
        client: testContext.postgrest.client,
        projectId: "project-1",
        assetId: "asset-2",
        revision: "sha256:one",
      })
    ).rejects.toThrow("identity is inconsistent");
  });

  test("requests stale deletion only for the selected project assets", async () => {
    server.use(
      db.post("rpc/delete_stale_asset_file_metadata", async ({ request }) => {
        expect(await request.json()).toEqual({
          p_project_id: "project-1",
          p_asset_ids: ["asset-1", "asset-2"],
        });
        return json(2);
      })
    );
    await expect(
      deleteStaleCanonicalAssetFileEntries({
        client: testContext.postgrest.client,
        projectId: "project-1",
        assetIds: ["asset-1", "asset-2"],
      })
    ).resolves.toBe(2);
  });
});
