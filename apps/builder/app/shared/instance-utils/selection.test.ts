import { describe, expect, test } from "vitest";
import { getContextMenuSelectedInstanceSelectors } from "./selection";

describe("getContextMenuSelectedInstanceSelectors", () => {
  test("preserves selected set when context menu opens on a selected instance", () => {
    const selectedSelectors = [
      ["box", "section", "body"],
      ["heading", "section", "body"],
    ];

    expect(
      getContextMenuSelectedInstanceSelectors({
        selectedSelectors,
        clickedSelector: ["heading", "section", "body"],
      })
    ).toBe(selectedSelectors);
  });

  test("selects only the clicked instance when context menu opens on an unselected instance", () => {
    expect(
      getContextMenuSelectedInstanceSelectors({
        selectedSelectors: [
          ["box", "section", "body"],
          ["heading", "section", "body"],
        ],
        clickedSelector: ["footer", "body"],
      })
    ).toEqual([["footer", "body"]]);
  });
});
