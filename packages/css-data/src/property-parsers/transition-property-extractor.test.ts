import { describe, expect, test } from "@jest/globals";
import { extractTransitionProperties } from "./transition-property-extractor";

describe("extractTransitionProperties", () => {
  test("parses and extracts values from opacity 200ms ease 50ms", () => {
    const result = extractTransitionProperties({
      type: "tuple",
      value: [
        {
          type: "keyword",
          value: "opacity",
        },
        {
          type: "unit",
          value: 200,
          unit: "ms",
        },
        {
          type: "keyword",
          value: "ease",
        },
        {
          type: "unit",
          value: 50,
          unit: "ms",
        },
      ],
    });

    expect(result).toEqual({
      property: { type: "keyword", value: "opacity" },
      duration: { type: "unit", value: 200, unit: "ms" },
      timing: { type: "keyword", value: "ease" },
      delay: { type: "unit", value: 50, unit: "ms" },
    });
    expect(result).toMatchSnapshot(`
      {
        "property": {
          "type": "keyword",
          "value": "opacity"
        },
        "duration": {
          "type": "unit",
          "value": 200,
          "unit": "ms"
        },
        "timing": {
          "type": "keyword",
          "value": "ease"
        },
        "delay": {
          "type": "unit",
          "value": 50,
          "unit": "ms"
        }
      }
      `);
  });

  test("parses and extracts values from opacity 200ms ease", () => {
    const result = extractTransitionProperties({
      type: "tuple",
      value: [
        {
          type: "keyword",
          value: "opacity",
        },
        {
          type: "unit",
          value: 200,
          unit: "ms",
        },
        {
          type: "keyword",
          value: "ease",
        },
      ],
    });

    expect(result).toEqual({
      property: { type: "keyword", value: "opacity" },
      duration: { type: "unit", value: 200, unit: "ms" },
      timing: { type: "keyword", value: "ease" },
      delay: null,
    });
    expect(result).toMatchSnapshot(`
      {
        "property": {
          "type": "keyword",
          "value": "opacity"
        },
        "duration": {
          "type": "unit",
          "value": 200,
          "unit": "ms"
        },
        "timing": {
          "type": "keyword",
          "value": "ease"
        },
        "delay": null
      }
      `);
  });

  test("parses and extracts values from opacity 200ms 10ms", () => {
    const result = extractTransitionProperties({
      type: "tuple",
      value: [
        {
          type: "keyword",
          value: "opacity",
        },
        {
          type: "unit",
          value: 200,
          unit: "ms",
        },
        {
          type: "unit",
          value: 10,
          unit: "ms",
        },
      ],
    });

    expect(result).toEqual({
      property: { type: "keyword", value: "opacity" },
      duration: { type: "unit", value: 200, unit: "ms" },
      timing: null,
      delay: { type: "unit", value: 10, unit: "ms" },
    });
    expect(result).toMatchSnapshot(`
      {
        "property": {
          "type": "keyword",
          "value": "opacity"
        },
        "duration": {
          "type": "unit",
          "value": 200,
          "unit": "ms"
        },
        "timing": null,
        "delay": {
          "type": "unit",
          "value": 10,
          "unit": "ms"
        }
      }
    `);
  });

  test("parses and extracts values from opacity 200ms", () => {
    const result = extractTransitionProperties({
      type: "tuple",
      value: [
        {
          type: "keyword",
          value: "opacity",
        },
        {
          type: "unit",
          value: 200,
          unit: "ms",
        },
      ],
    });

    expect(result).toEqual({
      property: { type: "keyword", value: "opacity" },
      duration: { type: "unit", value: 200, unit: "ms" },
      timing: null,
      delay: null,
    });
    expect(result).toMatchSnapshot(`
      {
        "property": {
          "type": "keyword",
          "value": "opacity"
        },
        "duration": {
          "type": "unit",
          "value": 200,
          "unit": "ms"
        },
        "timing": null,
        "delay": null
      }
      `);
  });

  test("parses and extracts values from ease 10ms", () => {
    const result = extractTransitionProperties({
      type: "tuple",
      value: [
        {
          type: "keyword",
          value: "ease",
        },
        {
          type: "unit",
          value: 10,
          unit: "ms",
        },
      ],
    });
    expect(result).toEqual({
      property: null,
      duration: { type: "unit", value: 10, unit: "ms" },
      timing: { type: "keyword", value: "ease" },
      delay: null,
    });
  });

  test("parses and extracts values from opacity ease", () => {
    const result = extractTransitionProperties({
      type: "tuple",
      value: [
        {
          type: "keyword",
          value: "opacity",
        },
        {
          type: "keyword",
          value: "ease",
        },
      ],
    });

    expect(result).toEqual({
      property: { type: "keyword", value: "opacity" },
      duration: null,
      timing: { type: "keyword", value: "ease" },
      delay: null,
    });
    expect(result).toMatchSnapshot(`
      {
        "property": {
          "type": "keyword",
          "value": "opacity"
        },
        "duration": null,
        "timing": {
          "type": "keyword",
          "value": "ease"
        },
        "delay": null
      }
    `);
  });

  test("parses and extracts values from opacity ease 50ms", () => {
    const result = extractTransitionProperties({
      type: "tuple",
      value: [
        {
          type: "keyword",
          value: "opacity",
        },
        {
          type: "keyword",
          value: "ease",
        },
        {
          type: "unit",
          value: 50,
          unit: "ms",
        },
      ],
    });

    expect(result).toEqual({
      property: { type: "keyword", value: "opacity" },
      duration: { type: "unit", value: 50, unit: "ms" },
      timing: { type: "keyword", value: "ease" },
      delay: null,
    });
    expect(result).toMatchSnapshot(`
      {
        "property": {
          "type": "keyword",
          "value": "opacity"
        },
        "duration": {
          "type": "unit",
          "value": 50,
          "unit": "ms"
        },
        "timing": {
          "type": "keyword",
          "value": "ease"
        },
        "delay": null
      }
    `);
  });

  test("parses and extracts values from transform 0.6s cubic-bezier(0.36, 0, 0.66, -0.56)", () => {
    const result = extractTransitionProperties({
      type: "tuple",
      value: [
        {
          type: "keyword",
          value: "transform",
        },
        {
          type: "unit",
          value: 0.6,
          unit: "s",
        },
        {
          type: "keyword",
          value: "cubic-bezier(0.36, 0, 0.66, -0.56)",
        },
      ],
    });

    expect(result).toEqual({
      property: { type: "keyword", value: "transform" },
      duration: { type: "unit", value: 0.6, unit: "s" },
      timing: { type: "keyword", value: "cubic-bezier(0.36, 0, 0.66, -0.56)" },
      delay: null,
    });
    expect(result).toMatchSnapshot(`
      {
        "property": {
          "type": "keyword",
          "value": "transform"
        },
        "duration": {
          "type": "unit",
          "value": 0.6,
          "unit": "s"
        },
        "timing": {
          "type": "keyword",
          "value": "cubic-bezier(0.36, 0, 0.66, -0.56)"
        },
        "delay": null
      }
    `);
  });

  test("parses and extracts values from custom-property ease", () => {
    const result = extractTransitionProperties({
      type: "tuple",
      value: [
        {
          type: "keyword",
          value: "custom-property",
        },
        {
          type: "keyword",
          value: "ease",
        },
      ],
    });

    expect(result).toEqual({
      property: { type: "keyword", value: "custom-property" },
      duration: null,
      timing: { type: "keyword", value: "ease" },
      delay: null,
    });

    expect(result).toMatchSnapshot(`
      {
        "property": {
          "type": "keyword",
          "value": "custom-property"
        },
        "duration": null,
        "timing": {
          "type": "keyword",
          "value": "ease"
        },
        "delay": null
      }
    `);
  });

  test("parses and extracts values from custom-property ease", () => {
    const result = extractTransitionProperties({
      type: "tuple",
      value: [
        {
          type: "keyword",
          value: "ease",
        },
      ],
    });

    expect(result).toEqual({
      property: null,
      duration: null,
      timing: { type: "keyword", value: "ease" },
      delay: null,
    });

    expect(result).toMatchSnapshot(`
      {
        "property": null,
        "duration": null,
        "timing": {
          "type": "keyword",
          "value": "ease"
        },
        "delay": null
      }
    `);
  });
});
