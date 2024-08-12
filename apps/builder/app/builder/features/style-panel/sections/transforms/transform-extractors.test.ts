import { describe, test, expect } from "@jest/globals";
import {
  extractRotatePropertiesFromTransform,
  extractSkewPropertiesFromTransform,
  extractTransformOriginValues,
} from "./transform-extractors";
import { parseCssValue } from "@webstudio-is/css-data";

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

describe("extractTransformOriginValues", () => {
  test("parses transform-origin and returns the individual properties from the value", () => {
    expect(
      extractTransformOriginValues(parseCssValue("transformOrigin", "center"))
    ).toEqual({
      x: { type: "keyword", value: "center" },
      y: { type: "keyword", value: "center" },
      z: { type: "unit", unit: "px", value: 0 },
    });

    expect(
      extractTransformOriginValues(parseCssValue("transformOrigin", "top"))
    ).toEqual({
      x: { type: "keyword", value: "center" },
      y: { type: "keyword", value: "top" },
      z: { type: "unit", unit: "px", value: 0 },
    });

    expect(
      extractTransformOriginValues(parseCssValue("transformOrigin", "right"))
    ).toEqual({
      x: { type: "keyword", value: "right" },
      y: { type: "keyword", value: "center" },
      z: { type: "unit", unit: "px", value: 0 },
    });

    expect(
      extractTransformOriginValues(parseCssValue("transformOrigin", "45px"))
    ).toEqual({
      x: { type: "unit", unit: "px", value: 45 },
      y: { type: "keyword", value: "center" },
      z: { type: "unit", unit: "px", value: 0 },
    });

    expect(
      extractTransformOriginValues(
        parseCssValue("transformOrigin", "20px 40px")
      )
    ).toEqual({
      x: { type: "unit", unit: "px", value: 20 },
      y: { type: "unit", unit: "px", value: 40 },
      z: { type: "unit", unit: "px", value: 0 },
    });

    expect(
      extractTransformOriginValues(
        parseCssValue("transformOrigin", "10px 20px 30px")
      )
    ).toEqual({
      x: { type: "unit", unit: "px", value: 10 },
      y: { type: "unit", unit: "px", value: 20 },
      z: { type: "unit", unit: "px", value: 30 },
    });

    expect(
      extractTransformOriginValues(
        parseCssValue("transformOrigin", "left top 30px")
      )
    ).toEqual({
      x: { type: "keyword", value: "left" },
      y: { type: "keyword", value: "top" },
      z: { type: "unit", unit: "px", value: 30 },
    });
  });
});
