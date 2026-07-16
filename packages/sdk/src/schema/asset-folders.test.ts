import { describe, expect, test } from "vitest";
import { assetFolders, type AssetFolder } from "./asset-folders";

const folder = (id: string, parentId?: string, name = id): AssetFolder => ({
  id,
  projectId: "project",
  name,
  parentId,
  createdAt: "2026-01-01T00:00:00.000Z",
});

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
