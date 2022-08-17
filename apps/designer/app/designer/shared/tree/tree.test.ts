import { renderHook, act } from "@testing-library/react-hooks";
import { DropTarget, Placement } from "@webstudio-is/design-system";
import { Instance } from "@webstudio-is/react-sdk";
import { createInstance } from "~/shared/tree-utils";
import { useHorizontalShift } from "./tree";

describe("useHorizontalShift", () => {
  const box1 = createInstance({ component: "Box", id: "box1" });
  const box2 = createInstance({ component: "Box", id: "box2" });
  const box321 = createInstance({ component: "Box", id: "box321" });
  const box32 = createInstance({
    component: "Box",
    children: [box321],
    id: "box32",
  });
  const box31 = createInstance({ component: "Box", id: "box31" });
  const box3 = createInstance({
    component: "Box",
    children: [box31, box32],
    id: "box3",
  });
  const box4 = createInstance({ component: "Box", id: "box4" });
  const heading = createInstance({
    component: "Heading",
    children: [createInstance({ component: "Bold" })],
    id: "heading",
  });
  const box511 = createInstance({ component: "Box", id: "box511" });
  const box51 = createInstance({
    component: "Box",
    id: "box51",
    children: [box511],
  });
  const box52 = createInstance({ component: "Box", id: "box52" });
  const box5 = createInstance({
    component: "Box",
    id: "box5",
    children: [box51, box52],
  });

  // Body
  // | Box (box1)
  // | Box (box2)
  // | Box (box3)
  // | | Box (box31)
  // | | Box (box32)
  // | | | Box (box321)
  // | Box (box4)
  // | Heading (heading)
  // | | Bold
  // | Box (box5)
  // | | Box (box51)
  // | | | Box (box511)
  // | | Box (box52)
  const tree = createInstance({
    id: "root",
    component: "Body",
    children: [box1, box2, box3, box4, heading, box5],
  });

  const makePlacement = (
    type: Placement["type"] = "next-to-child"
  ): Placement => ({
    type,
    direction: "horizontal",
    x: 0,
    y: 100,
    length: 300,
  });

  const makeDrop = ({
    into,
    after,
    placement = makePlacement(),
  }: {
    into: Instance;
    after?: Instance;
    placement?: Placement;
  }): DropTarget<Instance> => ({
    element: null as unknown as HTMLElement, // element is not used
    data: into,
    rect: {
      top: Math.random(),
      left: Math.random(),
      width: Math.random(),
      height: Math.random(),
    } as DOMRect,
    indexWithinChildren:
      after === undefined ? 0 : into.children.indexOf(after) + 1,
    placement,
  });

  const render = (
    {
      dragItem,
      dropTarget,
    }: {
      dragItem: Instance | undefined;
      dropTarget: DropTarget<Instance> | undefined;
    },
    shift = -1
  ) => {
    const { result } = renderHook(useHorizontalShift, {
      initialProps: {
        dragItem,
        dropTarget,
        root: tree,
        getIsExpanded: (instance) => instance.children.length > 0,
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
      placement: makePlacement("inside-parent"),
    });
    const result = render({ dragItem: box1, dropTarget });

    // parent doesn't change
    expect(result?.instance.id).toBe(box2.id);

    // placement is the original rect
    expect(result?.placement).toEqual({
      type: "rect",
      rect: dropTarget.rect,
    });
  });

  test("placement line coordinates are always adjusted", () => {
    const result = render(
      { dragItem: box31, dropTarget: makeDrop({ into: box3, after: box32 }) },
      0
    );

    // parent doesn't change
    expect(result?.instance.id).toBe(box3.id);

    // placement line is adjusted to account for depth,
    // even though depth didn't change
    expect(result?.placement).toEqual({
      type: "line",
      placement: { ...makePlacement(), length: 260, x: 40 },
    });
  });

  test("shifting is relative to the drag item's depth", () => {
    // same shift and drop target
    const shift = 0;
    const dropTarget = makeDrop({ into: tree, after: box3 });

    // box2's depth is 1, so it's inserted without shifting
    const result1 = render({ dragItem: box2, dropTarget }, shift);
    expect(result1?.instance.id).toBe(tree.id);

    // box31's depth is 2, so it's inserted with shifting, to maintain the same depth
    const result2 = render({ dragItem: box31, dropTarget }, shift);
    expect(result2?.instance.id).toBe(box3.id);
    expect(result2?.position).toBe("end");
  });

  describe("shifting to the left", () => {
    test("if we're already at the root, no shift occurs", () => {
      const result = render(
        { dragItem: box1, dropTarget: makeDrop({ into: tree, after: box2 }) },
        -1
      );
      expect(result?.instance.id).toBe(tree.id);
    });

    test("a shifting is possible only when we're at the bottom of the initial drop target", () => {
      const result1 = render(
        { dragItem: box1, dropTarget: makeDrop({ into: box3, after: box31 }) },
        -1
      );
      expect(result1?.instance.id).toBe(box3.id);
    });

    test("when above the drag item, which is at the bottom, the shift is allowed", () => {
      const result = render(
        { dragItem: box32, dropTarget: makeDrop({ into: box3, after: box31 }) },
        -1
      );
      expect(result?.instance.id).toBe(tree.id);
      expect(result?.position).toBe(tree.children.indexOf(box3) + 1);
      expect(result?.placement).toEqual({
        type: "line",
        placement: { ...makePlacement(), x: 24, length: 276 },
      });
    });

    test("shifting by different ammounts works correctly", () => {
      const args = {
        dragItem: box1,
        dropTarget: makeDrop({ into: box32, after: box321 }),
      };

      const result1 = render(args, 0);
      expect(result1?.instance.id).toBe(tree.id);
      expect(result1?.position).toBe(tree.children.indexOf(box3) + 1);
      expect(result1?.placement).toEqual({
        type: "line",
        placement: { ...makePlacement(), x: 24, length: 276 },
      });

      const result2 = render(args, 1);
      expect(result2?.instance.id).toBe(box3.id);
      expect(result2?.position).toBe(box3.children.indexOf(box32) + 1);
      expect(result2?.placement).toEqual({
        type: "line",
        placement: { ...makePlacement(), x: 40, length: 260 },
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
      expect(result?.instance.id).toBe(box5.id);
      expect(result?.position).toBe(box5.children.indexOf(box51) + 1);
    });
  });

  describe("shifting to the right ", () => {
    test("if there's no expanded item above, no shift occurs", () => {
      const result = render(
        { dragItem: box1, dropTarget: makeDrop({ into: tree, after: box2 }) },
        1
      );
      expect(result?.instance.id).toBe(tree.id);
    });

    test("if there's an expanded item above, we shift inside it", () => {
      const args = {
        dragItem: box1,
        dropTarget: makeDrop({ into: tree, after: box3 }),
      };

      const result1 = render(args, 1);
      expect(result1?.instance.id).toBe(box3.id);

      const result2 = render(args, 2);
      expect(result2?.instance.id).toBe(box32.id);
    });

    test("you cannot move inside drag item by shifting", () => {
      // drag item is right above, no shifting
      const result1 = render(
        { dragItem: box3, dropTarget: makeDrop({ into: tree, after: box3 }) },
        3
      );
      expect(result1?.instance.id).toBe(tree.id);

      // drag item is inside the item above
      // we shift into the item above, but not inside the drag item
      const result2 = render(
        { dragItem: box32, dropTarget: makeDrop({ into: tree, after: box3 }) },
        3
      );
      expect(result2?.instance.id).toBe(box3.id);
      expect(result2?.position).toBe("end");
    });

    test("when the item above is the drag item itself, we consider the item above it as a potential target", () => {
      const result = render(
        { dragItem: box4, dropTarget: makeDrop({ into: tree, after: box4 }) },
        1
      );
      expect(result?.instance.id).toBe(box3.id);
      expect(result?.position).toBe("end");
    });

    test("if there's an expanded item above, but it cannot accept shildren, no shift occurs", () => {
      const result = render(
        {
          dragItem: box1,
          dropTarget: makeDrop({ into: tree, after: heading }),
        },
        1
      );
      expect(result?.instance.id).toBe(tree.id);
    });
  });
});
