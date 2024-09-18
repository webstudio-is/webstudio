import { test, describe, expect } from "@jest/globals";
import {
  parseLinearGradient,
  reconstructLinearGradient,
} from "./linear-gradient";

describe("parses linear-gradient", () => {
  test("parses gradient with no color-stop and angle or side-or-corner", () => {
    expect(parseLinearGradient("linear-gradient(red, blue, green)")).toEqual({
      angle: undefined,
      sideOrCorner: undefined,
      stops: [
        {
          color: "red",
        },
        {
          color: "blue",
        },
        {
          color: "green",
        },
      ],
    });
  });

  test("parses gradient with angle using dimension", () => {
    expect(parseLinearGradient("linear-gradient(45deg, green, blue)")).toEqual({
      angle: {
        type: "unit",
        unit: "deg",
        value: 45,
      },
      sideOrCorner: undefined,
      stops: [
        {
          color: "green",
        },
        {
          color: "blue",
        },
      ],
    });
  });

  test("parses gradient side-or-corner with some color-stops", () => {
    expect(
      parseLinearGradient(
        "linear-gradient(to left, rgb(51, 51, 51), rgb(51, 51, 51) 50%, rgb(238, 238, 238) 75%, rgb(51, 51, 51) 75%)"
      )
    );
  });
});
