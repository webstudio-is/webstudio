import { test, describe, expect } from "@jest/globals";
import { extractTextShadowProperties } from "./text-shadow-property-extractor";
import { parseShadow } from "./shadows";
import type { TupleValue } from "@webstudio-is/css-engine";

describe("extractTextShadowProeprties", () => {
  test("tokenize and extracts values from 5em 10em 2em #0000", () => {
    const { offsetX, offsetY, blur, color } = extractTextShadowProperties(
      parseShadow("textShadow", "5em 10em 2em #0000")?.value[0] as TupleValue
    );

    expect(offsetY).toBeDefined();
    expect(offsetX?.value).toBe(5);
    expect(color?.type).toBe("rgb");
    expect(blur?.value).toBe(2);
  });

  test("tokenize and extracts values from 5em 10em", () => {
    const { offsetX, offsetY, blur, color } = extractTextShadowProperties(
      parseShadow("textShadow", "5em 10em")?.value[0] as TupleValue
    );

    expect(offsetY?.value).toBe(10);
    expect(offsetX?.value).toBe(5);

    expect(color).toBeNull();
    expect(blur).toBeNull();
  });

  test("tokenize and extracts values from box-shadow: red 60px -16px;", () => {
    const { offsetX, offsetY, blur, color } = extractTextShadowProperties(
      parseShadow("textShadow", "text-shadow: red 60px -16px;")
        ?.value[0] as TupleValue
    );

    expect(offsetX?.value).toBe(60);
    expect(offsetY?.value).toBe(-16);
    expect(color?.type).toBe("keyword");
    expect(blur).toBeNull();
  });
});
