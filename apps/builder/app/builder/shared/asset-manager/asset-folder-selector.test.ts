import { describe, expect, test } from "vitest";
import {
  createAssetFolderSelectorLevels,
  getAssetFolderSelectValue,
} from "./asset-folder-selector";
import {
  createAssetFolderFixture,
  createAssetFoldersFixture as folders,
} from "./asset-folder.test-fixtures";

const folder = (id: string, parentId?: string) =>
  createAssetFolderFixture({ id, parentId });

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
    expect(levels[0].options[0].label).toBe("Root");
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

    expect(level.ariaLabel).toBe("Parent folder");
  });

  test("falls back to Root when the selected folder no longer exists", () => {
    const [level] = createAssetFolderSelectorLevels({
      folders: values,
      value: "missing",
    });

    expect(level.selected).toEqual({
      label: "Root",
      folderId: undefined,
    });
  });

  test("uses non-empty unique select values for Root and folders", () => {
    expect(
      getAssetFolderSelectValue({ label: "Root", folderId: undefined })
    ).toBe("no-folder");
    expect(
      getAssetFolderSelectValue({ label: "Folder", folderId: "no-folder" })
    ).toBe("folder:no-folder");
  });
});
