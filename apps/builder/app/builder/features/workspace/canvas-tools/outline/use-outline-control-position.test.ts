import { describe, expect, test } from "vitest";
import { getOutlineControlPosition } from "./use-outline-control-position";

describe("getOutlineControlPosition", () => {
  test("positions above when the control fits", () => {
    expect(
      getOutlineControlPosition({
        controlHeight: 20,
        instanceRect: { top: 20, height: 100, left: 0, width: 100 },
      })
    ).toBe("top");
  });

  test("positions below a short instance when the control does not fit", () => {
    expect(
      getOutlineControlPosition({
        controlHeight: 20,
        instanceRect: { top: 19, height: 100, left: 0, width: 100 },
      })
    ).toBe("bottom");
  });

  test("positions inside a tall instance when the control does not fit", () => {
    expect(
      getOutlineControlPosition({
        controlHeight: 20,
        instanceRect: { top: 19, height: 250, left: 0, width: 100 },
      })
    ).toBe("inside");
  });
});
