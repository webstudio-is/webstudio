import { describe, test, expect } from "vitest";
import { calcOffsets, findInsertionIndex, moveItem } from "./keyframe-helpers";

describe("calcOffsets", () => {
  test("returns empty array for empty input", () => {
    expect(calcOffsets([])).toEqual([]);
  });

  test("handles array with all offsets defined", () => {
    const keyframes = [{ offset: 0 }, { offset: 0.5 }, { offset: 1 }];
    expect(calcOffsets(keyframes)).toEqual([0, 0.5, 1]);
  });

  test("adds implicit start and end offsets", () => {
    const keyframes = [
      { offset: undefined },
      { offset: 0.5 },
      { offset: undefined },
    ];
    expect(calcOffsets(keyframes)).toEqual([0, 0.5, 1]);
  });

  test("interpolates missing middle offsets", () => {
    const keyframes = [{ offset: 0 }, { offset: undefined }, { offset: 1 }];
    expect(calcOffsets(keyframes)).toEqual([0, 0.5, 1]);
  });

  test("handles multiple gaps in offsets", () => {
    const keyframes = [
      { offset: 0 },
      { offset: undefined },
      { offset: undefined },
      { offset: undefined },
      { offset: 1 },
    ];
    expect(calcOffsets(keyframes)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  test("handles multiple gaps in offsets", () => {
    const keyframes = [
      { offset: 0 },
      { offset: undefined },
      { offset: undefined },
      { offset: 0.51 },
      { offset: undefined },
      { offset: 1 },
    ];

    expect(calcOffsets(keyframes)).toEqual([0, 0.17, 0.34, 0.51, 0.755, 1]);
  });

  test("handles multiple gaps in offsets", () => {
    const keyframes = [
      { offset: 0 },
      { offset: undefined },
      { offset: undefined },
      { offset: undefined },
      { offset: undefined },
      { offset: 0.5 },
      { offset: undefined },
      { offset: undefined },
      { offset: undefined },
      { offset: undefined },
      { offset: 1 },
    ];

    expect(calcOffsets(keyframes)).toEqual([
      0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1,
    ]);
  });
});

describe("findInsertionIndex", () => {
  test("should keep current index when it's in the correct position", () => {
    const keyframes = [
      { offset: 0 },
      { offset: 0.5, current: true },
      { offset: 0.7 },
      { offset: 1 },
    ];
    const currentIndex = keyframes.findIndex((k) => k.current)!;

    expect(
      moveItem(
        keyframes,
        currentIndex,
        findInsertionIndex(keyframes, currentIndex)
      )
    ).toEqual(keyframes);
  });

  test("should move index forward when current position is too early", () => {
    const keyframes = [
      { offset: 0 },
      { offset: 0.8, current: true },
      { offset: 0.7 },
      { offset: 1 },
    ];
    const currentIndex = keyframes.findIndex((k) => k.current)!;

    expect(
      moveItem(
        keyframes,
        currentIndex,
        findInsertionIndex(keyframes, currentIndex)
      )
    ).toEqual([
      { offset: 0 },
      { offset: 0.7 },
      { offset: 0.8, current: true },
      { offset: 1 },
    ]);
  });

  test("should move index backward when current position is too late", () => {
    const keyframes = [
      { offset: 0 },
      { offset: 0.3 },
      { offset: 0.7 },
      { offset: 0.35, current: true },
    ];
    const currentIndex = keyframes.findIndex((k) => k.current)!;

    expect(
      moveItem(
        keyframes,
        currentIndex,
        findInsertionIndex(keyframes, currentIndex)
      )
    ).toEqual([
      { offset: 0 },
      { offset: 0.3 },
      { offset: 0.35, current: true },
      { offset: 0.7 },
    ]);
  });

  test("should move index backward at 1 when current position is too late", () => {
    const keyframes = [
      { offset: 0 },
      { offset: 0.3 },
      { offset: 0.7 },
      { offset: 0, current: true },
    ];
    const currentIndex = keyframes.findIndex((k) => k.current)!;

    expect(
      moveItem(
        keyframes,
        currentIndex,
        findInsertionIndex(keyframes, currentIndex)
      )
    ).toEqual([
      { offset: 0 },
      { offset: 0, current: true },
      { offset: 0.3 },
      { offset: 0.7 },
    ]);
  });

  test("should move index backward at 0 when current position is too late", () => {
    const keyframes = [
      { offset: 0.1 },
      { offset: 0.3 },
      { offset: 0.7 },
      { offset: 0, current: true },
    ];
    const currentIndex = keyframes.findIndex((k) => k.current)!;

    expect(
      moveItem(
        keyframes,
        currentIndex,
        findInsertionIndex(keyframes, currentIndex)
      )
    ).toEqual([
      { offset: 0, current: true },
      { offset: 0.1 },
      { offset: 0.3 },
      { offset: 0.7 },
    ]);
  });

  test("should preserve position with undefined around", () => {
    const keyframes = [
      { offset: 0 },
      { offset: undefined },
      { offset: 0.2, current: true },
      { offset: undefined },
    ];
    const currentIndex = keyframes.findIndex((k) => k.current)!;

    expect(
      moveItem(
        keyframes,
        currentIndex,
        findInsertionIndex(keyframes, currentIndex)
      )
    ).toEqual([
      { offset: 0 },
      { offset: undefined },
      { offset: 0.2, current: true },
      { offset: undefined },
    ]);
  });

  test("should move position with undefined around if needed", () => {
    const keyframes = [
      { offset: 0 },
      { offset: undefined },
      { offset: 0.5, current: true },
      { offset: undefined },
      { offset: 0.3 },
      { offset: undefined },
      { offset: undefined },
    ];
    const currentIndex = keyframes.findIndex((k) => k.current)!;

    expect(
      moveItem(
        keyframes,
        currentIndex,
        findInsertionIndex(keyframes, currentIndex)
      )
    ).toEqual([
      { offset: 0 },
      { offset: undefined },
      { offset: undefined },
      { offset: 0.3 },
      { offset: 0.5, current: true },
      { offset: undefined },
      { offset: undefined },
    ]);
  });
});
