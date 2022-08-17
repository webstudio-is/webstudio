import { renderHook, act } from "@testing-library/react-hooks";
import { DropTarget, Placement } from "@webstudio-is/design-system";
import { Instance } from "@webstudio-is/react-sdk";
import { createInstance } from "~/shared/tree-utils";
import { useHorizontalShift } from "./tree";

describe("useHorizontalShift", () => {
  const box1 = createInstance({ component: "Box" });
  const box2 = createInstance({ component: "Box" });

  const tree = createInstance({
    component: "Box",
    children: [box1, box2],
  });

  const makeDropTarget = (
    instance: Instance,
    indexWithinChildren: number,
    placement: Placement
  ): DropTarget<Instance> => ({
    element: null as unknown as HTMLElement, // element is not used
    data: instance,
    rect: {
      top: Math.random(),
      left: Math.random(),
      width: Math.random(),
      height: Math.random(),
    } as DOMRect,
    indexWithinChildren,
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
        getIsExpanded: () => true,
      },
    });

    act(() => {
      const [, setHorizontalShift] = result.current;
      setHorizontalShift(shift);
    });

    const [shiftedDropTarget] = result.current;

    return shiftedDropTarget;
  };

  test("if there's no dragItem or dropTarget returns undefined", () => {
    const shiftedDropTarget = render({
      dragItem: undefined,
      dropTarget: undefined,
    });
    expect(shiftedDropTarget).toBeUndefined();
  });

  test("drop target is empty or collapsed", () => {
    const dropTarget = makeDropTarget(box2, 0, {
      type: "inside-parent",
      direction: "horizontal",
      x: 0,
      y: 0,
      length: 0,
    });

    const shiftedDropTarget = render({ dragItem: box1, dropTarget });

    // parent doesn't change
    expect(shiftedDropTarget?.instance).toEqual(box2);

    // placement is the original rect
    expect(shiftedDropTarget?.placement).toEqual({
      type: "rect",
      rect: dropTarget.rect,
    });
  });
});
