import { describe, test, expect } from "@jest/globals";
import {
  getPlacementBetween,
  getDistanceToRect,
  getArea,
  getPlacementNextTo,
  getPlacementInside,
  getTwoRectsOrientation,
  getRectsOrientation,
  getIndexAdjustment,
} from "./geometry-utils";

describe("getDistanceToRect", () => {
  const rect = {
    top: 100,
    left: 100,
    width: 100,
    height: 100,
  };

  test("inside", () => {
    expect(getDistanceToRect(rect, { x: rect.left + 1, y: rect.top + 1 })).toBe(
      0
    );
  });

  test("near top edge", () => {
    expect(getDistanceToRect(rect, { x: rect.left + 1, y: rect.top - 2 })).toBe(
      2
    );
  });

  test("near bottom edge", () => {
    expect(
      getDistanceToRect(rect, {
        x: rect.left + 1,
        y: rect.top + rect.height + 2,
      })
    ).toBe(2);
  });

  test("near left edge", () => {
    expect(getDistanceToRect(rect, { x: rect.left - 2, y: rect.top + 1 })).toBe(
      2
    );
  });

  test("near right edge", () => {
    expect(
      getDistanceToRect(rect, {
        x: rect.left + rect.width + 2,
        y: rect.top + 1,
      })
    ).toBe(2);
  });

  test("near top left corner", () => {
    expect(
      getDistanceToRect(rect, {
        x: rect.left - 2,
        y: rect.top - 2,
      })
    ).toBe(Math.sqrt(8));
  });

  test("near top right corner", () => {
    expect(
      getDistanceToRect(rect, {
        x: rect.left + rect.width + 2,
        y: rect.top - 2,
      })
    ).toBe(Math.sqrt(8));
  });

  test("near bottom left corner", () => {
    expect(
      getDistanceToRect(rect, {
        x: rect.left - 2,
        y: rect.top + rect.height + 2,
      })
    ).toBe(Math.sqrt(8));
  });

  test("near bottom right corner", () => {
    expect(
      getDistanceToRect(rect, {
        x: rect.left + rect.width + 2,
        y: rect.top + rect.height + 2,
      })
    ).toBe(Math.sqrt(8));
  });
});

describe("getArea", () => {
  const rect = {
    top: 100,
    left: 100,
    width: 100,
    height: 100,
  };
  const threshold = 10;

  test("top", () => {
    expect(
      getArea(
        { x: rect.left + rect.width / 2, y: rect.top + 1 },
        threshold,
        rect
      )
    ).toBe("top");
  });

  test("bottom", () => {
    expect(
      getArea(
        { x: rect.left + rect.width / 2, y: rect.top + rect.height - 1 },
        threshold,
        rect
      )
    ).toBe("bottom");
  });

  test("left", () => {
    expect(
      getArea(
        { x: rect.left + 1, y: rect.top + rect.height / 2 },
        threshold,
        rect
      )
    ).toBe("left");
  });

  test("right", () => {
    expect(
      getArea(
        { x: rect.left + rect.width - 1, y: rect.top + rect.height / 2 },
        threshold,
        rect
      )
    ).toBe("right");
  });

  test("center", () => {
    expect(
      getArea(
        { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        threshold,
        rect
      )
    ).toBe("center");
  });
});

describe("getPlacementBetween", () => {
  const size = { width: 100, height: 100 };
  const parentRect = { top: 0, left: 0, width: 0, height: 0 };

  test.each([
    [
      // [a] | [b]
      parentRect,
      { top: 0, left: 0 },
      { top: 0, left: 200 },
      {
        parentRect,
        type: "between-children",
        direction: "vertical",
        x: 150,
        y: 0,
        length: 100,
      },
    ],

    [
      // [a]
      // ---
      // [b]
      parentRect,
      { top: 0, left: 0 },
      { top: 200, left: 0 },
      {
        parentRect,
        type: "between-children",
        direction: "horizontal",
        x: 0,
        y: 150,
        length: 100,
      },
    ],

    [
      //       [a]
      // [b]
      parentRect,
      { top: 0, left: 600 },
      { top: 200, left: 0 },
      undefined,
    ],

    [
      // [a]
      //
      //     [b]
      parentRect,
      { top: 0, left: 0 },
      { top: 600, left: 200 },
      undefined,
    ],

    // overlaps ...
    [parentRect, { top: 0, left: 0 }, { top: 0, left: 0 }, undefined],
    [parentRect, { top: 0, left: 0 }, { top: 50, left: 50 }, undefined],
    [parentRect, { top: 0, left: 50 }, { top: 50, left: 0 }, undefined],
    [
      parentRect,
      { top: 0, left: 0, width: 200, height: 200 },
      { top: 50, left: 50 },
      undefined,
    ],
  ])("%o + %o", (parentRect, a, b, placement) => {
    expect(
      getPlacementBetween(parentRect, { ...size, ...a }, { ...size, ...b })
    ).toEqual(placement);
    expect(
      getPlacementBetween(parentRect, { ...size, ...b }, { ...size, ...a })
    ).toEqual(placement);
  });
});

describe("getPlacementNextTo", () => {
  describe.each([
    { type: "horizontal", reverse: false },
    { type: "horizontal", reverse: true },
    { type: "vertical", reverse: false },
    { type: "vertical", reverse: true },
    { type: "mixed" },
  ] as const)("childrenOrientation=%o", (childrenOrientation) => {
    describe.each(["forward", "backward"] as const)(
      "direction=%s",
      (direction) => {
        test.each([
          [
            "child smaller than parent",
            { top: 100, left: 100, width: 100, height: 100 },
          ],
          [
            "child almost same as parent",
            { top: 4, left: 4, width: 292, height: 292 },
          ],
          [
            "child same as parent",
            { top: 0, left: 0, width: 300, height: 300 },
          ],
          [
            "child bigger than parent",
            { top: -10, left: -10, width: 310, height: 310 },
          ],
        ])("%s", (_, child) => {
          expect(
            getPlacementNextTo(
              { top: 0, left: 0, width: 300, height: 300 },
              child,
              childrenOrientation,
              direction
            )
          ).toMatchSnapshot();
        });
      }
    );
  });
});

describe("getPlacementInside", () => {
  test.each([
    { type: "horizontal", reverse: false },
    { type: "horizontal", reverse: true },
    { type: "vertical", reverse: false },
    { type: "vertical", reverse: true },
    { type: "mixed" },
  ] as const)("childrenOrientation=%o", (childrenOrientation) => {
    expect(
      getPlacementInside(
        { top: 0, left: 0, width: 100, height: 100 },
        childrenOrientation
      )
    ).toMatchSnapshot();
  });
});

describe("getTwoRectsOrientation", () => {
  test.each([
    [
      "horizontal",
      { top: 0, left: 0, width: 100, height: 100 },
      { top: 0, left: 100, width: 100, height: 100 },
    ],
    [
      "horizontal",
      { top: 10, left: 0, width: 80, height: 80 },
      { top: 0, left: 100, width: 100, height: 100 },
    ],
    [
      "vertical",
      { top: 0, left: 0, width: 100, height: 100 },
      { top: 100, left: 0, width: 100, height: 100 },
    ],
    [
      "vertical",
      { top: 0, left: 10, width: 80, height: 80 },
      { top: 100, left: 0, width: 100, height: 100 },
    ],
  ])("%s %o %o", (type, rectA, rectB) => {
    expect(getTwoRectsOrientation(rectA, rectB)).toEqual({
      reverse: false,
      type,
    });
    expect(getTwoRectsOrientation(rectB, rectA)).toEqual({
      reverse: true,
      type,
    });
  });

  test.each([
    [
      { top: 0, left: 0, width: 100, height: 100 },
      { top: 0, left: 0, width: 100, height: 100 },
    ],
    [
      { top: 10, left: 10, width: 80, height: 80 },
      { top: 0, left: 0, width: 100, height: 100 },
    ],
    [
      { top: 0, left: 0, width: 100, height: 100 },
      { top: 50, left: 50, width: 100, height: 100 },
    ],
    [
      { top: 0, left: 0, width: 100, height: 100 },
      { top: 100, left: 100, width: 100, height: 100 },
    ],
  ])("mixed %o %o", (rectA, rectB) => {
    expect(getTwoRectsOrientation(rectA, rectB)).toEqual({
      type: "mixed",
    });
    expect(getTwoRectsOrientation(rectB, rectA)).toEqual({
      type: "mixed",
    });
  });
});

describe("getRectsOrientation", () => {
  const vertical = [
    { top: 0, left: 100, width: 100, height: 100 },
    { top: 100, left: 100, width: 100, height: 100 },
    { top: 200, left: 100, width: 100, height: 100 },
  ] as const;

  const horizontal = [
    { top: 100, left: 0, width: 100, height: 100 },
    { top: 100, left: 100, width: 100, height: 100 },
    { top: 100, left: 200, width: 100, height: 100 },
  ] as const;

  test("if all reversed, result is reversed", () => {
    expect(
      getRectsOrientation(vertical[2], vertical[1], vertical[0]).reverse
    ).toBe(true);
  });

  test("if only one reversed, result is not reversed", () => {
    expect(
      getRectsOrientation(vertical[0], vertical[1], vertical[0]).reverse
    ).toBe(false);
  });

  test("if all vertical result is vertical", () => {
    expect(
      getRectsOrientation(vertical[0], vertical[1], vertical[2]).type
    ).toBe("vertical");
    expect(getRectsOrientation(undefined, vertical[1], vertical[2]).type).toBe(
      "vertical"
    );
    expect(getRectsOrientation(vertical[0], vertical[1], undefined).type).toBe(
      "vertical"
    );
  });

  test("if all horizontal result is horizontal", () => {
    expect(
      getRectsOrientation(horizontal[0], horizontal[1], horizontal[2]).type
    ).toBe("horizontal");
    expect(
      getRectsOrientation(undefined, horizontal[1], horizontal[2]).type
    ).toBe("horizontal");
    expect(
      getRectsOrientation(horizontal[0], horizontal[1], undefined).type
    ).toBe("horizontal");
  });

  test("if mixed result is mixed", () => {
    expect(
      getRectsOrientation(horizontal[0], vertical[1], vertical[2]).type
    ).toBe("mixed");
  });
});

describe("getIndexAdjustment", () => {
  const rect = { top: 100, left: 100, width: 200, height: 200 };

  describe.each([true, false])("orientation.reverse=%s", (reverse) => {
    describe("orientation.type=vertical", () => {
      test("above", () => {
        expect(
          getIndexAdjustment(
            { x: rect.left + rect.width / 2, y: rect.top - 10 },
            rect,
            { type: "vertical", reverse }
          )
        ).toBe(reverse ? 1 : 0);
      });
      test("below", () => {
        expect(
          getIndexAdjustment(
            {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.width + 10,
            },
            rect,
            { type: "vertical", reverse }
          )
        ).toBe(reverse ? 0 : 1);
      });
      test("inside, above middle", () => {
        expect(
          getIndexAdjustment(
            {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 3,
            },
            rect,
            { type: "vertical", reverse }
          )
        ).toBe(reverse ? 1 : 0);
      });
      test("inside, below middle", () => {
        expect(
          getIndexAdjustment(
            {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height * (2 / 3),
            },
            rect,
            { type: "vertical", reverse }
          )
        ).toBe(reverse ? 0 : 1);
      });
    });
    describe("orientation.type=horizontal", () => {
      test("to the left", () => {
        expect(
          getIndexAdjustment(
            { x: rect.left - 10, y: rect.top + rect.height / 2 },
            rect,
            { type: "horizontal", reverse }
          )
        ).toBe(reverse ? 1 : 0);
      });
      test("to the right", () => {
        expect(
          getIndexAdjustment(
            {
              x: rect.left + rect.width + 10,
              y: rect.top + rect.height / 2,
            },
            rect,
            { type: "horizontal", reverse }
          )
        ).toBe(reverse ? 0 : 1);
      });
      test("inside, to the left of middle", () => {
        expect(
          getIndexAdjustment(
            {
              x: rect.left + rect.width / 3,
              y: rect.top + rect.height / 2,
            },
            rect,
            { type: "horizontal", reverse }
          )
        ).toBe(reverse ? 1 : 0);
      });
      test("inside, to the right of middle", () => {
        expect(
          getIndexAdjustment(
            {
              x: rect.left + rect.width * (2 / 3),
              y: rect.top + rect.height / 2,
            },
            rect,
            { type: "horizontal", reverse }
          )
        ).toBe(reverse ? 0 : 1);
      });
    });
  });
  describe("orientation.type=mixed", () => {
    test.each([
      ["above", rect.left + rect.width / 2, rect.top - 10, 0],
      ["below", rect.left + rect.width / 2, rect.top + rect.height + 10, 1],
      ["to the left", rect.left - 10, rect.top + rect.height / 2, 0],
      [
        "to the right",
        rect.left + rect.width + 10,
        rect.top + rect.height / 2,
        1,
      ],
      [
        "inside, above middle",
        rect.left + rect.width / 2,
        rect.top + rect.height / 3,
        0,
      ],
      [
        "inside, below middle",
        rect.left + rect.width / 2,
        rect.top + rect.height * (2 / 3),
        1,
      ],
      [
        "inside, to the left of middle",
        rect.left + rect.width / 3,
        rect.top + rect.height / 2,
        0,
      ],
      [
        "inside, to the right of middle",
        rect.left + rect.width * (2 / 3),
        rect.top + rect.height / 2,
        1,
      ],
    ])("%s", (_, x, y, expected) => {
      expect(getIndexAdjustment({ x, y }, rect, { type: "mixed" })).toBe(
        expected
      );
    });
  });
});
