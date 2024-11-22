import { expect, test } from "vitest";
import type { StyleValue } from "../schema";
import { mergeStyles } from "./merger";
import type { StyleMap } from "./rules";
import { toValue } from "./to-value";

const toStringMap = (style: StyleMap) =>
  Array.from(
    style.entries(),
    ([property, value]) => [property, toValue(value)] as const
  );

test("merge border when all parts are set", () => {
  expect(
    toStringMap(
      mergeStyles(
        new Map([
          ["border-top-width", { type: "unit", value: 1, unit: "px" }],
          ["border-top-style", { type: "keyword", value: "solid" }],
          ["border-top-color", { type: "keyword", value: "red" }],
        ])
      )
    )
  ).toEqual([["border-top", "1px solid red"]]);
  expect(
    toStringMap(
      mergeStyles(
        new Map([
          ["border-width", { type: "unit", value: 1, unit: "px" }],
          ["border-style", { type: "keyword", value: "solid" }],
          ["border-color", { type: "keyword", value: "red" }],
        ])
      )
    )
  ).toEqual([["border", "1px solid red"]]);
  expect(
    toStringMap(
      mergeStyles(
        new Map([
          ["border-width", { type: "unit", value: 1, unit: "px" }],
          ["border-style", { type: "keyword", value: "solid" }],
        ])
      )
    )
  ).toEqual([
    ["border-width", "1px"],
    ["border-style", "solid"],
  ]);
});

test("merge border with vars", () => {
  expect(
    toStringMap(
      mergeStyles(
        new Map([
          ["border-width", { type: "var", value: "width" }],
          ["border-style", { type: "var", value: "style" }],
          ["border-color", { type: "var", value: "color" }],
        ])
      )
    )
  ).toEqual([["border", "var(--width) var(--style) var(--color)"]]);
});

test("should not merge border with initial, inherit or unset", () => {
  expect(
    toStringMap(
      mergeStyles(
        new Map([
          [
            "border-width",
            {
              type: "var",
              value: "width",
              fallback: { type: "keyword", value: "unset" },
            },
          ],
          ["border-style", { type: "var", value: "style" }],
          ["border-color", { type: "var", value: "color" }],
        ])
      )
    )
  ).toEqual([
    ["border-width", "var(--width, unset)"],
    ["border-style", "var(--style)"],
    ["border-color", "var(--color)"],
  ]);
});

test("merge margin/padding when the same value is set", () => {
  expect(
    toStringMap(
      mergeStyles(
        new Map([
          ["margin-top", { type: "unit", value: 10, unit: "px" }],
          ["margin-right", { type: "unit", value: 10, unit: "px" }],
          ["margin-bottom", { type: "unit", value: 10, unit: "px" }],
          ["margin-left", { type: "unit", value: 10, unit: "px" }],
        ])
      )
    )
  ).toEqual([["margin", "10px"]]);
  expect(
    toStringMap(
      mergeStyles(
        new Map([
          ["padding-top", { type: "unit", value: 10, unit: "px" }],
          ["padding-right", { type: "unit", value: 10, unit: "px" }],
          ["padding-bottom", { type: "unit", value: 10, unit: "px" }],
          ["padding-left", { type: "unit", value: 10, unit: "px" }],
        ])
      )
    )
  ).toEqual([["padding", "10px"]]);
  expect(
    toStringMap(
      mergeStyles(
        new Map([
          ["padding-top", { type: "unit", value: 10, unit: "px" }],
          ["padding-right", { type: "unit", value: 10, unit: "px" }],
          ["padding-bottom", { type: "unit", value: 10, unit: "px" }],
        ])
      )
    )
  ).toEqual([
    ["padding-top", "10px"],
    ["padding-right", "10px"],
    ["padding-bottom", "10px"],
  ]);
  expect(
    toStringMap(
      mergeStyles(
        new Map([
          ["padding-top", { type: "unit", value: 1, unit: "px" }],
          ["padding-right", { type: "unit", value: 2, unit: "px" }],
          ["padding-bottom", { type: "unit", value: 10, unit: "px" }],
          ["padding-left", { type: "unit", value: 10, unit: "px" }],
        ])
      )
    )
  ).toEqual([
    ["padding-top", "1px"],
    ["padding-right", "2px"],
    ["padding-bottom", "10px"],
    ["padding-left", "10px"],
  ]);
});

test("merge border longhands", () => {
  expect(
    toStringMap(
      mergeStyles(
        new Map([
          ["border-top-width", { type: "unit", value: 1, unit: "px" }],
          ["border-top-style", { type: "keyword", value: "solid" }],
          ["border-top-color", { type: "keyword", value: "red" }],
          ["border-right-width", { type: "unit", value: 1, unit: "px" }],
          ["border-right-style", { type: "keyword", value: "solid" }],
          ["border-right-color", { type: "keyword", value: "red" }],
          ["border-bottom-width", { type: "unit", value: 1, unit: "px" }],
          ["border-bottom-style", { type: "keyword", value: "solid" }],
          ["border-bottom-color", { type: "keyword", value: "red" }],
          ["border-left-width", { type: "unit", value: 1, unit: "px" }],
          ["border-left-style", { type: "keyword", value: "solid" }],
          ["border-left-color", { type: "keyword", value: "red" }],
        ])
      )
    )
  ).toEqual([["border", "1px solid red"]]);
});

const mergeKeywords = (list: [property: string, keyword: string][]) => {
  const styleMap: StyleMap = new Map();
  for (const [property, value] of list) {
    styleMap.set(property, { type: "keyword", value });
  }
  return toStringMap(mergeStyles(styleMap));
};

test("merge white-space-collapse and text-wrap-mode into white-space", () => {
  expect(
    mergeKeywords([
      ["white-space-collapse", "collapse"],
      ["text-wrap-mode", "wrap"],
    ])
  ).toEqual([
    ["white-space", "normal"],
    ["white-space-collapse", "collapse"],
  ]);
  expect(
    mergeKeywords([
      ["white-space-collapse", "collapse"],
      ["text-wrap-mode", "nowrap"],
    ])
  ).toEqual([
    ["white-space", "nowrap"],
    ["white-space-collapse", "collapse"],
  ]);
  expect(
    mergeKeywords([
      ["white-space-collapse", "preserve"],
      ["text-wrap-mode", "nowrap"],
    ])
  ).toEqual([
    ["white-space", "pre"],
    ["white-space-collapse", "preserve"],
  ]);
  expect(
    mergeKeywords([
      ["white-space-collapse", "preserve"],
      ["text-wrap-mode", "wrap"],
    ])
  ).toEqual([
    ["white-space", "pre-wrap"],
    ["white-space-collapse", "preserve"],
  ]);
  expect(
    mergeKeywords([
      ["white-space-collapse", "preserve-breaks"],
      ["text-wrap-mode", "wrap"],
    ])
  ).toEqual([
    ["white-space", "pre-line"],
    ["white-space-collapse", "preserve-breaks"],
  ]);
  expect(
    mergeKeywords([
      ["white-space-collapse", "preserve-spaces"],
      ["text-wrap-mode", "wrap"],
    ])
  ).toEqual([
    ["white-space", "normal"],
    ["white-space-collapse", "preserve-spaces"],
  ]);
});

test("merge white-space with vars", () => {
  expect(
    toStringMap(
      mergeStyles(
        new Map([["white-space-collapse", { type: "var", value: "collapse" }]])
      )
    )
  ).toEqual([["white-space-collapse", "var(--collapse)"]]);
});

test("merge text-wrap-mode and text-wrap-style into text-wrap", () => {
  expect(
    mergeKeywords([
      ["text-wrap-mode", "wrap"],
      ["text-wrap-style", "balance"],
    ])
  ).toEqual([
    ["white-space", "normal"],
    ["text-wrap", "balance"],
  ]);
  expect(
    mergeKeywords([
      ["text-wrap-mode", "wrap"],
      ["text-wrap-style", "stable"],
    ])
  ).toEqual([
    ["white-space", "normal"],
    ["text-wrap", "stable"],
  ]);
  expect(
    mergeKeywords([
      ["text-wrap-mode", "wrap"],
      ["text-wrap-style", "pretty"],
    ])
  ).toEqual([
    ["white-space", "normal"],
    ["text-wrap", "pretty"],
  ]);
  expect(
    mergeKeywords([
      ["text-wrap-mode", "wrap"],
      ["text-wrap-style", "auto"],
    ])
  ).toEqual([
    ["white-space", "normal"],
    ["text-wrap", "wrap"],
  ]);
  expect(mergeKeywords([["text-wrap-style", "auto"]])).toEqual([
    ["text-wrap", "wrap"],
  ]);
});

test("merge text-wrap with vars", () => {
  expect(
    toStringMap(
      mergeStyles(
        new Map([
          ["text-wrap-mode", { type: "var", value: "mode" }],
          ["text-wrap-style", { type: "var", value: "style" }],
        ])
      )
    )
  ).toEqual([["text-wrap", "var(--style)"]]);
  expect(
    toStringMap(
      mergeStyles(
        new Map([["text-wrap-style", { type: "var", value: "style" }]])
      )
    )
  ).toEqual([["text-wrap", "var(--style)"]]);
});

const layers = (...keywords: string[]): StyleValue => ({
  type: "layers",
  value: keywords.map((value) => ({ type: "keyword", value })),
});

test("merge background-position-{x,y}", () => {
  expect(
    toStringMap(
      mergeStyles(
        new Map([
          ["background-position-x", layers("right")],
          ["background-position-y", layers("bottom")],
        ])
      )
    )
  ).toEqual([["background-position", "right bottom"]]);
  expect(
    toStringMap(
      mergeStyles(new Map([["background-position-x", layers("right")]]))
    )
  ).toEqual([["background-position-x", "right"]]);
  expect(
    toStringMap(
      mergeStyles(new Map([["background-position-y", layers("bottom")]]))
    )
  ).toEqual([["background-position-y", "bottom"]]);
  expect(
    toStringMap(
      mergeStyles(
        new Map([
          ["background-position-x", layers("right", "left")],
          ["background-position-y", layers("bottom", "top")],
        ])
      )
    )
  ).toEqual([["background-position", "right bottom, left top"]]);
  expect(
    toStringMap(
      mergeStyles(
        new Map([
          ["background-position-x", layers("right", "left")],
          ["background-position-y", layers("bottom")],
        ])
      )
    )
  ).toEqual([
    ["background-position-x", "right, left"],
    ["background-position-y", "bottom"],
  ]);
});
