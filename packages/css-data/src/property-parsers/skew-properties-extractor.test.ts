import { test, expect, describe } from "@jest/globals";
import { extractSkewPropertiesFromTransform } from "./skew-properties-extractor";
import { parseCssValue } from "../parse-css-value";

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
