import { describe, expect, test } from "vitest";
import {
  addAssetManagerSelection,
  createAssetManagerSelectionRect,
  doAssetManagerSelectionRectsIntersect,
  getAdjacentAssetManagerSelection,
  getAssetManagerSelectionRange,
  includesAssetManagerSelection,
  toggleAssetManagerSelection,
  type AssetManagerSelection,
} from "./asset-manager-selection";

const items: AssetManagerSelection[] = [
  { type: "folder", id: "folder-1" },
  { type: "folder", id: "folder-2" },
  { type: "asset", id: "asset-1" },
  { type: "asset", id: "asset-2" },
];

describe("Asset Manager multiselect", () => {
  test("normalizes marquee coordinates and detects intersecting thumbnails", () => {
    const selectionRect = createAssetManagerSelectionRect(
      { x: 100, y: 80 },
      { x: 20, y: 10 }
    );
    expect(selectionRect).toEqual({
      left: 20,
      top: 10,
      right: 100,
      bottom: 80,
    });
    expect(
      doAssetManagerSelectionRectsIntersect(selectionRect, {
        left: 90,
        top: 70,
        right: 120,
        bottom: 100,
      })
    ).toBe(true);
    expect(
      doAssetManagerSelectionRectsIntersect(selectionRect, {
        left: 101,
        top: 10,
        right: 120,
        bottom: 30,
      })
    ).toBe(false);
  });

  test("builds forward and backward ranges in displayed order", () => {
    expect(getAssetManagerSelectionRange(items, items[0]!, items[2]!)).toEqual(
      items.slice(0, 3)
    );
    expect(getAssetManagerSelectionRange(items, items[3]!, items[1]!)).toEqual(
      items.slice(1, 4)
    );
  });

  test("falls back to the target when the anchor is no longer visible", () => {
    expect(
      getAssetManagerSelectionRange(
        items,
        { type: "folder", id: "missing" },
        items[2]!
      )
    ).toEqual([items[2]]);
  });

  test("toggles non-contiguous items without duplicating identities", () => {
    const selected = [items[0]!, items[2]!];
    expect(toggleAssetManagerSelection(selected, items[2]!)).toEqual([
      items[0],
    ]);
    expect(toggleAssetManagerSelection(selected, items[3]!)).toEqual([
      items[0],
      items[2],
      items[3],
    ]);
    expect(addAssetManagerSelection(selected, items[2]!)).toEqual(selected);
    expect(includesAssetManagerSelection(selected, items[2]!)).toBe(true);
  });

  test("finds adjacent items without wrapping at collection boundaries", () => {
    expect(
      getAdjacentAssetManagerSelection({
        items,
        current: items[1]!,
        direction: "previous",
      })
    ).toEqual(items[0]);
    expect(
      getAdjacentAssetManagerSelection({
        items,
        current: items[3]!,
        direction: "next",
      })
    ).toBeUndefined();
  });
});
