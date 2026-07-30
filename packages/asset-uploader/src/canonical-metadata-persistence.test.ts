import { describe, expect, test } from "vitest";
import {
  canonicalAssetMetadataExtractorGeneration,
  createCanonicalAssetFileEntry,
} from "@webstudio-is/content-engine/compiler";
import {
  createTestServer,
  db,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import {
  deleteCanonicalAssetFileEntryIfMatches,
  deleteStaleCanonicalAssetFileEntries,
  loadCanonicalAssetFileEntries,
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
const storedDocument = {
  ...document,
  $webstudioMetadataRequirements: "properties+excerpt",
  $webstudioExtractorGeneration: canonicalAssetMetadataExtractorGeneration,
};
const row = {
  ...entry,
  document: storedDocument,
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
};

const loadEntry = async () =>
  (
    await loadCanonicalAssetFileEntries({
      client: testContext.postgrest.client,
      projectId: "project-1",
    })
  )[0];

describe("canonical asset metadata persistence", () => {
  test("replaces older revisions for one canonical asset", async () => {
    server.use(
      db.post("rpc/replace_asset_file_metadata", async ({ request }) => {
        expect(await request.json()).toEqual({
          p_project_id: "project-1",
          p_asset_id: "asset-1",
          p_revision: "sha256:one",
          p_document: storedDocument,
          p_source: {
            storageName: "stored.md",
            fileUpdatedAt: "2026-07-18T00:00:00.000Z",
            fileSize: 100,
            contentHash: "a".repeat(64),
            filename: "post.md",
            description: "Summary",
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
          contentHash: "a".repeat(64),
          filename: "post.md",
          description: "Summary",
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

  test("loads project entries in deterministic key order", async () => {
    server.use(
      db.get("AssetFileMetadata", ({ request }) => {
        expect(new URL(request.url).searchParams.get("order")).toBe(
          "assetId.asc"
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

  test("loads cached metadata requirements without exposing the storage marker", async () => {
    server.use(
      db.get("AssetFileMetadata", () =>
        json([
          {
            ...row,
            document: {
              ...document,
              properties: {},
              $webstudioMetadataRequirements: "excerpt",
              $webstudioExtractorGeneration:
                canonicalAssetMetadataExtractorGeneration,
            },
          },
        ])
      )
    );

    const loaded = await loadEntry();

    expect(loaded?.metadataRequirements).toEqual({
      structuredProperties: false,
      excerpt: true,
    });
    expect(loaded?.document).not.toHaveProperty(
      "$webstudioMetadataRequirements"
    );
    expect(loaded?.document).not.toHaveProperty(
      "$webstudioExtractorGeneration"
    );
  });

  test("treats metadata from an older extractor generation as unprepared", async () => {
    server.use(
      db.get("AssetFileMetadata", () =>
        json([
          {
            ...row,
            document: {
              ...storedDocument,
              $webstudioExtractorGeneration:
                canonicalAssetMetadataExtractorGeneration - 1,
            },
          },
        ])
      )
    );

    const loaded = await loadEntry();

    expect(loaded?.metadataRequirements).toEqual({
      structuredProperties: false,
      excerpt: false,
    });
    expect(loaded?.document.properties).toEqual({});
    expect(loaded?.document).not.toHaveProperty("excerpt");
    expect(loaded?.document).not.toHaveProperty("metadataError");
  });

  test("treats metadata without an extractor generation as unprepared", async () => {
    const {
      $webstudioExtractorGeneration: _extractorGeneration,
      ...legacyDocument
    } = storedDocument;
    server.use(
      db.get("AssetFileMetadata", () =>
        json([{ ...row, document: legacyDocument }])
      )
    );

    const loaded = await loadEntry();

    expect(loaded?.metadataRequirements).toEqual({
      structuredProperties: false,
      excerpt: false,
    });
  });

  test("rejects rows whose database and document identities disagree", async () => {
    server.use(
      db.get("AssetFileMetadata", () => json([{ ...row, assetId: "asset-2" }]))
    );
    await expect(loadEntry()).rejects.toThrow("identity is inconsistent");
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

  test("deletes standard metadata only when the complete snapshot still matches", async () => {
    server.use(
      db.post(
        "rpc/delete_asset_file_metadata_if_matches",
        async ({ request }) => {
          expect(await request.json()).toEqual({
            p_project_id: "project-1",
            p_asset_id: "asset-1",
            p_revision: "sha256:one",
            p_document: storedDocument,
          });
          return json(1);
        }
      )
    );
    await expect(
      deleteCanonicalAssetFileEntryIfMatches({
        client: testContext.postgrest.client,
        entry,
      })
    ).resolves.toBe(1);
  });
});
