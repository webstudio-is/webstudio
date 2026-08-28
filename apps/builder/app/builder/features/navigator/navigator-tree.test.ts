import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  blockBodyComponent,
  blockComponent,
  elementComponent,
} from "@webstudio-is/sdk";
import { $flatTree, __testing__ } from "./navigator-tree";
import {
  $allSelectedInstanceSelectors,
  $builderMode,
  $selectedPageId,
  selectInstances,
} from "~/shared/nano-states";
import { $instances, $pages } from "~/shared/sync/data-stores";
import { $externalContentRoots } from "~/shared/external-content-mutations";

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

test("shows connected Content Block instances in Content mode", () => {
  $pages.set({
    homePageId: "home",
    rootFolderId: "root",
    pages: new Map([
      [
        "home",
        {
          id: "home",
          name: "Home",
          path: "",
          title: "Home",
          meta: {},
          rootInstanceId: "body",
        },
      ],
    ]),
    folders: new Map([
      ["root", { id: "root", name: "Root", slug: "", children: ["home"] }],
    ]),
  });
  $instances.set(
    new Map([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [{ type: "id", value: "block" }],
        },
      ],
      [
        "block",
        {
          type: "instance",
          id: "block",
          component: blockComponent,
          children: [{ type: "id", value: "heading" }],
        },
      ],
      [
        "heading",
        {
          type: "instance",
          id: "heading",
          component: elementComponent,
          tag: "h1",
          children: [{ type: "text", value: "MDX heading" }],
        },
      ],
    ])
  );
  $selectedPageId.set("home");
  $builderMode.set("content");
  expect($flatTree.get().map(({ instance }) => instance.id)).toEqual([
    "block",
    "heading",
  ]);
});

test("shows the scoped Content Block occurrence in Content mode", () => {
  $pages.set({
    homePageId: "home",
    rootFolderId: "root",
    pages: new Map([
      [
        "home",
        {
          id: "home",
          name: "Home",
          path: "",
          title: "Home",
          meta: {},
          rootInstanceId: "body",
        },
      ],
    ]),
    folders: new Map([
      ["root", { id: "root", name: "Root", slug: "", children: ["home"] }],
    ]),
  });
  $instances.set(
    new Map([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [{ type: "id", value: "block" }],
        },
      ],
      [
        "block",
        {
          type: "instance",
          id: "block",
          component: blockComponent,
          children: [{ type: "id", value: "content" }],
        },
      ],
      [
        "content",
        {
          type: "instance",
          id: "content",
          component: blockBodyComponent,
          children: [],
        },
      ],
      [
        "scoped-block",
        {
          type: "instance",
          id: "scoped-block",
          component: blockComponent,
          children: [{ type: "id", value: "content" }],
        },
      ],
      [
        "scoped-content",
        {
          type: "instance",
          id: "scoped-content",
          component: blockBodyComponent,
          children: [{ type: "id", value: "scoped-heading" }],
        },
      ],
      [
        "scoped-heading",
        {
          type: "instance",
          id: "scoped-heading",
          component: elementComponent,
          tag: "h1",
          children: [{ type: "text", value: "Scoped MDX heading" }],
        },
      ],
    ])
  );
  $selectedPageId.set("home");
  $builderMode.set("content");
  $externalContentRoots.set(
    new Map([
      [
        "root",
        {
          sourceBlockInstanceId: "block",
          sourceRenderScope: '["block","body"]',
          blockInstanceId: "scoped-block",
          sourceContentInstanceId: "content",
          contentInstanceId: "scoped-content",
          renderScope: '["scoped-block","body"]',
          instanceIds: new Set(["scoped-heading"]),
          mutationRevision: 0,
        },
      ],
    ])
  );

  expect($flatTree.get().map(({ instance }) => instance.id)).toEqual([
    "scoped-block",
    "scoped-content",
  ]);
});

afterEach(() => {
  $builderMode.set("design");
  $selectedPageId.set(undefined);
  $pages.set(undefined);
  $instances.set(new Map());
  $externalContentRoots.set(new Map());
});

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
