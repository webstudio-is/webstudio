import { describe, expect, test } from "@jest/globals";
import { extractShadowProperties } from "./shadow-properties-extractor";
import { parseShadow } from "./shadows";
import type { TupleValue } from "@webstudio-is/css-engine";

describe("Extract Box-Shadow Properties", () => {
  test("tokenize and extracts values from 5em 5em 2em 2em #0000", () => {
    const { inset, blur, spread, color } = extractShadowProperties({
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

    expect(inset).not.toBeDefined();
    expect(blur).toBeDefined();
    expect(spread?.value).toBe(2);
    expect(color?.type).toBe("rgb");
  });

  test("tokenize and extracts values from inset 5em 5em red", () => {
    const { inset, spread, color, offsetX } = extractShadowProperties({
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
    expect(spread).not.toBeDefined();
    expect(offsetX?.value).toBe(5);
    expect(color?.type).toBe("keyword");
  });

  test("tokenize and extracts values from 5em 5em #fff", () => {
    const { offsetX, offsetY, color } = extractShadowProperties({
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

  test("tokenize and extracts values from 5em 5em", () => {
    const { offsetX, offsetY } = extractShadowProperties({
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

  test("tokenize and extract values from 5em 5em 0em 5em inset #ffff", () => {
    const layers = parseShadow("boxShadow", "5em 5em 0em 5em inset #ffff");
    if (layers.type === "invalid") {
      throw new Error(`Failed in parsing box-shadow string`);
    }

    const layer = layers.value.find(
      (layer): layer is TupleValue => layer.type === "tuple"
    );
    if (!layer) {
      throw new Error(`Parsing box-shadow layer failed`);
    }

    const { blur, spread, color, offsetX, inset } =
      extractShadowProperties(layer);

    expect(blur).toBeDefined();
    expect(blur?.value).toBe(0);
    expect(spread?.value).toBe(5);
    expect(offsetX?.value).toBe(5);
    expect(color).toBeDefined();
    expect(inset).toBeDefined();
  });
});

describe("Extract Text-Shadow Properties", () => {
  test("tokenize and extracts values from 5em 10em 2em #0000", () => {
    const { offsetX, offsetY, blur, color } = extractShadowProperties(
      parseShadow("textShadow", "5em 10em 2em #0000")?.value[0] as TupleValue
    );

    expect(offsetY).toBeDefined();
    expect(offsetX?.value).toBe(5);
    expect(color?.type).toBe("rgb");
    expect(blur?.value).toBe(2);
  });

  test("tokenize and extracts values from 5em 10em", () => {
    const { offsetX, offsetY, blur, color } = extractShadowProperties(
      parseShadow("textShadow", "5em 10em")?.value[0] as TupleValue
    );

    expect(offsetY?.value).toBe(10);
    expect(offsetX?.value).toBe(5);

    expect(color).not.toBeDefined();
    expect(blur).not.toBeDefined();
  });

  test("tokenize and extracts values from box-shadow: red 60px -16px;", () => {
    const { offsetX, offsetY, blur, color } = extractShadowProperties(
      parseShadow("textShadow", "text-shadow: red 60px -16px;")
        ?.value[0] as TupleValue
    );

    expect(offsetX?.value).toBe(60);
    expect(offsetY?.value).toBe(-16);
    expect(color?.type).toBe("keyword");
    expect(blur).not.toBeDefined();
  });
});
