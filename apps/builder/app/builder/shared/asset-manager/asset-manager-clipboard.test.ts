import { afterEach, expect, test } from "vitest";
import {
  $assetManagerClipboard,
  canPasteAssetManagerClipboard,
  copyAssetManagerItems,
  cutAssetManagerItems,
  pasteAssetManagerClipboard,
} from "./asset-manager-clipboard";
import { $assetFolders, $assets, $project } from "~/shared/sync/data-stores";
import { createAssetFolderFixture } from "@webstudio-is/sdk/testing";

afterEach(() => {
  $assetManagerClipboard.set(undefined);
  $assetFolders.set(new Map());
  $assets.set(new Map());
  $project.set(undefined);
});

test("tracks copy and cut operations independently from item selection", () => {
  copyAssetManagerItems([
    { type: "asset", id: "asset", projectId: "project" },
    { type: "folder", id: "folder", projectId: "project" },
  ]);
  expect($assetManagerClipboard.get()).toEqual({
    operation: "copy",
    items: [
      { type: "asset", id: "asset" },
      { type: "folder", id: "folder" },
    ],
    projectId: "project",
  });

  cutAssetManagerItems([
    { type: "folder", id: "folder", projectId: "project" },
  ]);
  expect($assetManagerClipboard.get()).toEqual({
    operation: "cut",
    items: [{ type: "folder", id: "folder" }],
    projectId: "project",
  });
});

test("rejects item collections from different projects", () => {
  copyAssetManagerItems([
    { type: "asset", id: "first", projectId: "first-project" },
    { type: "asset", id: "second", projectId: "second-project" },
  ]);

  expect($assetManagerClipboard.get()).toBeUndefined();
});

test("does nothing when there is no clipboard item to paste", () => {
  expect(pasteAssetManagerClipboard(undefined)).toBeUndefined();
});

test("clears clipboard items that were deleted before pasting", () => {
  $project.set({ id: "project" } as never);
  copyAssetManagerItems([
    { type: "asset", id: "missing", projectId: "project" },
  ]);

  expect(canPasteAssetManagerClipboard(undefined)).toBe(false);
  expect(pasteAssetManagerClipboard(undefined)).toBeUndefined();
  expect($assetManagerClipboard.get()).toBeUndefined();
});

test("does not paste into a folder that no longer exists", () => {
  const folder = createAssetFolderFixture({ id: "folder" });
  $project.set({ id: "project" } as never);
  $assetFolders.set(new Map([[folder.id, folder]]));
  copyAssetManagerItems([
    { type: "folder", id: folder.id, projectId: "project" },
  ]);

  expect(canPasteAssetManagerClipboard("missing")).toBe(false);
  expect(pasteAssetManagerClipboard("missing")).toBeUndefined();
  expect($assetManagerClipboard.get()).toBeDefined();
});

test("prevents cutting a folder into one of its descendants", () => {
  const parent = createAssetFolderFixture({ id: "parent" });
  const child = createAssetFolderFixture({ id: "child", parentId: parent.id });
  $project.set({ id: "project" } as never);
  $assetFolders.set(
    new Map([
      [parent.id, parent],
      [child.id, child],
    ])
  );
  cutAssetManagerItems([
    { type: "folder", id: parent.id, projectId: "project" },
  ]);

  expect(canPasteAssetManagerClipboard(child.id)).toBe(false);
  expect(pasteAssetManagerClipboard(child.id)).toBeUndefined();
  expect($assetManagerClipboard.get()).toBeDefined();
});
