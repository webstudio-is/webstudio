import { describe, test, expect } from "vitest";
import {
  extractRotatePropertiesFromTransform,
  extractSkewPropertiesFromTransform,
  extractTransformOrPerspectiveOriginValues,
} from "./transform-extractors";
import { parseCssValue } from "@webstudio-is/css-data";
import type { TupleValue } from "@webstudio-is/css-engine";

describe("extractRotatePropertiesFromTransform", () => {
  test("parses transform and returns undefined if no rotate values exists", () => {
    expect(
      extractRotatePropertiesFromTransform(
        parseCssValue("transform", "scale(1.5)")
      )
    ).toEqual({
      rotateX: undefined,
      rotateY: undefined,
      rotateZ: undefined,
    });
  });

  test("parses transform and returns rotate values", () => {
    expect(
      extractRotatePropertiesFromTransform(
        parseCssValue("transform", "rotateX(0deg) rotateY(10deg) scale(1.5)")
      )
    ).toEqual({
      rotateX: {
        type: "function",
        args: {
          type: "layers",
          value: [
            {
              type: "unit",
              unit: "deg",
              value: 0,
            },
          ],
        },
        name: "rotateX",
      },
      rotateY: {
        type: "function",
        args: {
          type: "layers",
          value: [
            {
              type: "unit",
              unit: "deg",
              value: 10,
            },
          ],
        },
        name: "rotateY",
      },
    });
  });
});

describe("extractSkewPropertiesFromTransform", () => {
  test("parses transform and returns undefined if no skew properties exists", () => {
    expect(
      extractSkewPropertiesFromTransform(
        parseCssValue("transform", "rotateX(0deg) rotateY(0deg) scale(1.5)")
      )
    ).toEqual({ skewX: undefined, skewY: undefined });
  });

  test("parses transform and extracts valid skew properties", () => {
    expect(
      extractSkewPropertiesFromTransform(
        parseCssValue(
          "transform",
          "skewX(10deg) skewY(20deg) rotate(30deg) scale(1.5)"
        )
      )
    ).toEqual({
      skewX: {
        type: "function",
        args: {
          type: "layers",
          value: [
            {
              type: "unit",
              unit: "deg",
              value: 10,
            },
          ],
        },
        name: "skewX",
      },
      skewY: {
        type: "function",
        args: {
          type: "layers",
          value: [
            {
              type: "unit",
              unit: "deg",
              value: 20,
            },
          ],
        },
        name: "skewY",
      },
    });
  });
});

describe("extractTransformOrPerspectiveOriginValues", () => {
  test("parses transform-origin and returns the individual properties from the value", () => {
    expect(
      extractTransformOrPerspectiveOriginValues(
        parseCssValue("transformOrigin", "center") as TupleValue
      )
    ).toEqual({
      x: { type: "keyword", value: "center" },
      y: { type: "keyword", value: "center" },
      z: undefined,
    });

    expect(
      extractTransformOrPerspectiveOriginValues(
        parseCssValue("transformOrigin", "top") as TupleValue
      )
    ).toEqual({
      x: { type: "keyword", value: "center" },
      y: { type: "keyword", value: "top" },
      z: undefined,
    });

    expect(
      extractTransformOrPerspectiveOriginValues(
        parseCssValue("transformOrigin", "right") as TupleValue
      )
    ).toEqual({
      x: { type: "keyword", value: "right" },
      y: { type: "keyword", value: "center" },
      z: undefined,
    });

    expect(
      extractTransformOrPerspectiveOriginValues(
        parseCssValue("transformOrigin", "45px") as TupleValue
      )
    ).toEqual({
      x: { type: "unit", unit: "px", value: 45 },
      y: { type: "keyword", value: "center" },
      z: undefined,
    });

    expect(
      extractTransformOrPerspectiveOriginValues(
        parseCssValue("transformOrigin", "20px 40px") as TupleValue
      )
    ).toEqual({
      x: { type: "unit", unit: "px", value: 20 },
      y: { type: "unit", unit: "px", value: 40 },
      z: undefined,
    });

    expect(
      extractTransformOrPerspectiveOriginValues(
        parseCssValue("transformOrigin", "10px 20px 30px") as TupleValue
      )
    ).toEqual({
      x: { type: "unit", unit: "px", value: 10 },
      y: { type: "unit", unit: "px", value: 20 },
      z: { type: "unit", unit: "px", value: 30 },
    });

    expect(
      extractTransformOrPerspectiveOriginValues(
        parseCssValue("transformOrigin", "left top 30px") as TupleValue
      )
    ).toEqual({
      x: { type: "keyword", value: "left" },
      y: { type: "keyword", value: "top" },
      z: { type: "unit", value: 30, unit: "px" },
    });

    expect(
      extractTransformOrPerspectiveOriginValues(
        parseCssValue("transformOrigin", "bottom right 60px") as TupleValue
      )
    ).toEqual({
      x: { type: "keyword", value: "right" },
      y: { type: "keyword", value: "bottom" },
      z: { type: "unit", value: 60, unit: "px" },
    });

    expect(
      extractTransformOrPerspectiveOriginValues(
        parseCssValue("transformOrigin", "left 50% 60px") as TupleValue
      )
    ).toEqual({
      x: { type: "keyword", value: "left" },
      y: { type: "unit", value: 50, unit: "%" },
      z: { type: "unit", value: 60, unit: "px" },
    });

    expect(
      extractTransformOrPerspectiveOriginValues(
        parseCssValue("transformOrigin", "50% bottom 60px") as TupleValue
      )
    ).toEqual({
      x: { type: "unit", value: 50, unit: "%" },
      y: { type: "keyword", value: "bottom" },
      z: { type: "unit", value: 60, unit: "px" },
    });
  });
});
