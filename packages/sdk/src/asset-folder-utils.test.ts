import { describe, expect, test } from "vitest";
import { createAssetFolderHierarchy } from "./asset-folder-hierarchy";
import { normalizeAssetFolderData } from "./asset-folder-normalization";
import {
  createAssetFolderFixture as folder,
  createAssetFoldersFixture as createFolders,
} from "./asset-folder.test-fixtures";

describe("asset folder utilities", () => {
  const root = folder({ id: "root" });
  const child = folder({ id: "child", parentId: "root" });
  const grandchild = folder({ id: "grandchild", parentId: "child" });
  const folders = createFolders(grandchild, child, root);
  const hierarchy = createAssetFolderHierarchy(folders);

  test("traverses descendants and ancestors", () => {
    expect(hierarchy.getDescendantIds("root")).toEqual(
      new Set(["child", "grandchild"])
    );
    expect(hierarchy.getSubtreeIds("root")).toEqual(
      new Set(["root", "child", "grandchild"])
    );
    expect(hierarchy.getPath("grandchild")).toEqual([root, child, grandchild]);
  });

  test("sorts parents before descendants", () => {
    expect(hierarchy.sortByDepth(folders.values())).toEqual([
      root,
      child,
      grandchild,
    ]);
  });

  test("handles cyclic hierarchy traversal without looping", () => {
    const cyclic = createFolders(
      folder({ id: "left", parentId: "right" }),
      folder({ id: "right", parentId: "left" })
    );

    const cyclicHierarchy = createAssetFolderHierarchy(cyclic);
    expect(cyclicHierarchy.getPath("left")).toHaveLength(2);
    expect(cyclicHierarchy.hasCycle("left")).toBe(true);
    expect(cyclicHierarchy.sortByDepth(cyclic.values())).toHaveLength(2);
  });

  test("finds sibling names case-insensitively and respects exclusions", () => {
    const photos = folder({ id: "photos", name: "Photos" });
    const folders = createFolders(
      photos,
      folder({ id: "nested", parentId: "photos", name: "Photos" })
    );

    expect(
      createAssetFolderHierarchy(folders).findByName({
        name: " photos ",
        parentId: undefined,
      })
    ).toBe(photos);
    expect(
      createAssetFolderHierarchy(folders).findByName({
        name: "photos",
        parentId: undefined,
        excludeIds: new Set([photos.id]),
      })
    ).toBeUndefined();
  });

  test("treats orphaned asset folder references as root", () => {
    const asset = {
      id: "asset",
      projectId: "project",
      name: "asset.pdf",
      type: "file" as const,
      format: "pdf",
      size: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      description: null,
      folderId: "missing",
      meta: {},
    };

    expect(hierarchy.resolveFolderId(asset.folderId)).toBeUndefined();
    expect(
      normalizeAssetFolderData({
        assets: [asset],
        folders: [...folders.values()],
      }).assets[0]
    ).not.toHaveProperty("folderId");
  });
});
