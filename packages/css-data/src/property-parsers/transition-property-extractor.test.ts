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
    expect(result).toMatchInlineSnapshot(`
{
  "delay": {
    "type": "unit",
    "unit": "ms",
    "value": 50,
  },
  "duration": {
    "type": "unit",
    "unit": "ms",
    "value": 200,
  },
  "property": {
    "type": "keyword",
    "value": "opacity",
  },
  "timing": {
    "type": "keyword",
    "value": "ease",
  },
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
      delay: undefined,
    });
    expect(result).toMatchInlineSnapshot(`
{
  "delay": undefined,
  "duration": {
    "type": "unit",
    "unit": "ms",
    "value": 200,
  },
  "property": {
    "type": "keyword",
    "value": "opacity",
  },
  "timing": {
    "type": "keyword",
    "value": "ease",
  },
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
      timing: undefined,
      delay: { type: "unit", value: 10, unit: "ms" },
    });
    expect(result).toMatchInlineSnapshot(`
{
  "delay": {
    "type": "unit",
    "unit": "ms",
    "value": 10,
  },
  "duration": {
    "type": "unit",
    "unit": "ms",
    "value": 200,
  },
  "property": {
    "type": "keyword",
    "value": "opacity",
  },
  "timing": undefined,
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
      timing: undefined,
      delay: undefined,
    });
    expect(result).toMatchInlineSnapshot(`
{
  "delay": undefined,
  "duration": {
    "type": "unit",
    "unit": "ms",
    "value": 200,
  },
  "property": {
    "type": "keyword",
    "value": "opacity",
  },
  "timing": undefined,
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
      property: undefined,
      duration: { type: "unit", value: 10, unit: "ms" },
      timing: { type: "keyword", value: "ease" },
      delay: undefined,
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
      duration: undefined,
      timing: { type: "keyword", value: "ease" },
      delay: undefined,
    });
    expect(result).toMatchInlineSnapshot;
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
      delay: undefined,
    });
    expect(result).toMatchInlineSnapshot(`
{
  "delay": undefined,
  "duration": {
    "type": "unit",
    "unit": "ms",
    "value": 50,
  },
  "property": {
    "type": "keyword",
    "value": "opacity",
  },
  "timing": {
    "type": "keyword",
    "value": "ease",
  },
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
      delay: undefined,
    });
    expect(result).toMatchInlineSnapshot(`
{
  "delay": undefined,
  "duration": {
    "type": "unit",
    "unit": "s",
    "value": 0.6,
  },
  "property": {
    "type": "keyword",
    "value": "transform",
  },
  "timing": {
    "type": "keyword",
    "value": "cubic-bezier(0.36, 0, 0.66, -0.56)",
  },
}
`);
  });

  test("parses and throws error for non-animatable 'custom-property ease'", () => {
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
      property: undefined,
      duration: undefined,
      timing: { type: "keyword", value: "ease" },
      delay: undefined,
    });

    expect(result).toMatchInlineSnapshot(`
{
  "delay": undefined,
  "duration": undefined,
  "property": undefined,
  "timing": {
    "type": "keyword",
    "value": "ease",
  },
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
      property: undefined,
      duration: undefined,
      timing: { type: "keyword", value: "ease" },
      delay: undefined,
    });

    expect(result).toMatchInlineSnapshot(`
{
  "delay": undefined,
  "duration": undefined,
  "property": undefined,
  "timing": {
    "type": "keyword",
    "value": "ease",
  },
}
`);
  });
});
