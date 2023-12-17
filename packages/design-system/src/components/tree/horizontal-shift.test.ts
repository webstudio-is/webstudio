import { describe, test, expect } from "@jest/globals";
import { renderHook, act } from "@testing-library/react-hooks";
import type { Placement } from "../primitives/dnd";
import { useHorizontalShift } from "./horizontal-shift";
import type { ItemDropTarget, ItemId, ItemSelector } from "./item-utils";
import { type Item, findItemById, getItemPath } from "./test-tree-data";

const box1: Item = { canAcceptChildren: true, id: "box1", children: [] };
const box2: Item = { canAcceptChildren: true, id: "box2", children: [] };
const box321: Item = { canAcceptChildren: true, id: "box321", children: [] };
const box32: Item = {
  canAcceptChildren: true,
  children: [box321],
  id: "box32",
};
const box31: Item = { canAcceptChildren: true, id: "box31", children: [] };
const box3: Item = {
  canAcceptChildren: true,
  children: [box31, box32],
  id: "box3",
};
const box4: Item = { canAcceptChildren: true, id: "box4", children: [] };
const heading: Item = {
  canAcceptChildren: false,
  children: [{ canAcceptChildren: false, id: "bold", children: [] }],
  id: "heading",
};
const box511: Item = { canAcceptChildren: true, id: "box511", children: [] };
const box51: Item = {
  canAcceptChildren: true,
  id: "box51",
  children: [box511],
};
const box52: Item = { canAcceptChildren: true, id: "box52", children: [] };
const box5: Item = {
  canAcceptChildren: true,
  id: "box5",
  children: [box51, box52],
};

// root
// | box1
// | box2
// | box3
// | | box31
// | | box32
// | | | box321
// | box4
// | heading
// | | bold
// | box5
// | | box51
// | | | box511
// | | box52
const tree: Item = {
  id: "root",
  canAcceptChildren: true,
  children: [box1, box2, box3, box4, heading, box5],
};

const makePlacementIndicator = (
  type: Placement["type"] = "next-to-child"
): Placement => ({
  parentRect: { width: 0, height: 0, left: 0, top: 0 },
  type,
  direction: "horizontal",
  x: 0,
  y: 100,
  length: 300,
});

const makeDrop = ({
  into,
  after,
}: {
  into: Item;
  after?: Item;
}): ItemDropTarget => ({
  itemSelector: getItemSelector(into.id),
  indexWithinChildren:
    after === undefined ? 0 : into.children.indexOf(after) + 1,
  placement: {
    closestChildIndex: 0,
    indexAdjustment: 0,
    childrenOrientation: { type: "mixed" },
  },
});

const getItemSelector = (itemId: ItemId) => {
  return getItemPath(tree, itemId)
    .reverse()
    .map((item) => item.id);
};

const render = (
  {
    dragItem,
    dropTarget,
    placementIndicator = makePlacementIndicator(),
  }: {
    dragItem: Item | undefined;
    dropTarget: ItemDropTarget | undefined;
    placementIndicator?: Placement;
  },
  shift = -1
) => {
  const { result } = renderHook((props) => useHorizontalShift<Item>(props), {
    initialProps: {
      dragItemSelector:
        dragItem === undefined ? undefined : getItemSelector(dragItem.id),
      dropTarget,
      placementIndicator,
      getIsExpanded: (itemSelector: ItemSelector) =>
        (findItemById(tree, itemSelector[0])?.children.length ?? 0) > 0,
      canAcceptChild: (itemSelector: ItemSelector) =>
        findItemById(tree, itemSelector[0])?.canAcceptChildren ?? false,
      getItemChildren: (itemSelector: ItemSelector) =>
        findItemById(tree, itemSelector[0])?.children ?? [],
      isItemHidden: ([_itemId]: ItemSelector) => false,
    },
  });

  act(() => {
    const [, setHorizontalShift] = result.current;
    setHorizontalShift(shift);
  });

  const [shiftedDroptTarget] = result.current;
  return shiftedDroptTarget;
};

test("if there's no dragItem or dropTarget returns undefined", () => {
  const result = render({
    dragItem: undefined,
    dropTarget: undefined,
  });
  expect(result).toBeUndefined();
});

test("drop target is empty or collapsed", () => {
  const dropTarget = makeDrop({
    into: box2,
  });
  const result = render({
    dragItem: box1,
    dropTarget,
    placementIndicator: makePlacementIndicator("inside-parent"),
  });

  // parent doesn't change
  expect(result?.itemSelector).toEqual(["box2", "root"]);

  // placement line geometry isn't provided
  expect(result?.placement).toBeUndefined();
});

test("placement line coordinates are always adjusted", () => {
  const result = render(
    {
      dragItem: box31,
      dropTarget: makeDrop({ into: box3, after: box32 }),
    },
    0
  );

  // parent doesn't change
  expect(result?.itemSelector).toEqual(["box3", "root"]);

  // placement line is adjusted to account for depth,
  // even though depth didn't change
  expect(result?.placement).toEqual({
    ...makePlacementIndicator(),
    length: 260,
    x: 40,
  });
});

test("shifting is relative to the drag item's depth", () => {
  // same shift and drop target
  const shift = 0;
  const dropTarget = makeDrop({ into: tree, after: box3 });

  // box2's depth is 1, so it's inserted without shifting
  const result1 = render({ dragItem: box2, dropTarget }, shift);
  expect(result1?.itemSelector).toEqual(["root"]);

  // box31's depth is 2, so it's inserted with shifting, to maintain the same depth
  const result2 = render({ dragItem: box31, dropTarget }, shift);
  expect(result2?.itemSelector).toEqual(["box3", "root"]);
  expect(result2?.position).toBe(2);
});

describe("shifting to the left", () => {
  test("if we're already at the root, no shift occurs", () => {
    const result = render(
      { dragItem: box1, dropTarget: makeDrop({ into: tree, after: box2 }) },
      -1
    );
    expect(result?.itemSelector).toEqual(["root"]);
  });

  test("a shifting is possible only when we're at the bottom of the initial drop target", () => {
    const result1 = render(
      { dragItem: box1, dropTarget: makeDrop({ into: box3, after: box31 }) },
      -1
    );
    expect(result1?.itemSelector).toEqual(["box3", "root"]);
  });

  test("when above the drag item, which is at the bottom, the shift is allowed", () => {
    const result = render(
      { dragItem: box32, dropTarget: makeDrop({ into: box3, after: box31 }) },
      -1
    );
    expect(result?.itemSelector).toEqual(["root"]);
    expect(result?.position).toBe(tree.children.indexOf(box3) + 1);
    expect(result?.placement).toEqual({
      ...makePlacementIndicator(),
      x: 24,
      length: 276,
    });
  });

  test("shifting by different ammounts works correctly", () => {
    const args = {
      dragItem: box1,
      dropTarget: makeDrop({ into: box32, after: box321 }),
    };

    const result1 = render(args, 0);
    expect(result1?.itemSelector).toEqual(["root"]);
    expect(result1?.position).toBe(tree.children.indexOf(box3) + 1);
    expect(result1?.placement).toEqual({
      ...makePlacementIndicator(),
      x: 24,
      length: 276,
    });

    const result2 = render(args, 1);
    expect(result2?.itemSelector).toEqual(["box3", "root"]);
    expect(result2?.position).toBe(box3.children.indexOf(box32) + 1);
    expect(result2?.placement).toEqual({
      ...makePlacementIndicator(),
      x: 40,
      length: 260,
    });
  });

  test('the "at the bottom" check is perforamed at every step, dissalowing futher shifting when we\'re no longer at the bottom', () => {
    const result = render(
      {
        dragItem: box1,
        dropTarget: makeDrop({ into: box51, after: box511 }),
      },
      -10
    );
    expect(result?.itemSelector).toEqual(["box5", "root"]);
    expect(result?.position).toBe(box5.children.indexOf(box51) + 1);
  });
});

describe("shifting to the right ", () => {
  test("if there's no expanded item above, no shift occurs", () => {
    const result = render(
      { dragItem: box1, dropTarget: makeDrop({ into: tree, after: box2 }) },
      1
    );
    expect(result?.itemSelector).toEqual(["root"]);
  });

  test("if there's an expanded item above, we shift inside it", () => {
    const args = {
      dragItem: box1,
      dropTarget: makeDrop({ into: tree, after: box3 }),
    };

    const result1 = render(args, 1);
    expect(result1?.itemSelector).toEqual(["box3", "root"]);

    const result2 = render(args, 2);
    expect(result2?.itemSelector).toEqual(["box32", "box3", "root"]);
  });

  test("you cannot move inside drag item by shifting", () => {
    // drag item is right above, no shifting
    const result1 = render(
      { dragItem: box3, dropTarget: makeDrop({ into: tree, after: box3 }) },
      3
    );
    expect(result1?.itemSelector).toEqual(["root"]);

    // drag item is inside the item above
    // we shift into the item above, but not inside the drag item
    const result2 = render(
      { dragItem: box32, dropTarget: makeDrop({ into: tree, after: box3 }) },
      3
    );
    expect(result2?.itemSelector).toEqual(["box3", "root"]);
    expect(result2?.position).toBe(2);
  });

  test("when the item above is the drag item itself, we consider the item above it as a potential target", () => {
    const result = render(
      { dragItem: box4, dropTarget: makeDrop({ into: tree, after: box4 }) },
      1
    );
    expect(result?.itemSelector).toEqual(["box3", "root"]);
    expect(result?.position).toBe(2);
  });

  test("if there's an expanded item above, but it cannot accept shildren, no shift occurs", () => {
    const result = render(
      {
        dragItem: box1,
        dropTarget: makeDrop({ into: tree, after: heading }),
      },
      1
    );
    expect(result?.itemSelector).toEqual(["root"]);
  });
});
