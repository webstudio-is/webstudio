import { describe, expect, test } from "vitest";
import type { AssetFolder, AssetFolders } from "./schema/asset-folders";
import {
  findAssetFolderByName,
  getAssetFolderDescendantIds,
  getAssetFolderPath,
  sortAssetFoldersByDepth,
} from "./asset-folder-utils";

const folder = (id: string, parentId?: string, name = id): AssetFolder => ({
  id,
  projectId: "project",
  name,
  parentId,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const createFolders = (...items: AssetFolder[]): AssetFolders =>
  new Map(items.map((item) => [item.id, item]));

describe("asset folder utilities", () => {
  const root = folder("root");
  const child = folder("child", "root");
  const grandchild = folder("grandchild", "child");
  const folders = createFolders(grandchild, child, root);

  test("traverses descendants and ancestors", () => {
    expect(getAssetFolderDescendantIds(folders, "root")).toEqual(
      new Set(["child", "grandchild"])
    );
    expect(getAssetFolderPath(folders, "grandchild")).toEqual([
      root,
      child,
      grandchild,
    ]);
  });

  test("sorts parents before descendants", () => {
    expect(sortAssetFoldersByDepth(folders.values())).toEqual([
      root,
      child,
      grandchild,
    ]);
  });

  test("finds sibling names case-insensitively and respects exclusions", () => {
    const photos = folder("photos", undefined, "Photos");
    const folders = createFolders(photos, folder("nested", "photos", "Photos"));

    expect(
      findAssetFolderByName(folders, {
        name: " photos ",
        parentId: undefined,
      })
    ).toBe(photos);
    expect(
      findAssetFolderByName(folders, {
        name: "photos",
        parentId: undefined,
        excludeIds: new Set([photos.id]),
      })
    ).toBeUndefined();
  });
});
