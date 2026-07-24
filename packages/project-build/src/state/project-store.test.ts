import { describe, expect, test } from "vitest";
import type {
  Asset,
  AssetFileDocument,
  AssetFolder,
  BuilderAssetFieldCatalog,
} from "@webstudio-is/sdk";
import { createBuilderStateFromBuildData } from "./adapters";
import {
  createBuilderProjectDataFromCollections,
  createBuilderProjectCollections,
  createBuilderProjectSnapshotInput,
  createBuilderStateFromProjectCollections,
  computeBuilderAssetRevision,
} from "./project-store";

const assetReference = {
  storage: "object",
  type: "asset",
  object: {
    hash: "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    size: 12,
  },
} as const;

const asset = {
  id: "asset-1",
  projectId: "project",
  name: "post.md",
  filename: "post.md",
  type: "file",
  format: "raw",
  size: 12,
  createdAt: "2026-07-24T00:00:00.000Z",
  meta: {},
} satisfies Asset;

const folder = {
  id: "folder-1",
  projectId: "project",
  name: "posts",
  createdAt: "2026-07-24T00:00:00.000Z",
} satisfies AssetFolder;

const assetDocument = {
  _id: asset.id,
  _type: "asset.file",
  name: "post.md",
  path: "posts/post.md",
  key: "post",
  extension: "md",
  mimeType: "text/markdown",
  size: asset.size,
  revision: "file:post.md:revision:12",
  contentRef: asset.name,
  properties: { title: "Post" },
} satisfies AssetFileDocument;

const assetFieldCatalog = {
  format: "webstudio-builder-asset-field-catalog",
  version: 1,
  canonicalRevision: `sha256:${"a".repeat(64)}`,
  documentCount: 1,
  fields: {
    "properties.title": {
      types: ["string"],
      occurrences: 1,
    },
  },
} satisfies BuilderAssetFieldCatalog;

describe("Builder project-store collections", () => {
  test("round-trips partial Builder and asset namespaces", () => {
    const state = createBuilderStateFromBuildData({
      assets: [asset],
      assetFolders: [folder],
      resources: [],
    });

    const assetReferences = new Map([[asset.id, assetReference]]);
    const collections = createBuilderProjectCollections({
      state,
      namespaces: ["assets", "assetFolders", "resources"],
      assetReferences,
    });

    expect(collections).toEqual({
      "assets/records": [[asset.id, asset]],
      "assets/blobs": [[asset.id, assetReference]],
      "assets/folders": [[folder.id, folder]],
      "builder/resources": [],
    });
    const restored = createBuilderStateFromProjectCollections(collections);
    expect(restored.assets).toEqual(new Map([[asset.id, asset]]));
    expect(restored.assetFolders).toEqual(new Map([[folder.id, folder]]));
    expect(restored.resources).toEqual(new Map());
    expect(createBuilderProjectDataFromCollections(collections)).toEqual({
      state: restored,
      assetReferences,
    });

    expect(
      createBuilderProjectSnapshotInput({
        projectId: "project",
        builderRevision: "4",
        assetRevision: "assets:2",
        state,
        namespaces: ["assets"],
        assetReferences,
      })
    ).toEqual({
      projectId: "project",
      builderRevision: "4",
      assetRevision: "assets:2",
      collections: {
        "assets/records": [[asset.id, asset]],
        "assets/blobs": [[asset.id, assetReference]],
      },
    });
  });

  test("ignores non-Builder collections and rejects invalid known data", () => {
    expect(
      createBuilderStateFromProjectCollections({
        "queries/resource": { version: 1 },
      })
    ).toEqual({});
    expect(() =>
      createBuilderStateFromProjectCollections({
        "assets/folders": [{ invalid: true }],
      })
    ).toThrow();
  });

  test("rejects duplicate and non-canonical collection keys", () => {
    expect(() =>
      createBuilderStateFromProjectCollections({
        "assets/records": [
          [asset.id, asset],
          [asset.id, { ...asset, name: "duplicate.md" }],
        ],
      })
    ).toThrow("duplicate key");
    expect(() =>
      createBuilderStateFromProjectCollections({
        "assets/records": [["wrong-id", asset]],
      })
    ).toThrow("non-canonical key");

    const state = createBuilderStateFromBuildData({ assets: [asset] });
    state.assets = new Map([["wrong-id", asset]]);
    expect(() =>
      createBuilderProjectCollections({
        state,
        namespaces: ["assets"],
        assetReferences: new Map([["wrong-id", assetReference]]),
      })
    ).toThrow("non-canonical key");
  });

  test("requires complete and consistent blob references for assets", () => {
    const state = createBuilderStateFromBuildData({ assets: [asset] });

    expect(() =>
      createBuilderProjectCollections({ state, namespaces: ["assets"] })
    ).toThrow("stored together");
    expect(() =>
      createBuilderProjectCollections({
        state,
        namespaces: ["assets"],
        assetReferences: new Map([
          [
            asset.id,
            {
              ...assetReference,
              object: { ...assetReference.object, size: asset.size + 1 },
            },
          ],
        ]),
      })
    ).toThrow("inconsistent object blob reference");
    expect(() =>
      createBuilderStateFromProjectCollections({
        "assets/records": [[asset.id, asset]],
        "assets/blobs": [["other", assetReference]],
      })
    ).toThrow("has no blob reference");

    const emptyState = createBuilderStateFromBuildData({ assets: [] });
    expect(
      createBuilderProjectCollections({
        state: emptyState,
        namespaces: ["assets"],
      })
    ).toEqual({ "assets/records": [] });
    expect(
      createBuilderProjectCollections({
        state: emptyState,
        namespaces: ["assets"],
        assetReferences: new Map(),
      })
    ).toEqual({ "assets/records": [] });
    expect(
      createBuilderStateFromProjectCollections({ "assets/records": [] }).assets
    ).toEqual(new Map());
  });

  test("round-trips derived asset documents and their field catalog", async () => {
    const state = createBuilderStateFromBuildData({ assets: [asset] });
    const collections = createBuilderProjectCollections({
      state,
      namespaces: ["assets"],
      assetReferences: new Map([[asset.id, assetReference]]),
      assetDocuments: [assetDocument],
      assetFieldCatalog,
    });

    expect(collections).toMatchObject({
      "assets/documents": [assetDocument],
      "assets/field-catalog": assetFieldCatalog,
    });
    expect(createBuilderProjectDataFromCollections(collections)).toMatchObject({
      assetDocuments: [assetDocument],
      assetFieldCatalog,
    });
    const revision = await computeBuilderAssetRevision(collections);
    await expect(
      computeBuilderAssetRevision({
        ...collections,
        "assets/documents": [
          { ...assetDocument, properties: { title: "Changed" } },
        ],
      })
    ).resolves.not.toBe(revision);

    expect(() =>
      createBuilderProjectCollections({
        state,
        namespaces: ["assets"],
        assetReferences: new Map([[asset.id, assetReference]]),
        assetDocuments: [assetDocument],
      })
    ).toThrow("stored together");
    expect(() =>
      createBuilderProjectCollections({
        state,
        namespaces: ["assets"],
        assetReferences: new Map([[asset.id, assetReference]]),
        assetDocuments: [{ ...assetDocument, contentRef: "other.md" }],
        assetFieldCatalog,
      })
    ).toThrow("identity is inconsistent");
  });

  test("omits asset-only supporting collections from partial snapshots", () => {
    const state = createBuilderStateFromBuildData({
      assets: [asset],
      resources: [],
    });

    expect(
      createBuilderProjectCollections({
        state,
        namespaces: ["resources"],
        assetDocuments: [assetDocument],
        assetFieldCatalog,
      })
    ).toEqual({ "builder/resources": [] });
  });

  test("canonicalizes map-backed collections independently of insertion order", () => {
    const secondAsset = { ...asset, id: "asset-2", name: "second.md" };
    const forwardState = createBuilderStateFromBuildData({
      assets: [asset, secondAsset],
    });
    const reverseState = createBuilderStateFromBuildData({
      assets: [secondAsset, asset],
    });
    const references = new Map([
      [secondAsset.id, assetReference],
      [asset.id, assetReference],
    ]);

    expect(
      createBuilderProjectCollections({
        state: forwardState,
        namespaces: ["assets"],
        assetReferences: references,
      })
    ).toEqual(
      createBuilderProjectCollections({
        state: reverseState,
        namespaces: ["assets"],
        assetReferences: references,
      })
    );
  });
});
