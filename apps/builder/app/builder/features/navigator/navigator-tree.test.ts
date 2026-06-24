import { beforeEach, describe, expect, test } from "vitest";
import { __testing__ } from "./navigator-tree";
import {
  $allSelectedInstanceSelectors,
  selectInstances,
} from "~/shared/nano-states";

const {
  getFocusSelectionSkipCountAfterPointerDown,
  getNavigatorKeyboardSelectionUpdate,
  getNavigatorSelectionUpdate,
  getNavigatorSiblingSelectionUpdate,
  shouldClearNavigatorMultiSelectionOnEscape,
  shouldSelectOnPointerDown,
} = __testing__;

describe("getNavigatorSelectionUpdate", () => {
  beforeEach(() => {
    selectInstances([]);
  });

  const flatSelectors = [
    ["body"],
    ["section", "body"],
    ["box", "section", "body"],
    ["heading", "section", "body"],
    ["footer", "body"],
  ];

  test("selects one instance on normal click and updates anchor", () => {
    expect(
      getNavigatorSelectionUpdate({
        selectedSelectors: [["box", "section", "body"]],
        clickedSelector: ["heading", "section", "body"],
        flatSelectors,
        anchorSelector: ["box", "section", "body"],
        isToggle: false,
        isRange: false,
      })
    ).toEqual({
      selectedSelectors: [["heading", "section", "body"]],
      anchorSelector: ["heading", "section", "body"],
    });
  });

  test("toggles clicked instance and updates anchor", () => {
    expect(
      getNavigatorSelectionUpdate({
        selectedSelectors: [["heading", "section", "body"]],
        clickedSelector: ["box", "section", "body"],
        flatSelectors,
        anchorSelector: ["heading", "section", "body"],
        isToggle: true,
        isRange: false,
      })
    ).toEqual({
      selectedSelectors: [
        ["box", "section", "body"],
        ["heading", "section", "body"],
      ],
      anchorSelector: ["box", "section", "body"],
    });

    expect(
      getNavigatorSelectionUpdate({
        selectedSelectors: [
          ["box", "section", "body"],
          ["heading", "section", "body"],
        ],
        clickedSelector: ["box", "section", "body"],
        flatSelectors,
        anchorSelector: ["heading", "section", "body"],
        isToggle: true,
        isRange: false,
      }).selectedSelectors
    ).toEqual([["heading", "section", "body"]]);
  });

  test("treats range click without anchor as normal click", () => {
    expect(
      getNavigatorSelectionUpdate({
        selectedSelectors: [["box", "section", "body"]],
        clickedSelector: ["heading", "section", "body"],
        flatSelectors,
        anchorSelector: undefined,
        isToggle: false,
        isRange: true,
      })
    ).toEqual({
      selectedSelectors: [["heading", "section", "body"]],
      anchorSelector: ["heading", "section", "body"],
    });
  });

  test("selects visible range and keeps unrelated selected instances", () => {
    expect(
      getNavigatorSelectionUpdate({
        selectedSelectors: [["footer", "body"]],
        clickedSelector: ["heading", "section", "body"],
        flatSelectors,
        anchorSelector: ["section", "body"],
        isToggle: false,
        isRange: true,
      })
    ).toEqual({
      selectedSelectors: [
        ["section", "body"],
        ["box", "section", "body"],
        ["heading", "section", "body"],
        ["footer", "body"],
      ],
      anchorSelector: ["heading", "section", "body"],
    });
  });

  test("normalizes range selection through the selection store", () => {
    const nextSelection = getNavigatorSelectionUpdate({
      selectedSelectors: [],
      clickedSelector: ["footer", "body"],
      flatSelectors,
      anchorSelector: ["section", "body"],
      isToggle: false,
      isRange: true,
    });

    selectInstances(nextSelection.selectedSelectors);

    expect($allSelectedInstanceSelectors.get()).toEqual([
      ["section", "body"],
      ["footer", "body"],
    ]);
  });

  test("handles multi-select gestures on pointer down before drag can consume click", () => {
    expect(
      shouldSelectOnPointerDown({
        button: 0,
        metaKey: true,
        ctrlKey: false,
        shiftKey: false,
      })
    ).toBe(true);
    expect(
      shouldSelectOnPointerDown({
        button: 0,
        metaKey: false,
        ctrlKey: true,
        shiftKey: false,
      })
    ).toBe(true);
    expect(
      shouldSelectOnPointerDown({
        button: 0,
        metaKey: false,
        ctrlKey: false,
        shiftKey: true,
      })
    ).toBe(true);

    expect(
      shouldSelectOnPointerDown({
        button: 0,
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
      })
    ).toBe(false);
    expect(
      shouldSelectOnPointerDown({
        button: 2,
        metaKey: true,
        ctrlKey: false,
        shiftKey: false,
      })
    ).toBe(false);
  });

  test("skips focus selection through context menu open and close", () => {
    expect(getFocusSelectionSkipCountAfterPointerDown({ button: 2 })).toBe(2);
    expect(getFocusSelectionSkipCountAfterPointerDown({ button: 0 })).toBe(1);
  });

  test("consumes escape only when navigator has multi-selection to clear", () => {
    expect(
      shouldClearNavigatorMultiSelectionOnEscape({
        key: "Escape",
        selectedSelectors: [
          ["box", "section", "body"],
          ["heading", "section", "body"],
        ],
      })
    ).toBe(true);

    expect(
      shouldClearNavigatorMultiSelectionOnEscape({
        key: "Escape",
        selectedSelectors: [["box", "section", "body"]],
      })
    ).toBe(false);

    expect(
      shouldClearNavigatorMultiSelectionOnEscape({
        key: "Enter",
        selectedSelectors: [
          ["box", "section", "body"],
          ["heading", "section", "body"],
        ],
      })
    ).toBe(false);
  });

  test("extends selection with keyboard in visible order", () => {
    expect(
      getNavigatorKeyboardSelectionUpdate({
        selectedSelectors: [["box", "section", "body"]],
        focusedSelector: ["box", "section", "body"],
        flatSelectors,
        anchorSelector: undefined,
        direction: "next",
      })
    ).toEqual({
      selectedSelectors: [
        ["box", "section", "body"],
        ["heading", "section", "body"],
      ],
      anchorSelector: ["box", "section", "body"],
    });

    expect(
      getNavigatorKeyboardSelectionUpdate({
        selectedSelectors: [
          ["box", "section", "body"],
          ["heading", "section", "body"],
        ],
        focusedSelector: ["heading", "section", "body"],
        flatSelectors,
        anchorSelector: ["box", "section", "body"],
        direction: "next",
      })
    ).toEqual({
      selectedSelectors: [
        ["box", "section", "body"],
        ["heading", "section", "body"],
        ["footer", "body"],
      ],
      anchorSelector: ["box", "section", "body"],
    });
  });

  test("does not change selection when keyboard extension reaches an edge", () => {
    expect(
      getNavigatorKeyboardSelectionUpdate({
        selectedSelectors: [["body"]],
        focusedSelector: ["body"],
        flatSelectors,
        anchorSelector: ["body"],
        direction: "previous",
      })
    ).toBeUndefined();
  });

  test("selects all visible siblings of focused instance", () => {
    expect(
      getNavigatorSiblingSelectionUpdate({
        focusedSelector: ["box", "section", "body"],
        flatSelectors,
      })
    ).toEqual({
      selectedSelectors: [
        ["box", "section", "body"],
        ["heading", "section", "body"],
      ],
      anchorSelector: ["box", "section", "body"],
    });

    expect(
      getNavigatorSiblingSelectionUpdate({
        focusedSelector: ["section", "body"],
        flatSelectors,
      })
    ).toEqual({
      selectedSelectors: [
        ["section", "body"],
        ["footer", "body"],
      ],
      anchorSelector: ["section", "body"],
    });
  });

  test("does not select siblings when focused selector is not selectable", () => {
    expect(
      getNavigatorSiblingSelectionUpdate({
        focusedSelector: ["body"],
        flatSelectors,
      })
    ).toBeUndefined();

    expect(
      getNavigatorSiblingSelectionUpdate({
        focusedSelector: ["missing", "body"],
        flatSelectors,
      })
    ).toBeUndefined();
  });
});
