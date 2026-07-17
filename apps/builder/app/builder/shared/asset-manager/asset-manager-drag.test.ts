import { expect, test } from "vitest";
import { getAssetManagerDragItems } from "./asset-manager-drag";

test("reads multiselect and legacy single-item drag data", () => {
  expect(
    getAssetManagerDragItems({
      items: [
        { type: "asset", id: "asset" },
        { type: "folder", id: "folder" },
        { type: "invalid", id: "ignored" },
      ],
    })
  ).toEqual([
    { type: "asset", id: "asset" },
    { type: "folder", id: "folder" },
  ]);
  expect(getAssetManagerDragItems({ kind: "asset", id: "asset" })).toEqual([
    { type: "asset", id: "asset" },
  ]);
  expect(
    getAssetManagerDragItems({ kind: "asset-folder", id: "folder" })
  ).toEqual([{ type: "folder", id: "folder" }]);
});
