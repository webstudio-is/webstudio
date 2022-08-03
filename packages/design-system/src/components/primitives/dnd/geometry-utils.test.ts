import { getPlacementBetween } from "./geometry-utils";

const size = { width: 100, height: 100 };

describe("getPlacementBetween", () => {
  test.each([
    [
      // [a] | [b]
      { top: 0, left: 0 },
      { top: 0, left: 200 },
      { direction: "vertical", x: 150, y: 0, length: 100 },
    ],

    [
      // [a]
      // ---
      // [b]
      { top: 0, left: 0 },
      { top: 200, left: 0 },
      { direction: "horizontal", x: 0, y: 150, length: 100 },
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
