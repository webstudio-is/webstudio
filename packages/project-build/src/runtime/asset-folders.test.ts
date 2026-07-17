import { describe, expect, test } from "vitest";
import {
  createAssetFolderHierarchy,
  type Asset,
  type AssetFolder,
  type AssetFolders,
} from "@webstudio-is/sdk";
import {
  createAssetFolder,
  deleteAssetFolder,
  duplicateAssetFolder,
  updateAssetFolder,
} from "./asset-folders";

const folder = (id: string, parentId?: string, name = id): AssetFolder => ({
  id,
  projectId: "project",
  name,
  parentId,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const folders = (...values: AssetFolder[]): AssetFolders =>
  new Map(values.map((value) => [value.id, value]));

const asset = (id: string, folderId?: string): Asset => ({
  id,
  projectId: "project",
  name: `${id}.pdf`,
  type: "file",
  size: 1,
  format: "pdf",
  createdAt: "2026-01-01T00:00:00.000Z",
  description: null,
  folderId,
  meta: {},
});

describe("asset folders", () => {
  test("creates a nested folder with a trimmed name", () => {
    const result = createAssetFolder(
      { assetFolders: folders(folder("parent")) },
      { name: "  Child  ", parentId: "parent" },
      { projectId: "project", createId: () => "child" }
    );

    expect(result.payload).toEqual([
      {
        namespace: "assetFolders",
        patches: [
          {
            op: "add",
            path: ["child"],
            value: expect.objectContaining({
              id: "child",
              name: "Child",
              parentId: "parent",
              projectId: "project",
            }),
          },
        ],
      },
    ]);
  });

  test("rejects duplicate sibling names case-insensitively", () => {
    expect(() =>
      createAssetFolder(
        { assetFolders: folders(folder("existing", undefined, "Media")) },
        { name: "media" },
        { projectId: "project", createId: () => "new" }
      )
    ).toThrow('A folder named "media" already exists');
  });

  test("rejects moving a folder into a descendant", () => {
    expect(() =>
      updateAssetFolder(
        {
          assetFolders: folders(
            folder("parent"),
            folder("child", "parent"),
            folder("grandchild", "child")
          ),
        },
        { folderId: "parent", values: { parentId: "grandchild" } }
      )
    ).toThrow("one of its descendants");
  });

  test("deleting a folder recursively deletes its folders and assets", () => {
    const result = deleteAssetFolder(
      {
        assetFolders: folders(
          folder("grandparent"),
          folder("deleted", "grandparent"),
          folder("child", "deleted"),
          folder("grandchild", "child")
        ),
        assets: new Map([
          ["direct", asset("direct", "deleted")],
          ["nested", asset("nested", "child")],
          ["preserved", asset("preserved", "grandparent")],
        ]),
      },
      { folderId: "deleted" }
    );

    expect(result.payload).toEqual([
      {
        namespace: "assetFolders",
        patches: [
          { op: "remove", path: ["child"] },
          { op: "remove", path: ["grandchild"] },
          { op: "remove", path: ["deleted"] },
        ],
      },
      {
        namespace: "assets",
        patches: [
          { op: "remove", path: ["direct"] },
          { op: "remove", path: ["nested"] },
        ],
      },
    ]);
  });

  test("duplicates a folder subtree and its assets", () => {
    const ids = ["copy", "child-copy", "asset-copy"];
    const result = duplicateAssetFolder(
      {
        assetFolders: folders(
          folder("source", undefined, "Media"),
          folder("existing-copy", undefined, "Media copy"),
          folder("child", "source", "Photos")
        ),
        assets: new Map([["asset", asset("asset", "child")]]),
      },
      { folderId: "source", parentId: null },
      { projectId: "project", createId: () => ids.shift()! }
    );

    expect(result.result).toEqual({ folderId: "copy" });
    expect(result.payload).toEqual([
      {
        namespace: "assetFolders",
        patches: [
          {
            op: "add",
            path: ["copy"],
            value: expect.objectContaining({
              id: "copy",
              name: "Media copy 2",
              parentId: undefined,
            }),
          },
          {
            op: "add",
            path: ["child-copy"],
            value: expect.objectContaining({
              id: "child-copy",
              name: "Photos",
              parentId: "copy",
            }),
          },
        ],
      },
      {
        namespace: "assets",
        patches: [
          {
            op: "add",
            path: ["asset-copy"],
            value: expect.objectContaining({
              id: "asset-copy",
              filename: "asset copy",
              folderId: "child-copy",
            }),
          },
        ],
      },
    ]);
  });

  test("moves a folder to the root without changing its name", () => {
    const result = updateAssetFolder(
      {
        assetFolders: folders(
          folder("parent"),
          folder("child", "parent", "Child")
        ),
      },
      { folderId: "child", values: { parentId: null } }
    );

    expect(result.payload).toEqual([
      {
        namespace: "assetFolders",
        patches: [{ op: "remove", path: ["child", "parentId"] }],
      },
    ]);
  });

  test("collects all descendants", () => {
    expect(
      createAssetFolderHierarchy(
        folders(
          folder("root"),
          folder("child", "root"),
          folder("grandchild", "child"),
          folder("sibling")
        )
      ).getDescendantIds("root")
    ).toEqual(new Set(["child", "grandchild"]));
  });
});
