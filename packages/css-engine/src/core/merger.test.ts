import { expect, test } from "@jest/globals";
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

test("should not merge border with initial", () => {
  expect(
    toStringMap(
      mergeStyles(
        new Map([
          ["border-width", { type: "keyword", value: "initial" }],
          ["border-style", { type: "keyword", value: "solid" }],
          ["border-color", { type: "keyword", value: "red" }],
        ])
      )
    )
  ).toEqual([
    ["border-width", "initial"],
    ["border-style", "solid"],
    ["border-color", "red"],
  ]);
});

test("merge border with vars", () => {
  expect(
    toStringMap(
      mergeStyles(
        new Map([
          ["border-width", { type: "var", value: "width", fallbacks: [] }],
          ["border-style", { type: "var", value: "style", fallbacks: [] }],
          ["border-color", { type: "var", value: "color", fallbacks: [] }],
        ])
      )
    )
  ).toEqual([["border", "var(--width) var(--style) var(--color)"]]);
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
