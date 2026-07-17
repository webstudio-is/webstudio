import { beforeEach, describe, expect, test } from "vitest";
import { createAssetFolderHierarchy, type Asset } from "@webstudio-is/sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  $assetFolders,
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $projectSettings,
  $props,
  $resources,
  $styleSourceSelections,
  $styleSources,
  $styles,
} from "~/shared/sync/data-stores";
import {
  $authPermit,
  $builderMode,
  $selectedPageId,
} from "~/shared/nano-states";
import { registerContainers, serverSyncStore } from "~/shared/sync/sync-stores";
import {
  createAssetFoldersFixture,
  createAssetFolderFixture,
} from "@webstudio-is/sdk/testing";
import {
  canMoveAssetManagerItems,
  deleteAssetManagerItems,
  duplicateAssetManagerItems,
  moveAssetManagerItems,
  normalizeAssetManagerItems,
} from "./asset-manager-operations";

const createAsset = (id: string, folderId?: string): Asset => ({
  id,
  projectId: "project",
  name: `${id}.png`,
  format: "png",
  size: 1,
  type: "image",
  meta: { width: 1, height: 1 },
  createdAt: "2026-01-01T00:00:00.000Z",
  folderId,
});

test("normalizes bulk operations to independent roots", () => {
  const parent = createAssetFolderFixture({ id: "parent" });
  const child = createAssetFolderFixture({ id: "child", parentId: parent.id });
  const sibling = createAssetFolderFixture({ id: "sibling" });
  const nestedAsset = createAsset("nested-asset", child.id);
  const rootAsset = createAsset("root-asset");

  expect(
    normalizeAssetManagerItems({
      items: [
        { type: "folder", id: child.id },
        { type: "asset", id: nestedAsset.id },
        { type: "folder", id: parent.id },
        { type: "folder", id: sibling.id },
        { type: "asset", id: rootAsset.id },
        { type: "asset", id: rootAsset.id },
      ],
      folders: createAssetFoldersFixture(parent, child, sibling),
      assets: new Map([
        [nestedAsset.id, nestedAsset],
        [rootAsset.id, rootAsset],
      ]),
    })
  ).toEqual([
    { type: "folder", id: parent.id },
    { type: "folder", id: sibling.id },
    { type: "asset", id: rootAsset.id },
  ]);
});

test("removes items that no longer exist", () => {
  expect(
    normalizeAssetManagerItems({
      items: [
        { type: "folder", id: "missing-folder" },
        { type: "asset", id: "missing-asset" },
      ],
      folders: new Map(),
      assets: new Map(),
    })
  ).toEqual([]);
});

test("validates folder move targets in one hierarchy", () => {
  const parent = createAssetFolderFixture({ id: "parent" });
  const child = createAssetFolderFixture({ id: "child", parentId: parent.id });
  const sibling = createAssetFolderFixture({ id: "sibling" });
  const hierarchy = createAssetFolderHierarchy(
    createAssetFoldersFixture(parent, child, sibling)
  );
  const items = [{ type: "folder" as const, id: parent.id }];

  expect(
    canMoveAssetManagerItems({ items, targetFolderId: child.id, hierarchy })
  ).toBe(false);
  expect(
    canMoveAssetManagerItems({ items, targetFolderId: sibling.id, hierarchy })
  ).toBe(true);
  expect(
    canMoveAssetManagerItems({ items, targetFolderId: undefined, hierarchy })
  ).toBe(true);
  expect(
    canMoveAssetManagerItems({ items, targetFolderId: "missing", hierarchy })
  ).toBe(false);
  expect(
    canMoveAssetManagerItems({
      items: [{ type: "folder", id: "missing" }],
      targetFolderId: sibling.id,
      hierarchy,
    })
  ).toBe(false);
  expect(
    canMoveAssetManagerItems({
      items: [],
      targetFolderId: sibling.id,
      hierarchy,
    })
  ).toBe(false);
});

registerContainers();

describe("Asset Manager bulk mutations", () => {
  beforeEach(() => {
    serverSyncStore.transactionManager.currentStack = [];
    serverSyncStore.transactionManager.undoneStack = [];
    serverSyncStore.popAll();
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    $builderMode.set("design");
    $authPermit.set("build");
    $instances.set(
      new Map([
        [
          "body",
          {
            type: "instance" as const,
            id: "body",
            component: "Body",
            children: [],
          },
        ],
      ])
    );
    $props.set(new Map());
    $breakpoints.set(new Map());
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $styles.set(new Map());
    $dataSources.set(new Map());
    $resources.set(new Map());
    $projectSettings.set({ meta: {}, compiler: {} });
    $assetFolders.set(new Map());
    $assets.set(new Map());
  });

  test("moves mixed items as one undoable and redoable transaction", () => {
    const source = createAssetFolderFixture({ id: "source" });
    const target = createAssetFolderFixture({ id: "target" });
    const asset = createAsset("asset");
    $assetFolders.set(createAssetFoldersFixture(source, target));
    $assets.set(new Map([[asset.id, asset]]));

    moveAssetManagerItems(
      [
        { type: "folder", id: source.id },
        { type: "asset", id: asset.id },
      ],
      target.id
    );

    expect($assetFolders.get().get(source.id)?.parentId).toBe(target.id);
    expect($assets.get().get(asset.id)?.folderId).toBe(target.id);

    serverSyncStore.undo();
    expect($assetFolders.get().get(source.id)?.parentId).toBeUndefined();
    expect($assets.get().get(asset.id)?.folderId).toBeUndefined();

    serverSyncStore.redo();
    expect($assetFolders.get().get(source.id)?.parentId).toBe(target.id);
    expect($assets.get().get(asset.id)?.folderId).toBe(target.id);
  });

  test("duplicates mixed items as one undoable transaction", () => {
    const source = createAssetFolderFixture({ id: "source" });
    const target = createAssetFolderFixture({ id: "target" });
    const asset = createAsset("asset");
    $assetFolders.set(createAssetFoldersFixture(source, target));
    $assets.set(new Map([[asset.id, asset]]));

    duplicateAssetManagerItems(
      [
        { type: "folder", id: source.id },
        { type: "asset", id: asset.id },
      ],
      target.id
    );

    expect($assetFolders.get()).toHaveLength(3);
    expect($assets.get()).toHaveLength(2);
    serverSyncStore.undo();
    expect($assetFolders.get()).toEqual(
      createAssetFoldersFixture(source, target)
    );
    expect($assets.get()).toEqual(new Map([[asset.id, asset]]));
  });

  test("deletes mixed items as one undoable transaction", () => {
    const folder = createAssetFolderFixture({ id: "folder" });
    const asset = createAsset("asset");
    $assetFolders.set(createAssetFoldersFixture(folder));
    $assets.set(new Map([[asset.id, asset]]));

    deleteAssetManagerItems([
      { type: "folder", id: folder.id },
      { type: "asset", id: asset.id },
    ]);

    expect($assetFolders.get()).toEqual(new Map());
    expect($assets.get()).toEqual(new Map());
    serverSyncStore.undo();
    expect($assetFolders.get()).toEqual(createAssetFoldersFixture(folder));
    expect($assets.get()).toEqual(new Map([[asset.id, asset]]));
  });

  test("rejects a bulk move that would create a folder cycle", () => {
    const parent = createAssetFolderFixture({ id: "parent" });
    const child = createAssetFolderFixture({
      id: "child",
      parentId: parent.id,
    });
    $assetFolders.set(createAssetFoldersFixture(parent, child));

    expect(() =>
      moveAssetManagerItems([{ type: "folder", id: parent.id }], child.id)
    ).toThrow();
    expect($assetFolders.get()).toEqual(
      createAssetFoldersFixture(parent, child)
    );
  });
});
