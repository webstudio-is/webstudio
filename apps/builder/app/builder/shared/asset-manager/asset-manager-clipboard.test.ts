import { afterEach, expect, test } from "vitest";
import {
  $assetManagerClipboard,
  copyAssetManagerItem,
  cutAssetManagerItem,
  pasteAssetManagerItem,
} from "./asset-manager-clipboard";

afterEach(() => $assetManagerClipboard.set(undefined));

test("tracks copy and cut operations independently from item selection", () => {
  copyAssetManagerItem({ type: "asset", id: "asset", projectId: "project" });
  expect($assetManagerClipboard.get()).toEqual({
    operation: "copy",
    type: "asset",
    id: "asset",
    projectId: "project",
  });

  cutAssetManagerItem({
    type: "folder",
    id: "folder",
    projectId: "project",
  });
  expect($assetManagerClipboard.get()).toEqual({
    operation: "cut",
    type: "folder",
    id: "folder",
    projectId: "project",
  });
});

test("does nothing when there is no clipboard item to paste", () => {
  expect(pasteAssetManagerItem(undefined)).toBeUndefined();
});
