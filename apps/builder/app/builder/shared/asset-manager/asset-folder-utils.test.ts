import { describe, expect, test } from "vitest";
import type { Asset, AssetFolder } from "@webstudio-is/sdk";
import { formatAssetFolderPath, sortAssetFolders } from "./asset-folder-utils";

const folder = (
  id: string,
  parentId?: string,
  createdAt = "2026-01-01T00:00:00.000Z"
): AssetFolder => ({ id, projectId: "project", name: id, parentId, createdAt });

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
  const folders = new Map(
    [parent, child, sibling].map((item) => [item.id, item])
  );

  test("formats a full breadcrumb path", () => {
    expect(formatAssetFolderPath(folders, "child")).toBe(
      "Root / parent / child"
    );
    expect(formatAssetFolderPath(folders, undefined)).toBe("No folder");
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
      allFolders: folders,
      assets: [asset("nested", "child", 20), asset("direct", "sibling", 10)],
      sortState: { sortBy, order },
    });
    expect(sorted.map(({ id }) => id)).toEqual(expected);
  });
});
