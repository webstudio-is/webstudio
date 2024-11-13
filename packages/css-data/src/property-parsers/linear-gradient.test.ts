import { test, describe, expect } from "vitest";
import {
  parseLinearGradient,
  reconstructLinearGradient,
} from "./linear-gradient";

describe("parses linear-gradient", () => {
  test("parses gradient without angle, sides and color-stops", () => {
    expect(parseLinearGradient("linear-gradient(red, blue, yellow)")).toEqual({
      angle: undefined,
      sideOrCorner: undefined,
      stops: [
        {
          color: { alpha: 1, b: 0, g: 0, r: 255, type: "rgb" },
          hint: undefined,
          position: undefined,
        },
        {
          color: { alpha: 1, b: 255, g: 0, r: 0, type: "rgb" },
          hint: undefined,
          position: undefined,
        },
        {
          color: { alpha: 1, b: 0, g: 255, r: 255, type: "rgb" },
          hint: undefined,
          position: undefined,
        },
      ],
    });
  });

  test("parses linear-gradient with angle and color-stops", () => {
    expect(
      parseLinearGradient("linear-gradient(135deg, orange 60% 20%, 40%, cyan)")
    ).toEqual({
      angle: { type: "unit", unit: "deg", value: 135 },
      sideOrCorner: undefined,
      stops: [
        {
          color: { alpha: 1, b: 0, g: 165, r: 255, type: "rgb" },
          hint: { type: "unit", unit: "%", value: 20 },
          position: { type: "unit", unit: "%", value: 60 },
        },
        { hint: { type: "unit", unit: "%", value: 40 } },
        {
          color: { alpha: 1, b: 255, g: 255, r: 0, type: "rgb" },
          hint: undefined,
          position: undefined,
        },
      ],
    });
  });

  test("parses linear-gradient with side-or-corer and multiple colors without stops", () => {
    expect(
      parseLinearGradient(
        "linear-gradient(to top right, orange, yellow, blue, green)"
      )
    ).toEqual({
      angle: undefined,
      sideOrCorner: { type: "keyword", value: "to top right" },
      stops: [
        {
          color: { alpha: 1, b: 0, g: 165, r: 255, type: "rgb" },
          hint: undefined,
          position: undefined,
        },
        {
          color: { alpha: 1, b: 0, g: 255, r: 255, type: "rgb" },
          hint: undefined,
          position: undefined,
        },
        {
          color: { alpha: 1, b: 255, g: 0, r: 0, type: "rgb" },
          hint: undefined,
          position: undefined,
        },
        {
          color: { alpha: 1, b: 0, g: 128, r: 0, type: "rgb" },
          hint: undefined,
          position: undefined,
        },
      ],
    });
  });

  test("parses linear-gradient with multiple angles and color-stops", () => {
    expect(
      parseLinearGradient(
        "linear-gradient(to right, red 20%, orange 20% 40%, yellow 40% 60%, green 60% 80%, blue 80% )"
      )
    ).toEqual({
      angle: undefined,
      sideOrCorner: { type: "keyword", value: "to right" },
      stops: [
        {
          color: { alpha: 1, b: 0, g: 0, r: 255, type: "rgb" },
          hint: undefined,
          position: { type: "unit", unit: "%", value: 20 },
        },
        {
          color: { alpha: 1, b: 0, g: 165, r: 255, type: "rgb" },
          hint: { type: "unit", unit: "%", value: 40 },
          position: { type: "unit", unit: "%", value: 20 },
        },
        {
          color: { alpha: 1, b: 0, g: 255, r: 255, type: "rgb" },
          hint: { type: "unit", unit: "%", value: 60 },
          position: { type: "unit", unit: "%", value: 40 },
        },
        {
          color: { alpha: 1, b: 0, g: 128, r: 0, type: "rgb" },
          hint: { type: "unit", unit: "%", value: 80 },
          position: { type: "unit", unit: "%", value: 60 },
        },
        {
          color: { alpha: 1, b: 255, g: 0, r: 0, type: "rgb" },
          hint: undefined,
          position: { type: "unit", unit: "%", value: 80 },
        },
      ],
    });
  });

  test("parses linear-gradient with rgb values", () => {
    const parsed = parseLinearGradient(
      "linear-gradient(rgb(255, 0, 0), rgb(0, 255, 0), rgb(0, 0, 255))"
    );
    if (parsed === undefined) {
      throw new Error("parsed is undefined");
    }

    expect(reconstructLinearGradient(parsed)).toEqual(
      "linear-gradient(rgba(255, 0, 0, 1), rgba(0, 255, 0, 1), rgba(0, 0, 255, 1))"
    );
  });
});
