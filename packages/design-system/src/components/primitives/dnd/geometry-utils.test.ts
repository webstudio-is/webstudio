import {
  getPlacementBetween,
  getDistanceToRect,
  getArea,
  getPlacementNextTo,
  getPlacementInside,
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

  test.each([
    [
      // [a] | [b]
      { top: 0, left: 0 },
      { top: 0, left: 200 },
      {
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
      { top: 0, left: 0 },
      { top: 200, left: 0 },
      {
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
      { top: 0, left: 600 },
      { top: 200, left: 0 },
      undefined,
    ],

    [
      // [a]
      //
      //     [b]
      { top: 0, left: 0 },
      { top: 600, left: 200 },
      undefined,
    ],

    // overlaps ...
    [{ top: 0, left: 0 }, { top: 0, left: 0 }, undefined],
    [{ top: 0, left: 0 }, { top: 50, left: 50 }, undefined],
    [{ top: 0, left: 50 }, { top: 50, left: 0 }, undefined],
    [
      { top: 0, left: 0, width: 200, height: 200 },
      { top: 50, left: 50 },
      undefined,
    ],
  ])("%o + %o", (a, b, placement) => {
    expect(getPlacementBetween({ ...size, ...a }, { ...size, ...b })).toEqual(
      placement
    );
    expect(getPlacementBetween({ ...size, ...b }, { ...size, ...a })).toEqual(
      placement
    );
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
