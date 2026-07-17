import { describe, expect, test } from "vitest";
import { assetFolders } from "./asset-folders";
import { createAssetFolderFixture as folder } from "../asset-folder.test-fixtures";

describe("assetFolders", () => {
  test("accepts nested folders", () => {
    expect(() =>
      assetFolders.parse(
        new Map([
          ["parent", folder({ id: "parent" })],
          ["child", folder({ id: "child", parentId: "parent" })],
        ])
      )
    ).not.toThrow();
  });

  test("rejects missing parents, cycles, and duplicate sibling names", () => {
    expect(() =>
      assetFolders.parse(
        new Map([["child", folder({ id: "child", parentId: "missing" })]])
      )
    ).toThrow("Parent folder must exist");
    expect(() =>
      assetFolders.parse(
        new Map([
          ["left", folder({ id: "left", parentId: "right" })],
          ["right", folder({ id: "right", parentId: "left" })],
        ])
      )
    ).toThrow("Folders can't contain cycles");
    expect(() =>
      assetFolders.parse(
        new Map([
          ["one", folder({ id: "one", name: "Media" })],
          ["two", folder({ id: "two", name: "media" })],
        ])
      )
    ).toThrow("Folder name must be unique");
  });

  test("rejects empty ids and folders from mixed projects", () => {
    expect(() =>
      assetFolders.parse(new Map([["", folder({ id: "" })]]))
    ).toThrow();
    expect(() =>
      assetFolders.parse(
        new Map([
          ["one", folder({ id: "one" })],
          ["two", { ...folder({ id: "two" }), projectId: "another-project" }],
        ])
      )
    ).toThrow("All folders must belong to the same project");
  });
});
