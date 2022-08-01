import { getPlacementBetween } from "./use-drop";

const size = { width: 100, height: 100 };

describe("getPlacementBetween", () => {
  // [a] | [b]
  test("horizontal rects", () => {
    const placement = getPlacementBetween(
      { top: 0, left: 0, ...size },
      { top: 0, left: 200, ...size }
    );
    expect(placement).toEqual({
      direction: "vertical",
      x: 150,
      y: 0,
      length: 100,
    });
  });

  // [b] | [a]
  test("horizontal rects (reversed)", () => {
    const placement = getPlacementBetween(
      { top: 0, left: 200, ...size },
      { top: 0, left: 0, ...size }
    );
    expect(placement).toEqual({
      direction: "vertical",
      x: 150,
      y: 0,
      length: 100,
    });
  });

  // [a]
  // ---
  // [b]
  test("vertical rects", () => {
    const placement = getPlacementBetween(
      { top: 0, left: 0, ...size },
      { top: 200, left: 0, ...size }
    );
    expect(placement).toEqual({
      direction: "horizontal",
      x: 0,
      y: 150,
      length: 100,
    });
  });

  // [a]
  // ---
  // [b]
  test("vertical rects (reversed)", () => {
    const placement = getPlacementBetween(
      { top: 200, left: 0, ...size },
      { top: 0, left: 0, ...size }
    );
    expect(placement).toEqual({
      direction: "horizontal",
      x: 0,
      y: 150,
      length: 100,
    });
  });

  //         [a]
  // -----------
  // [b]
  test("diagonal, closer by Y", () => {
    const placement = getPlacementBetween(
      { top: 0, left: 600, ...size },
      { top: 200, left: 0, ...size }
    );
    expect(placement).toEqual({
      direction: "horizontal",
      x: 0,
      y: 150,
      length: 700,
    });
  });

  //         [b]
  // -----------
  // [a]
  test("diagonal, closer by Y (reversed)", () => {
    const placement = getPlacementBetween(
      { top: 200, left: 0, ...size },
      { top: 0, left: 600, ...size }
    );
    expect(placement).toEqual({
      direction: "horizontal",
      x: 0,
      y: 150,
      length: 700,
    });
  });

  // [a] |
  //     |
  //     |
  //     | [b]
  test("diagonal, closer by X", () => {
    const placement = getPlacementBetween(
      { top: 0, left: 0, ...size },
      { top: 600, left: 200, ...size }
    );
    expect(placement).toEqual({
      direction: "vertical",
      x: 150,
      y: 0,
      length: 700,
    });
  });

  // [b] |
  //     |
  //     |
  //     | [a]
  test("diagonal, closer by X (reversed)", () => {
    const placement = getPlacementBetween(
      { top: 600, left: 200, ...size },
      { top: 0, left: 0, ...size }
    );
    expect(placement).toEqual({
      direction: "vertical",
      x: 150,
      y: 0,
      length: 700,
    });
  });

  test.each([
    [
      { top: 0, left: 0 },
      { top: 0, left: 0 },
    ],
    [
      { top: 0, left: 0 },
      { top: 50, left: 50 },
    ],
    [
      { top: 50, left: 50 },
      { top: 0, left: 0 },
    ],
    [
      { top: 0, left: 50 },
      { top: 50, left: 0 },
    ],
    [
      { top: 50, left: 0 },
      { top: 0, left: 50 },
    ],
    [
      { top: 0, left: 0, width: 200, height: 200 },
      { top: 50, left: 50 },
    ],
    [
      { top: 50, left: 50 },
      { top: 0, left: 0, width: 200, height: 200 },
    ],
  ])("overlap %o %o", (a, b) => {
    const placement = getPlacementBetween({ ...size, ...a }, { ...size, ...b });
    expect(placement).toBeUndefined();
  });
});
