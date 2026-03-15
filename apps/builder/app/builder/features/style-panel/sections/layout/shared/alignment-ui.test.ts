import { describe, test, expect } from "vitest";
import { shouldHideDot } from "./alignment-ui";

const call = (overrides: Partial<Parameters<typeof shouldHideDot>[0]> = {}) =>
  shouldHideDot({
    x: 0,
    y: 0,
    justifyContent: "start",
    alignItems: "start",
    isColumnDirection: false,
    itemStretchWidth: false,
    itemStretchHeight: false,
    ...overrides,
  });

describe("shouldHideDot", () => {
  describe("row direction, non-stretched align-items", () => {
    test("align-items: start hides dots only at y=0", () => {
      expect(
        call({ alignItems: "start", justifyContent: "start", x: 0, y: 0 })
      ).toBe(true);
      expect(
        call({ alignItems: "start", justifyContent: "start", x: 0, y: 1 })
      ).toBe(false);
      expect(
        call({ alignItems: "start", justifyContent: "start", x: 0, y: 2 })
      ).toBe(false);
    });

    test("align-items: center hides dots only at y=1", () => {
      expect(
        call({ alignItems: "center", justifyContent: "start", x: 0, y: 0 })
      ).toBe(false);
      expect(
        call({ alignItems: "center", justifyContent: "start", x: 0, y: 1 })
      ).toBe(true);
      expect(
        call({ alignItems: "center", justifyContent: "start", x: 0, y: 2 })
      ).toBe(false);
    });

    test("align-items: end hides dots only at y=2", () => {
      expect(
        call({ alignItems: "end", justifyContent: "start", x: 0, y: 0 })
      ).toBe(false);
      expect(
        call({ alignItems: "end", justifyContent: "start", x: 0, y: 2 })
      ).toBe(true);
    });

    test("align-items: baseline hides dots only at y=0", () => {
      expect(
        call({ alignItems: "baseline", justifyContent: "start", x: 0, y: 0 })
      ).toBe(true);
      expect(
        call({ alignItems: "baseline", justifyContent: "start", x: 0, y: 1 })
      ).toBe(false);
    });
  });

  describe("row direction, stretched cross-axis", () => {
    // CSS align-items: stretch/normal stretches bars to full height
    test.each(["stretch", "normal"])(
      "align-items: %s hides at all y positions",
      (ai) => {
        expect(
          call({ alignItems: ai, justifyContent: "start", x: 0, y: 0 })
        ).toBe(true);
        expect(
          call({ alignItems: ai, justifyContent: "start", x: 0, y: 1 })
        ).toBe(true);
        expect(
          call({ alignItems: ai, justifyContent: "start", x: 0, y: 2 })
        ).toBe(true);
        // but only at matching main-axis position
        expect(
          call({ alignItems: ai, justifyContent: "start", x: 1, y: 0 })
        ).toBe(false);
      }
    );

    // Explicit itemStretchHeight has same effect
    test("itemStretchHeight=true hides at all y positions", () => {
      expect(
        call({
          alignItems: "start",
          itemStretchHeight: true,
          justifyContent: "center",
          x: 1,
          y: 0,
        })
      ).toBe(true);
      expect(
        call({
          alignItems: "start",
          itemStretchHeight: true,
          justifyContent: "center",
          x: 1,
          y: 2,
        })
      ).toBe(true);
      expect(
        call({
          alignItems: "start",
          itemStretchHeight: true,
          justifyContent: "center",
          x: 0,
          y: 0,
        })
      ).toBe(false);
    });
  });

  describe("row direction, main-axis positions", () => {
    const stretched = { alignItems: "stretch" };

    test("justify-content: normal/start hides at x=0", () => {
      expect(call({ ...stretched, justifyContent: "normal", x: 0 })).toBe(true);
      expect(call({ ...stretched, justifyContent: "start", x: 0 })).toBe(true);
      expect(call({ ...stretched, justifyContent: "start", x: 1 })).toBe(false);
      expect(call({ ...stretched, justifyContent: "start", x: 2 })).toBe(false);
    });

    test("justify-content: center hides at x=1", () => {
      expect(call({ ...stretched, justifyContent: "center", x: 1 })).toBe(true);
      expect(call({ ...stretched, justifyContent: "center", x: 0 })).toBe(
        false
      );
    });

    test("justify-content: end hides at x=2", () => {
      expect(call({ ...stretched, justifyContent: "end", x: 2 })).toBe(true);
      expect(call({ ...stretched, justifyContent: "end", x: 1 })).toBe(false);
    });

    test("justify-content: space-between hides at all x positions", () => {
      expect(
        call({ ...stretched, justifyContent: "space-between", x: 0 })
      ).toBe(true);
      expect(
        call({ ...stretched, justifyContent: "space-between", x: 1 })
      ).toBe(true);
      expect(
        call({ ...stretched, justifyContent: "space-between", x: 2 })
      ).toBe(true);
    });

    test("justify-content: space-around hides no dots", () => {
      expect(call({ ...stretched, justifyContent: "space-around", x: 0 })).toBe(
        false
      );
      expect(call({ ...stretched, justifyContent: "space-around", x: 1 })).toBe(
        false
      );
      expect(call({ ...stretched, justifyContent: "space-around", x: 2 })).toBe(
        false
      );
    });
  });

  describe("row direction, intersection check", () => {
    test("align-items: start + justify-content: space-between hides row 0 only", () => {
      expect(
        call({
          alignItems: "start",
          justifyContent: "space-between",
          x: 0,
          y: 0,
        })
      ).toBe(true);
      expect(
        call({
          alignItems: "start",
          justifyContent: "space-between",
          x: 1,
          y: 0,
        })
      ).toBe(true);
      expect(
        call({
          alignItems: "start",
          justifyContent: "space-between",
          x: 2,
          y: 0,
        })
      ).toBe(true);
      expect(
        call({
          alignItems: "start",
          justifyContent: "space-between",
          x: 0,
          y: 1,
        })
      ).toBe(false);
      expect(
        call({
          alignItems: "start",
          justifyContent: "space-between",
          x: 2,
          y: 2,
        })
      ).toBe(false);
    });

    test("align-items: end + justify-content: center hides only (1,2)", () => {
      expect(
        call({ alignItems: "end", justifyContent: "center", x: 1, y: 2 })
      ).toBe(true);
      expect(
        call({ alignItems: "end", justifyContent: "center", x: 0, y: 2 })
      ).toBe(false);
      expect(
        call({ alignItems: "end", justifyContent: "center", x: 1, y: 0 })
      ).toBe(false);
    });
  });

  describe("column direction", () => {
    const col = { isColumnDirection: true };

    test("x maps to justify-content (main), y maps to align-items (cross) — same as row", () => {
      // align-items: start → cross match at y=0
      // justify-content: start → main match at x=0
      expect(
        call({
          ...col,
          alignItems: "start",
          justifyContent: "start",
          x: 0,
          y: 0,
        })
      ).toBe(true);
      expect(
        call({
          ...col,
          alignItems: "start",
          justifyContent: "start",
          x: 1,
          y: 0,
        })
      ).toBe(false);
      expect(
        call({
          ...col,
          alignItems: "start",
          justifyContent: "start",
          x: 0,
          y: 1,
        })
      ).toBe(false);
    });

    test("align-items: center matches y=1", () => {
      expect(
        call({
          ...col,
          alignItems: "center",
          justifyContent: "end",
          x: 2,
          y: 1,
        })
      ).toBe(true);
      expect(
        call({
          ...col,
          alignItems: "center",
          justifyContent: "end",
          x: 2,
          y: 0,
        })
      ).toBe(false);
    });

    test("align-items: stretch covers all y", () => {
      expect(
        call({
          ...col,
          alignItems: "stretch",
          justifyContent: "start",
          x: 0,
          y: 0,
        })
      ).toBe(true);
      expect(
        call({
          ...col,
          alignItems: "stretch",
          justifyContent: "start",
          x: 0,
          y: 1,
        })
      ).toBe(true);
      expect(
        call({
          ...col,
          alignItems: "stretch",
          justifyContent: "start",
          x: 0,
          y: 2,
        })
      ).toBe(true);
      expect(
        call({
          ...col,
          alignItems: "stretch",
          justifyContent: "start",
          x: 1,
          y: 0,
        })
      ).toBe(false);
    });

    test("itemStretchWidth covers all y in column direction", () => {
      expect(
        call({
          ...col,
          alignItems: "start",
          itemStretchWidth: true,
          justifyContent: "center",
          x: 1,
          y: 0,
        })
      ).toBe(true);
      expect(
        call({
          ...col,
          alignItems: "start",
          itemStretchWidth: true,
          justifyContent: "center",
          x: 1,
          y: 2,
        })
      ).toBe(true);
      expect(
        call({
          ...col,
          alignItems: "start",
          itemStretchWidth: true,
          justifyContent: "center",
          x: 0,
          y: 0,
        })
      ).toBe(false);
    });

    test("space-between hides all x when cross matches", () => {
      expect(
        call({
          ...col,
          alignItems: "start",
          justifyContent: "space-between",
          x: 0,
          y: 0,
        })
      ).toBe(true);
      expect(
        call({
          ...col,
          alignItems: "start",
          justifyContent: "space-between",
          x: 1,
          y: 0,
        })
      ).toBe(true);
      expect(
        call({
          ...col,
          alignItems: "start",
          justifyContent: "space-between",
          x: 2,
          y: 0,
        })
      ).toBe(true);
      // cross doesn't match
      expect(
        call({
          ...col,
          alignItems: "start",
          justifyContent: "space-between",
          x: 0,
          y: 1,
        })
      ).toBe(false);
    });
  });

  describe("stretch direction matters for itemStretch*", () => {
    test("row: itemStretchWidth has no effect on cross-axis (y)", () => {
      expect(
        call({
          isColumnDirection: false,
          itemStretchWidth: true,
          alignItems: "start",
          justifyContent: "start",
          x: 0,
          y: 0,
        })
      ).toBe(true); // matches anyway via alignItems
      expect(
        call({
          isColumnDirection: false,
          itemStretchWidth: true,
          alignItems: "start",
          justifyContent: "start",
          x: 0,
          y: 1,
        })
      ).toBe(false); // itemStretchWidth doesn't affect row cross-axis
    });

    test("column: itemStretchHeight has no effect on cross-axis (y)", () => {
      expect(
        call({
          isColumnDirection: true,
          itemStretchHeight: true,
          alignItems: "start",
          justifyContent: "start",
          x: 0,
          y: 0,
        })
      ).toBe(true); // matches anyway via alignItems
      expect(
        call({
          isColumnDirection: true,
          itemStretchHeight: true,
          alignItems: "start",
          justifyContent: "start",
          x: 0,
          y: 1,
        })
      ).toBe(false); // itemStretchHeight doesn't affect column cross-axis
    });
  });
});
