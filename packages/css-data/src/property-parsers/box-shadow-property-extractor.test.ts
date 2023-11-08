import { describe, expect, test } from "@jest/globals";
import { extractBoxShadowProperties } from "./box-shadow-property-extractor";

describe("extractBoxShadowProperties", () => {
  test("parses and extracts values from 5em 5em 2em 2em #0000", () => {
    const { inset, blur, spread, color } = extractBoxShadowProperties({
      type: "tuple",
      value: [
        {
          type: "unit",
          value: 5,
          unit: "em",
        },
        {
          type: "unit",
          value: 5,
          unit: "em",
        },
        {
          type: "unit",
          value: 2,
          unit: "em",
        },
        {
          type: "unit",
          value: 2,
          unit: "em",
        },
        {
          type: "rgb",
          alpha: 0,
          r: 0,
          g: 0,
          b: 0,
        },
      ],
    });

    expect(inset).toBeNull();
    expect(blur).toBeDefined();
    expect(spread?.value).toBe(2);
    expect(color?.type).toBe("rgb");
  });

  test("parses and extracts values from inset 5em 5em red", () => {
    const { inset, spread, color, offsetX } = extractBoxShadowProperties({
      type: "tuple",
      value: [
        {
          type: "keyword",
          value: "inset",
        },
        {
          type: "unit",
          value: 5,
          unit: "em",
        },
        {
          type: "unit",
          value: 5,
          unit: "em",
        },
        {
          type: "keyword",
          value: "red",
        },
      ],
    });

    expect(inset).toBeDefined();
    expect(spread).toBeNull();
    expect(offsetX?.value).toBe(5);
    expect(color?.type).toBe("keyword");
  });

  test("parses and extracts values from 5em 5em #fff", () => {
    const { offsetX, offsetY, color } = extractBoxShadowProperties({
      type: "tuple",
      value: [
        {
          type: "unit",
          value: 5,
          unit: "em",
        },
        {
          type: "unit",
          value: 5,
          unit: "em",
        },
        {
          type: "rgb",
          alpha: 1,
          b: 255,
          g: 255,
          r: 255,
        },
      ],
    });

    expect(offsetX?.value).toBe(5);
    expect(offsetY?.value).toBe(5);
    expect(color).toBeDefined();
  });

  test("parses and extracts values from 5em 5em", () => {
    const { offsetX, offsetY } = extractBoxShadowProperties({
      type: "tuple",
      value: [
        {
          type: "unit",
          value: 5,
          unit: "em",
        },
        {
          type: "unit",
          value: 5,
          unit: "em",
        },
      ],
    });

    expect(offsetX?.value).toBe(5);
    expect(offsetY?.value).toBe(5);
  });
});
