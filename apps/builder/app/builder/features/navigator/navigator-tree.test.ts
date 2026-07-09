import { beforeEach, describe, expect, test } from "vitest";
import { blockComponent } from "@webstudio-is/sdk";
import { __testing__ } from "./navigator-tree";
import {
  $allSelectedInstanceSelectors,
  selectInstances,
} from "~/shared/nano-states";
import { $instances } from "~/shared/sync/data-stores";

const {
  commitNavigatorDrop,
  getFocusSelectionSkipCountAfterPointerDown,
  getBuilderDropTarget,
  getNavigatorDragState,
  getNavigatorKeyboardSelectionUpdate,
  getNavigatorSelectionUpdate,
  getNavigatorSiblingSelectionUpdate,
  shouldClearNavigatorMultiSelectionOnEscape,
  shouldSelectOnPointerDown,
} = __testing__;

const createTreeItem = ({
  parentComponent = "Box",
}: { parentComponent?: string } = {}): Parameters<
  typeof getBuilderDropTarget
>[0] => {
  $instances.set(
    new Map([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [],
        },
      ],
      [
        "parent",
        {
          type: "instance",
          id: "parent",
          component: parentComponent,
          children: [],
        },
      ],
      [
        "child",
        {
          type: "instance",
          id: "child",
          component: "Box",
          children: [],
        },
      ],
    ])
  );
  return {
    selector: ["child", "parent", "body"],
    visibleAncestors: [
      {
        selector: ["body"],
        indexWithinChildren: 0,
        component: "Body",
      },
      {
        selector: ["parent", "body"],
        indexWithinChildren: 2,
        component: parentComponent,
      },
      {
        selector: ["child", "parent", "body"],
        indexWithinChildren: 4,
        component: "Box",
      },
    ],
    instance: {
      type: "instance",
      id: "child",
      component: "Box",
      children: [],
    },
    isExpanded: undefined,
    isLastChild: false,
    isHidden: false,
    isReusable: false,
  };
};

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

describe("getBuilderDropTarget", () => {
  test("maps before-level tree drop targets to Builder insert positions", () => {
    expect(
      getBuilderDropTarget(createTreeItem(), {
        parentLevel: 1,
        beforeLevel: 2,
      })
    ).toEqual({
      itemSelector: ["parent", "body"],
      indexWithinChildren: 4,
      placement: {
        closestChildIndex: 4,
        indexAdjustment: 0,
        childrenOrientation: { type: "vertical", reverse: false },
      },
    });
  });

  test("maps after-level tree drop targets to Builder insert positions", () => {
    expect(
      getBuilderDropTarget(createTreeItem(), {
        parentLevel: 1,
        afterLevel: 2,
      })
    ).toEqual({
      itemSelector: ["parent", "body"],
      indexWithinChildren: 5,
      placement: {
        closestChildIndex: 4,
        indexAdjustment: 1,
        childrenOrientation: { type: "vertical", reverse: false },
      },
    });
  });

  test("keeps block template slot reserved when dropping into block components", () => {
    expect(
      getBuilderDropTarget(
        createTreeItem({ parentComponent: blockComponent }),
        {
          parentLevel: 1,
          beforeLevel: 0,
        }
      )
    ).toEqual({
      itemSelector: ["parent", "body"],
      indexWithinChildren: 1,
      placement: {
        closestChildIndex: 1,
        indexAdjustment: 0,
        childrenOrientation: { type: "vertical", reverse: false },
      },
    });
  });

  test("ignores incomplete tree drop targets", () => {
    expect(getBuilderDropTarget(createTreeItem(), undefined)).toBeUndefined();
    expect(
      getBuilderDropTarget(createTreeItem(), {
        parentLevel: 10,
        beforeLevel: 2,
      })
    ).toBeUndefined();
  });
});

describe("Navigator drag/drop helpers", () => {
  test("builds drag state for valid drop targets", () => {
    const item = createTreeItem();
    const draggingItem = createTreeItem();

    expect(
      getNavigatorDragState({
        item,
        draggingItem,
        dropTarget: {
          parentLevel: 1,
          afterLevel: 2,
        },
        canDropTarget: () => true,
      })
    ).toEqual({
      isDragging: true,
      dragPayload: {
        origin: "panel",
        type: "reparent",
        dragInstanceSelector: ["child", "parent", "body"],
      },
      dropTarget: {
        itemSelector: ["parent", "body"],
        indexWithinChildren: 5,
        placement: {
          closestChildIndex: 4,
          indexAdjustment: 1,
          childrenOrientation: { type: "vertical", reverse: false },
        },
      },
    });

    expect(
      getNavigatorDragState({
        item,
        draggingItem,
        dropTarget: {
          parentLevel: 1,
          afterLevel: 2,
        },
        canDropTarget: () => false,
      })
    ).toEqual({
      isDragging: false,
      dropTarget: undefined,
    });
  });

  test("commits Navigator drops through reparent mutation input", () => {
    const calls: unknown[] = [];
    const reparent = ((selector: unknown, input: unknown) => {
      calls.push({ selector, input });
    }) as Parameters<typeof commitNavigatorDrop>[0]["reparent"];

    expect(
      commitNavigatorDrop({
        item: createTreeItem(),
        dropTarget: {
          itemSelector: ["parent", "body"],
          indexWithinChildren: 3,
          placement: {
            closestChildIndex: 2,
            indexAdjustment: 1,
            childrenOrientation: { type: "vertical", reverse: false },
          },
        },
        reparent,
      })
    ).toBe(true);

    expect(calls).toEqual([
      {
        selector: ["child", "parent", "body"],
        input: {
          parentSelector: ["parent", "body"],
          position: 3,
        },
      },
    ]);

    expect(
      commitNavigatorDrop({
        item: createTreeItem(),
        dropTarget: undefined,
        reparent,
      })
    ).toBe(false);
    expect(calls).toHaveLength(1);
  });
});
