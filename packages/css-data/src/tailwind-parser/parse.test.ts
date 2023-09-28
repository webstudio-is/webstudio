import { describe, expect, it as test, jest } from "@jest/globals";

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
            "type": "unparsed",
            "value": "linear-gradient(to right,rgba(99,102,241,1) 0%,rgba(99,102,241,0) 100%)"
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
  test("expand margins", async () => {
    const tailwindClasses = `m-4`;

    expect(await parseTailwindToWebstudio(tailwindClasses))
      .toMatchInlineSnapshot(`
[
  {
    "property": "marginBottom",
    "value": {
      "type": "unit",
      "unit": "rem",
      "value": 1,
    },
  },
  {
    "property": "marginLeft",
    "value": {
      "type": "unit",
      "unit": "rem",
      "value": 1,
    },
  },
  {
    "property": "marginRight",
    "value": {
      "type": "unit",
      "unit": "rem",
      "value": 1,
    },
  },
  {
    "property": "marginTop",
    "value": {
      "type": "unit",
      "unit": "rem",
      "value": 1,
    },
  },
]
`);
  });

  test("substitute variables - gradient", async () => {
    const tailwindClasses = `bg-gradient-to-r from-indigo-500`;

    expect(await parseTailwindToWebstudio(tailwindClasses))
      .toMatchInlineSnapshot(`
[
  {
    "property": "backgroundImage",
    "value": {
      "type": "unparsed",
      "value": "linear-gradient(to right,rgba(99,102,241,1) 0%,rgba(99,102,241,0) 100%)",
    },
  },
]
`);
  });
});

describe("parseTailwindToCss", () => {
  test("expand margins", async () => {
    const tailwindClasses = `m-4`;

    expect(await parseTailwindToCss(tailwindClasses)).toMatchInlineSnapshot(
      `".mb-4{margin-bottom:1rem}.ml-4{margin-left:1rem}.mr-4{margin-right:1rem}.mt-4{margin-top:1rem}"`
    );
  });

  test("substitute variables - gradient", async () => {
    const tailwindClasses = `bg-gradient-to-r from-indigo-500`;

    expect(await parseTailwindToCss(tailwindClasses)).toMatchInlineSnapshot(
      `".bg-gradient-to-r{background-image:linear-gradient(to right,rgba(99,102,241,1) 0%,rgba(99,102,241,0) 100%)}"`
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
      `".shadow{box-shadow:0 0 rgba(0,0,0,0),0 0 rgba(0,0,0,0),0 1px 3px 0 rgba(0,0,0,0.1),0 1px 2px -1px rgba(0,0,0,0.1)}"`
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
    const warn = jest.fn();

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
