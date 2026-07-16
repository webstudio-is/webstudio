import { describe, expect, test } from "vitest";
import { assetFolders } from "./asset-folders";
import { createAssetFolderFixture as folder } from "../asset-folder.test-fixtures";

describe("assetFolders", () => {
  test("accepts nested folders", () => {
    expect(() =>
      assetFolders.parse(
        new Map([
          ["parent", folder("parent")],
          ["child", folder("child", "parent")],
        ])
      )
    ).not.toThrow();
  });

  test("rejects missing parents, cycles, and duplicate sibling names", () => {
    expect(() =>
      assetFolders.parse(new Map([["child", folder("child", "missing")]]))
    ).toThrow("Parent folder must exist");
    expect(() =>
      assetFolders.parse(
        new Map([
          ["left", folder("left", "right")],
          ["right", folder("right", "left")],
        ])
      )
    ).toThrow("Folders can't contain cycles");
    expect(() =>
      assetFolders.parse(
        new Map([
          ["one", folder("one", undefined, "Media")],
          ["two", folder("two", undefined, "media")],
        ])
      )
    ).toThrow("Folder name must be unique");
  });

  test("rejects empty ids and folders from mixed projects", () => {
    expect(() => assetFolders.parse(new Map([["", folder("")]]))).toThrow();
    expect(() =>
      assetFolders.parse(
        new Map([
          ["one", folder("one")],
          ["two", { ...folder("two"), projectId: "another-project" }],
        ])
      )
    ).toThrow("All folders must belong to the same project");
  });
});
