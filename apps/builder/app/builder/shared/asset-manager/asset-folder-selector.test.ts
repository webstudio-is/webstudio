import { describe, expect, test } from "vitest";
import type { AssetFolder, AssetFolders } from "@webstudio-is/sdk";
import { createAssetFolderSelectorLevels } from "./asset-folder-selector";

const folder = (id: string, parentId?: string): AssetFolder => ({
  id,
  projectId: "project",
  name: id,
  parentId,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const folders = (...items: AssetFolder[]): AssetFolders =>
  new Map(items.map((item) => [item.id, item]));

describe("asset folder selector levels", () => {
  const values = folders(
    folder("parent"),
    folder("child", "parent"),
    folder("grandchild", "child"),
    folder("sibling")
  );

  test("selects every segment of the current folder path", () => {
    const levels = createAssetFolderSelectorLevels({
      folders: values,
      value: "grandchild",
    });

    expect(levels.map(({ selected }) => selected.folderId)).toEqual([
      "parent",
      "child",
      "grandchild",
    ]);
    expect(levels[0].options.map(({ folderId }) => folderId)).toEqual([
      undefined,
      "parent",
      "sibling",
    ]);
    expect(levels[0].options[0].label).toBe("No folder");
  });

  test("excludes a folder and all descendants when choosing its parent", () => {
    const levels = createAssetFolderSelectorLevels({
      folders: values,
      value: undefined,
      excludedFolderId: "parent",
    });

    expect(levels).toHaveLength(1);
    expect(levels[0].options.map(({ folderId }) => folderId)).toEqual([
      undefined,
      "sibling",
    ]);
  });

  test("supports context-specific labeling for the root level", () => {
    const [level] = createAssetFolderSelectorLevels({
      folders: values,
      value: undefined,
      rootLabel: "Parent folder",
    });

    expect(level.label).toBe("Parent folder");
    expect(level.ariaLabel).toBe("Parent folder");
  });

  test("falls back to No folder when the selected folder no longer exists", () => {
    const [level] = createAssetFolderSelectorLevels({
      folders: values,
      value: "missing",
    });

    expect(level.selected).toEqual({
      label: "No folder",
      value: "root:",
      folderId: undefined,
    });
  });
});
