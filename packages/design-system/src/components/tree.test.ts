import { describe, expect, test } from "vitest";
import { getTreeDropTarget } from "./tree";

type Instruction = Parameters<typeof getTreeDropTarget>[0];

describe("getTreeDropTarget", () => {
  test("maps make-child instructions to child drop targets", () => {
    expect(
      getTreeDropTarget({
        type: "make-child",
        currentLevel: 2,
        indentPerLevel: 16,
      } as Instruction)
    ).toEqual({
      parentLevel: 2,
      afterLevel: 3,
    });
  });

  test("maps reorder-below instructions to sibling drop targets", () => {
    expect(
      getTreeDropTarget({
        type: "reorder-below",
        currentLevel: 2,
        indentPerLevel: 16,
      })
    ).toEqual({
      parentLevel: 1,
      afterLevel: 2,
    });
  });

  test("maps reorder-above instructions to sibling drop targets", () => {
    expect(
      getTreeDropTarget({
        type: "reorder-above",
        currentLevel: 2,
        indentPerLevel: 16,
      })
    ).toEqual({
      parentLevel: 1,
      beforeLevel: 2,
    });
  });

  test("maps reparent instructions to requested parent levels", () => {
    expect(
      getTreeDropTarget({
        type: "reparent",
        currentLevel: 4,
        desiredLevel: 2,
        indentPerLevel: 16,
      })
    ).toEqual({
      parentLevel: 1,
      afterLevel: 2,
    });
  });

  test("ignores missing instructions", () => {
    expect(getTreeDropTarget(null)).toBeUndefined();
  });
});
