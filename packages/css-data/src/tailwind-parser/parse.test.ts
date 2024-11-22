import { describe, expect, test, vi } from "vitest";

import { parseTailwindToCss, parseTailwindToWebstudio } from "./parse";

/*
Quick Validation of Generated CSS in WebStudio:
1. Customize the example JSON below with your desired styles (from snapshots).
2. Copy and paste it into your project at https://apps.webstudio.is/

```json
{
  "@webstudio/template": [
    {
      "type": "instance",
      "component": "Box",
      "props": [
      ],
      "styles": [
        {
          "property": "backgroundImage",
          "value": {
            "type": "layers",
            "value": [{
              type: "unparsed",
              value: "linear-gradient(to right,rgb(99 102 241/1) 0%,rgb(99 102 241/0) 100%)"
            }]
          }
        }
      ],
      "children": [{ "type": "text", "value": "-" }]
    }
  ]
}
```
*/

describe("parseTailwindToWebstudio", () => {
  test("no-underline", async () => {
    const tailwindClasses = `no-underline`;

    expect(await parseTailwindToWebstudio(tailwindClasses)).toEqual([
      {
        property: "textDecorationLine",
        value: { type: "keyword", value: "none" },
      },
      {
        property: "textDecorationStyle",
        value: { type: "keyword", value: "solid" },
      },
      {
        property: "textDecorationColor",
        value: { type: "keyword", value: "currentcolor" },
      },
    ]);
  });

  test("expand margins", async () => {
    const tailwindClasses = `m-4`;

    expect(await parseTailwindToWebstudio(tailwindClasses)).toEqual([
      {
        property: "marginTop",
        value: { type: "unit", unit: "rem", value: 1 },
      },
      {
        property: "marginRight",
        value: { type: "unit", unit: "rem", value: 1 },
      },
      {
        property: "marginBottom",
        value: { type: "unit", unit: "rem", value: 1 },
      },
      {
        property: "marginLeft",
        value: { type: "unit", unit: "rem", value: 1 },
      },
    ]);
  });

  test("substitute variables - gradient", async () => {
    const tailwindClasses = `bg-left-top bg-gradient-to-r from-indigo-500 from-10% via-sky-500 via-30% to-emerald-500 to-90%`;

    expect(await parseTailwindToWebstudio(tailwindClasses))
      .toMatchInlineSnapshot(`
[
  {
    "property": "backgroundImage",
    "value": {
      "type": "layers",
      "value": [
        {
          "type": "unparsed",
          "value": "linear-gradient(to right,rgb(99 102 241/1) 10%,rgb(14 165 233/1) 30%,rgb(16 185 129/1) 90%)",
        },
      ],
    },
  },
  {
    "property": "backgroundPositionX",
    "value": {
      "type": "layers",
      "value": [
        {
          "type": "keyword",
          "value": "left",
        },
      ],
    },
  },
  {
    "property": "backgroundPositionY",
    "value": {
      "type": "layers",
      "value": [
        {
          "type": "keyword",
          "value": "top",
        },
      ],
    },
  },
]
`);
  });

  test("shadow", async () => {
    const tailwindClasses = `shadow-md`;

    expect(await parseTailwindToWebstudio(tailwindClasses))
      .toMatchInlineSnapshot(`
[
  {
    "property": "boxShadow",
    "value": {
      "type": "layers",
      "value": [
        {
          "type": "tuple",
          "value": [
            {
              "type": "unit",
              "unit": "number",
              "value": 0,
            },
            {
              "type": "unit",
              "unit": "number",
              "value": 0,
            },
            {
              "alpha": 0,
              "b": 0,
              "g": 0,
              "r": 0,
              "type": "rgb",
            },
          ],
        },
        {
          "type": "tuple",
          "value": [
            {
              "type": "unit",
              "unit": "number",
              "value": 0,
            },
            {
              "type": "unit",
              "unit": "number",
              "value": 0,
            },
            {
              "alpha": 0,
              "b": 0,
              "g": 0,
              "r": 0,
              "type": "rgb",
            },
          ],
        },
        {
          "type": "tuple",
          "value": [
            {
              "type": "unit",
              "unit": "number",
              "value": 0,
            },
            {
              "type": "unit",
              "unit": "px",
              "value": 4,
            },
            {
              "type": "unit",
              "unit": "px",
              "value": 6,
            },
            {
              "type": "unit",
              "unit": "px",
              "value": -1,
            },
            {
              "alpha": 0.1,
              "b": 0,
              "g": 0,
              "r": 0,
              "type": "rgb",
            },
          ],
        },
        {
          "type": "tuple",
          "value": [
            {
              "type": "unit",
              "unit": "number",
              "value": 0,
            },
            {
              "type": "unit",
              "unit": "px",
              "value": 2,
            },
            {
              "type": "unit",
              "unit": "px",
              "value": 4,
            },
            {
              "type": "unit",
              "unit": "px",
              "value": -2,
            },
            {
              "alpha": 0.1,
              "b": 0,
              "g": 0,
              "r": 0,
              "type": "rgb",
            },
          ],
        },
      ],
    },
  },
]
`);
  });

  test("border", async () => {
    const tailwindClasses = `border border-sky-500`;

    expect(await parseTailwindToWebstudio(tailwindClasses)).toEqual([
      {
        property: "borderTopWidth",
        value: { type: "unit", unit: "px", value: 1 },
      },
      {
        property: "borderRightWidth",
        value: { type: "unit", unit: "px", value: 1 },
      },
      {
        property: "borderBottomWidth",
        value: { type: "unit", unit: "px", value: 1 },
      },
      {
        property: "borderLeftWidth",
        value: { type: "unit", unit: "px", value: 1 },
      },
      {
        property: "borderTopColor",
        value: { alpha: 1, b: 233, g: 165, r: 14, type: "rgb" },
      },
      {
        property: "borderRightColor",
        value: { alpha: 1, b: 233, g: 165, r: 14, type: "rgb" },
      },
      {
        property: "borderBottomColor",
        value: { alpha: 1, b: 233, g: 165, r: 14, type: "rgb" },
      },
      {
        property: "borderLeftColor",
        value: { alpha: 1, b: 233, g: 165, r: 14, type: "rgb" },
      },
      {
        property: "borderTopStyle",
        value: { type: "keyword", value: "solid" },
      },
      {
        property: "borderRightStyle",
        value: { type: "keyword", value: "solid" },
      },
      {
        property: "borderBottomStyle",
        value: { type: "keyword", value: "solid" },
      },
      {
        property: "borderLeftStyle",
        value: { type: "keyword", value: "solid" },
      },
    ]);
  });
});

describe("parseTailwindToCss", () => {
  test("substitute variables - gradient", async () => {
    const tailwindClasses = `bg-gradient-to-r from-indigo-500`;

    expect(await parseTailwindToCss(tailwindClasses)).toMatchInlineSnapshot(
      `".bg-gradient-to-r{background-image:linear-gradient(to right,rgb(99 102 241/1) 0%,rgb(99 102 241/0) 100%)}"`
    );
  });

  test("substitute variables - transform", async () => {
    const tailwindClasses = `translate-x-0 rotate-3`;

    expect(await parseTailwindToCss(tailwindClasses)).toMatchInlineSnapshot(
      `".translate-x-0{transform:translateX(0) translateY(0) translateZ(0) rotate(3deg) rotateX(0) rotateY(0) rotateZ(0) skewX(0) skewY(0) scaleX(1) scaleY(1) scaleZ(1)}.rotate-3{transform:translateX(0) translateY(0) translateZ(0) rotate(3deg) rotateX(0) rotateY(0) rotateZ(0) skewX(0) skewY(0) scaleX(1) scaleY(1) scaleZ(1)}"`
    );
  });

  test("substitute variables - shadows", async () => {
    const tailwindClasses = `shadow`;

    expect(await parseTailwindToCss(tailwindClasses)).toMatchInlineSnapshot(
      `".shadow{box-shadow:0 0 rgb(0 0 0/0),0 0 rgb(0 0 0/0),0 1px 3px 0 rgb(0 0 0/0.1),0 1px 2px -1px rgb(0 0 0/0.1)}"`
    );
  });

  test("substitute variables skipping pseudo and media selectors", async () => {
    const tailwindClasses = `shadow`;
    const tailwindClassesWithPseudoAndMedia = `shadow hover:shadow-md md:shadow-lg`;

    expect(await parseTailwindToCss(tailwindClasses)).toBe(
      await parseTailwindToCss(tailwindClassesWithPseudoAndMedia)
    );
  });

  test("warn if variable is not defined and omits property and empty selectors", async () => {
    const tailwindClasses = `bg-gradient-to-r`;
    const warn = vi.fn();

    expect(
      await parseTailwindToCss(tailwindClasses, warn)
    ).toMatchInlineSnapshot(`""`);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      true,
      'Variable var(--un-gradient-stops) cannot be resolved for property "background-image:linear-gradient(to right,var(--un-gradient-stops))" in selector ".bg-gradient-to-r"'
    );
  });
});
