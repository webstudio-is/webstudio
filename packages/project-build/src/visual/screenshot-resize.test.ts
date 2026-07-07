import { expect, test } from "vitest";
import {
  normalizeToCommonSize,
  resizeDecodedRgbaImage,
} from "./screenshot-resize";

const createImage = (width: number, height: number) => ({
  width,
  height,
  data: new Uint8Array(width * height * 4).fill(255),
});

test("returns existing images when sizes already match", () => {
  const baseline = createImage(2, 2);
  const current = createImage(2, 2);

  expect(normalizeToCommonSize(baseline, current)).toEqual({
    baseline,
    current,
  });
});

test("normalizes same-aspect images to the smaller size", () => {
  const baseline = createImage(2, 2);
  const current = createImage(4, 4);

  expect(normalizeToCommonSize(baseline, current)).toEqual({
    baseline,
    current: expect.objectContaining({ width: 2, height: 2 }),
  });
});

test("does not normalize different aspect ratios", () => {
  expect(normalizeToCommonSize(createImage(2, 2), createImage(3, 2))).toBe(
    undefined
  );
});

test("resizes to at least one pixel", () => {
  expect(resizeDecodedRgbaImage(createImage(2, 2), 0, 0)).toEqual(
    expect.objectContaining({ width: 1, height: 1 })
  );
});
