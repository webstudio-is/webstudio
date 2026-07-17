import { afterEach, expect, test } from "vitest";
import {
  $assetManagerClipboard,
  canPasteAssetManagerItem,
  copyAssetManagerItem,
  cutAssetManagerItem,
  pasteAssetManagerItem,
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
  copyAssetManagerItem({ type: "asset", id: "asset", projectId: "project" });
  expect($assetManagerClipboard.get()).toEqual({
    operation: "copy",
    items: [{ type: "asset", id: "asset", projectId: "project" }],
    projectId: "project",
  });

  cutAssetManagerItem({
    type: "folder",
    id: "folder",
    projectId: "project",
  });
  expect($assetManagerClipboard.get()).toEqual({
    operation: "cut",
    items: [{ type: "folder", id: "folder", projectId: "project" }],
    projectId: "project",
  });
});

test("does nothing when there is no clipboard item to paste", () => {
  expect(pasteAssetManagerItem(undefined)).toBeUndefined();
});

test("clears clipboard items that were deleted before pasting", () => {
  $project.set({ id: "project" } as never);
  copyAssetManagerItem({ type: "asset", id: "missing", projectId: "project" });

  expect(canPasteAssetManagerItem(undefined)).toBe(false);
  expect(pasteAssetManagerItem(undefined)).toBeUndefined();
  expect($assetManagerClipboard.get()).toBeUndefined();
});

test("does not paste into a folder that no longer exists", () => {
  const folder = createAssetFolderFixture({ id: "folder" });
  $project.set({ id: "project" } as never);
  $assetFolders.set(new Map([[folder.id, folder]]));
  copyAssetManagerItem({
    type: "folder",
    id: folder.id,
    projectId: "project",
  });

  expect(canPasteAssetManagerItem("missing")).toBe(false);
  expect(pasteAssetManagerItem("missing")).toBeUndefined();
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
  cutAssetManagerItem({
    type: "folder",
    id: parent.id,
    projectId: "project",
  });

  expect(canPasteAssetManagerItem(child.id)).toBe(false);
  expect(pasteAssetManagerItem(child.id)).toBeUndefined();
  expect($assetManagerClipboard.get()).toBeDefined();
});
