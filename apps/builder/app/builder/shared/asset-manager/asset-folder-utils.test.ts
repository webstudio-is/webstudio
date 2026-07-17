import { describe, expect, test } from "vitest";
import { createAssetFolderHierarchy, type Asset } from "@webstudio-is/sdk";
import {
  filterAssetFolders,
  formatAssetFolderPath,
  sortAssetFolders,
} from "./asset-folder-utils";
import {
  createAssetFolderFixture,
  createAssetFoldersFixture,
} from "@webstudio-is/sdk/testing";

const folder = (
  id: string,
  parentId?: string,
  createdAt = "2026-01-01T00:00:00.000Z"
) => createAssetFolderFixture({ id, parentId, createdAt });

const asset = (id: string, folderId: string, size: number): Asset =>
  ({
    id,
    projectId: "project",
    name: `${id}.pdf`,
    type: "file",
    size,
    format: "pdf",
    createdAt: "2026-01-01T00:00:00.000Z",
    folderId,
    meta: {},
  }) as Asset;

describe("asset folder utilities", () => {
  const parent = folder("parent");
  const child = folder("child", "parent");
  const sibling = folder("sibling", undefined, "2026-02-01T00:00:00.000Z");
  const folders = createAssetFoldersFixture(parent, child, sibling);
  const hierarchy = createAssetFolderHierarchy(folders);

  test("formats a full breadcrumb path", () => {
    expect(formatAssetFolderPath(hierarchy, "child")).toBe(
      "Root / parent / child"
    );
    expect(formatAssetFolderPath(hierarchy, undefined)).toBe("Root");
  });

  test.each([
    ["name", "asc", ["parent", "sibling"]],
    ["name", "desc", ["sibling", "parent"]],
    ["createdAt", "asc", ["parent", "sibling"]],
    ["createdAt", "desc", ["sibling", "parent"]],
    ["size", "asc", ["sibling", "parent"]],
    ["size", "desc", ["parent", "sibling"]],
  ] as const)("sorts folders by %s %s", (sortBy, order, expected) => {
    const sorted = sortAssetFolders({
      folders: [parent, sibling],
      hierarchy,
      assets: [asset("nested", "child", 20), asset("direct", "sibling", 10)],
      sortState: { sortBy, order },
    });
    expect(sorted.map(({ id }) => id)).toEqual(expected);
  });

  test("searches folders throughout the current subtree", () => {
    const nestedMatch = createAssetFolderFixture({
      id: "nested-match",
      parentId: child.id,
      name: "Product photos",
    });
    const outsideMatch = createAssetFolderFixture({
      id: "outside-match",
      parentId: sibling.id,
      name: "Product exports",
    });
    const searchableFolders = createAssetFoldersFixture(
      parent,
      child,
      sibling,
      nestedMatch,
      outsideMatch
    );

    expect(
      filterAssetFolders({
        folders: searchableFolders,
        hierarchy: createAssetFolderHierarchy(searchableFolders),
        currentFolderId: parent.id,
        searchQuery: "product",
        compatibleAssets: [],
        hideEmptyFolders: false,
      }).map(({ id }) => id)
    ).toEqual([nestedMatch.id]);
  });

  test("hides constrained-picker folders without compatible descendants", () => {
    expect(
      filterAssetFolders({
        folders,
        hierarchy,
        currentFolderId: undefined,
        searchQuery: "",
        compatibleAssets: [asset("compatible", child.id, 20)],
        hideEmptyFolders: true,
      }).map(({ id }) => id)
    ).toEqual([parent.id]);
  });
});
