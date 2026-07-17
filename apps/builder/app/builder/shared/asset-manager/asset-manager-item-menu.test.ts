import { expect, test, vi } from "vitest";
import { getAssetManagerItemMenuItems } from "./asset-manager-item-menu";

test("uses one ordered command model for context and dropdown menus", () => {
  const action = vi.fn();
  const items = getAssetManagerItemMenuItems({
    open: action,
    settings: action,
    createFolder: action,
    upload: action,
    cut: action,
    copy: action,
    paste: action,
    duplicate: action,
    move: action,
    download: action,
    replace: action,
    deleteUnusedAssets: action,
    delete: action,
  });

  expect(items.map(({ name }) => name)).toEqual([
    "createFolder",
    "upload",
    "open",
    "settings",
    "cut",
    "copy",
    "paste",
    "duplicate",
    "move",
    "download",
    "replace",
    "deleteUnusedAssets",
    "delete",
  ]);
  expect(items.find(({ name }) => name === "delete")).toMatchObject({
    destructive: true,
    separatorBefore: true,
  });
  expect(items.find(({ name }) => name === "deleteUnusedAssets")).toMatchObject(
    { separatorBefore: true }
  );
  expect(
    Object.fromEntries(
      items
        .filter(({ shortcut }) => shortcut !== undefined)
        .map(({ name, shortcut }) => [name, shortcut])
    )
  ).toEqual({
    cut: ["meta", "x"],
    copy: ["meta", "c"],
    paste: ["meta", "v"],
    duplicate: ["meta", "d"],
    delete: ["backspace"],
  });
});

test("orders panel actions independently of unavailable item actions", () => {
  const action = vi.fn();
  const items = getAssetManagerItemMenuItems({
    createFolder: action,
    upload: action,
    paste: action,
    deleteUnusedAssets: action,
  });

  expect(items.map(({ name }) => name)).toEqual([
    "createFolder",
    "upload",
    "paste",
    "deleteUnusedAssets",
  ]);
});

test("keeps unavailable panel actions visible but disabled", () => {
  const action = vi.fn();
  const items = getAssetManagerItemMenuItems(
    { paste: action },
    { disabledActions: new Set(["paste"]) }
  );

  expect(items).toMatchObject([{ name: "paste", disabled: true }]);
});
