import { describe, expect, test } from "@jest/globals";
import { parseCssValue } from "../parse-css-value";
import { extractRotatePropertiesFromTransform } from "./rotate-properties-extractor";

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
