import { expect, test } from "@jest/globals";
import type { StyleDecl, StyleSource } from "@webstudio-is/sdk";
import {
  type StyleObjectModel,
  type StyleSelector,
  getComputedStyleDecl,
} from "./style-object-model";

const getStyleByStyleSourceId = (styles: StyleDecl[]) => {
  const styleByStyleSourceId = new Map<
    StyleSource["id"],
    Map<StyleDecl["property"], StyleDecl>
  >();
  for (const styleDecl of styles) {
    const styleSourceStyles =
      styleByStyleSourceId.get(styleDecl.styleSourceId) ?? new Map();
    styleByStyleSourceId.set(styleDecl.styleSourceId, styleSourceStyles);
    styleSourceStyles.set(styleDecl.property, styleDecl);
  }
  return styleByStyleSourceId;
};

test("use cascaded style when specified and fallback to initial value", () => {
  const styles: StyleDecl[] = [
    {
      breakpointId: "base",
      styleSourceId: "bodyLocal",
      property: "width",
      value: { type: "unit", value: 10, unit: "px" },
    },
  ];
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([["body", ["bodyLocal"]]]),
    styleByStyleSourceId: getStyleByStyleSourceId(styles),
  };
  const styleSelector: StyleSelector = {
    instanceSelector: ["body"],
  };
  // cascaded property
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "width" }).usedValue
  ).toEqual({ type: "unit", unit: "px", value: 10 });
  // initial for not inherited property
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "height" }).usedValue
  ).toEqual({ type: "keyword", value: "auto" });
  // initial for inherited property
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "keyword", value: "black" });
});

test("support initial keyword", () => {
  const styles: StyleDecl[] = [
    {
      breakpointId: "base",
      styleSourceId: "bodyLocal",
      property: "width",
      value: { type: "keyword", value: "initial" },
    },
  ];
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([["body", ["bodyLocal"]]]),
    styleByStyleSourceId: getStyleByStyleSourceId(styles),
  };
  const styleSelector: StyleSelector = {
    instanceSelector: ["body"],
  };
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "width" }).usedValue
  ).toEqual({ type: "keyword", value: "auto" });
});

test("support inherit keyword", () => {
  const styles: StyleDecl[] = [
    {
      breakpointId: "base",
      styleSourceId: "level2Local",
      property: "width",
      value: { type: "unit", value: 10, unit: "px" },
    },
    {
      breakpointId: "base",
      styleSourceId: "level3Local",
      property: "width",
      value: { type: "keyword", value: "inherit" },
    },
    {
      breakpointId: "base",
      styleSourceId: "level1Local",
      property: "height",
      value: { type: "unit", value: 20, unit: "px" },
    },
    {
      breakpointId: "base",
      styleSourceId: "level3Local",
      property: "height",
      value: { type: "keyword", value: "inherit" },
    },
  ];
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([
      ["level3", ["level3Local"]],
      ["level2", ["level2Local"]],
      ["level1", ["level1Local"]],
    ]),
    styleByStyleSourceId: getStyleByStyleSourceId(styles),
  };
  const styleSelector: StyleSelector = {
    instanceSelector: ["level3", "level2", "level1"],
  };
  // should inherit declared value
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "width" }).usedValue
  ).toEqual({ type: "unit", unit: "px", value: 10 });
  // should inherit initial value as height is not inherited
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "height" }).usedValue
  ).toEqual({ type: "keyword", value: "auto" });
});

test("support unset keyword", () => {
  const styles: StyleDecl[] = [
    {
      breakpointId: "base",
      styleSourceId: "level2Local",
      property: "width",
      value: { type: "unit", value: 10, unit: "px" },
    },
    {
      breakpointId: "base",
      styleSourceId: "level2Local",
      property: "width",
      value: { type: "keyword", value: "unset" },
    },
    {
      breakpointId: "base",
      styleSourceId: "level1Local",
      property: "color",
      value: { type: "keyword", value: "blue" },
    },
    {
      breakpointId: "base",
      styleSourceId: "level2Local",
      property: "color",
      value: { type: "keyword", value: "unset" },
    },
  ];
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([
      ["level2", ["level2Local"]],
      ["level1", ["level1Local"]],
    ]),
    styleByStyleSourceId: getStyleByStyleSourceId(styles),
  };
  const styleSelector: StyleSelector = {
    instanceSelector: ["level2", "level1"],
  };
  // when property is not inherited use initial value
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "width" }).usedValue
  ).toEqual({ type: "keyword", value: "auto" });
  // when property is inherited use inherited value
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "keyword", value: "blue" });
});

test("inherit style from ancestors", () => {
  const styles: StyleDecl[] = [
    {
      breakpointId: "base",
      styleSourceId: "level1Local",
      property: "color",
      value: { type: "keyword", value: "blue" },
    },
    {
      breakpointId: "base",
      styleSourceId: "level1Local",
      property: "width",
      value: { type: "unit", value: 10, unit: "px" },
    },
  ];
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([
      ["level3", ["level3Local"]],
      ["level2", ["level2Local"]],
      ["level1", ["level1Local"]],
    ]),
    styleByStyleSourceId: getStyleByStyleSourceId(styles),
  };
  const styleSelector: StyleSelector = {
    instanceSelector: ["level3", "level2", "level1"],
  };
  // inherited value
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "keyword", value: "blue" });
  // not inherited value
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "width" }).usedValue
  ).toEqual({ type: "keyword", value: "auto" });
});

test("support currentcolor keyword", () => {
  const styles: StyleDecl[] = [
    {
      breakpointId: "base",
      styleSourceId: "level1Local",
      property: "color",
      value: { type: "keyword", value: "blue" },
    },
    {
      breakpointId: "base",
      styleSourceId: "level2Local",
      property: "borderTopColor",
      // support lower case
      value: { type: "keyword", value: "currentcolor" },
    },
    {
      breakpointId: "base",
      styleSourceId: "level2Local",
      property: "backgroundColor",
      // support camel case
      value: { type: "keyword", value: "currentColor" },
    },
  ];
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([
      ["level2", ["level2Local"]],
      ["level1", ["level1Local"]],
    ]),
    styleByStyleSourceId: getStyleByStyleSourceId(styles),
  };
  const styleSelector: StyleSelector = {
    instanceSelector: ["level2", "level1"],
  };
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "borderTopColor" })
      .usedValue
  ).toEqual({ type: "keyword", value: "blue" });
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "backgroundColor" })
      .usedValue
  ).toEqual({ type: "keyword", value: "blue" });
});

test("in color property currentcolor is inherited", () => {
  const styles: StyleDecl[] = [
    {
      breakpointId: "base",
      styleSourceId: "level1Local",
      property: "color",
      value: { type: "keyword", value: "blue" },
    },
    {
      breakpointId: "base",
      styleSourceId: "level2Local",
      property: "color",
      value: { type: "keyword", value: "currentcolor" },
    },
    {
      breakpointId: "base",
      styleSourceId: "level3Local",
      property: "color",
      value: { type: "keyword", value: "currentcolor" },
    },
  ];
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([
      ["level3", ["level3Local"]],
      ["level2", ["level2Local"]],
      ["level1", ["level1Local"]],
    ]),
    styleByStyleSourceId: getStyleByStyleSourceId(styles),
  };
  const styleSelector: StyleSelector = {
    instanceSelector: ["level3", "level2", "level1"],
  };
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "keyword", value: "blue" });
});

test("in root color property currentcolor is initial", () => {
  const styles: StyleDecl[] = [
    {
      breakpointId: "base",
      styleSourceId: "bodyLocal",
      property: "color",
      value: { type: "keyword", value: "currentcolor" },
    },
  ];
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([["body", ["bodyLocal"]]]),
    styleByStyleSourceId: getStyleByStyleSourceId(styles),
  };
  const styleSelector: StyleSelector = {
    instanceSelector: ["body"],
  };
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "keyword", value: "black" });
});

test("support custom properties", () => {
  const styles: StyleDecl[] = [
    {
      breakpointId: "base",
      styleSourceId: "bodyLocal",
      property: "--my-property",
      value: { type: "keyword", value: "blue" },
    },
    {
      breakpointId: "base",
      styleSourceId: "bodyLocal",
      property: "color",
      value: { type: "var", value: "--my-property", fallbacks: [] },
    },
  ];
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([["body", ["bodyLocal"]]]),
    styleByStyleSourceId: getStyleByStyleSourceId(styles),
  };
  const styleSelector: StyleSelector = {
    instanceSelector: ["body"],
  };
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "--my-property" })
      .usedValue
  ).toEqual({ type: "keyword", value: "blue" });
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "keyword", value: "blue" });
});

test("use fallback value when custom property does not exist", () => {
  const styles: StyleDecl[] = [
    {
      breakpointId: "base",
      styleSourceId: "bodyLocal",
      property: "color",
      value: {
        type: "var",
        value: "--my-property",
        fallbacks: [{ type: "keyword", value: "red" }],
      },
    },
  ];
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([["body", ["bodyLocal"]]]),
    styleByStyleSourceId: getStyleByStyleSourceId(styles),
  };
  const styleSelector: StyleSelector = {
    instanceSelector: ["body"],
  };
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "keyword", value: "red" });
});

test("use initial value when custom property does not exist", () => {
  const styles: StyleDecl[] = [
    {
      breakpointId: "base",
      styleSourceId: "bodyLocal",
      property: "color",
      value: { type: "var", value: "--my-property", fallbacks: [] },
    },
  ];
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([["body", ["bodyLocal"]]]),
    styleByStyleSourceId: getStyleByStyleSourceId(styles),
  };
  const styleSelector: StyleSelector = {
    instanceSelector: ["body"],
  };
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "keyword", value: "black" });
});

test("use inherited value when custom property does not exist", () => {
  const styles: StyleDecl[] = [
    {
      breakpointId: "base",
      styleSourceId: "bodyLocal",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
    {
      breakpointId: "base",
      styleSourceId: "bodyLocal",
      property: "width",
      value: { type: "keyword", value: "fit-content" },
    },
    {
      breakpointId: "base",
      styleSourceId: "boxLocal",
      property: "color",
      value: { type: "var", value: "--my-property", fallbacks: [] },
    },
    {
      breakpointId: "base",
      styleSourceId: "boxLocal",
      property: "width",
      value: { type: "var", value: "--my-property", fallbacks: [] },
    },
  ];
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([
      ["body", ["bodyLocal"]],
      ["box", ["boxLocal"]],
    ]),
    styleByStyleSourceId: getStyleByStyleSourceId(styles),
  };
  const styleSelector: StyleSelector = {
    instanceSelector: ["box", "body"],
  };
  // inherited property use inherited value
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "keyword", value: "red" });
  // not inherited property use initial value
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "width" }).usedValue
  ).toEqual({ type: "keyword", value: "auto" });
});

test("inherit custom property", () => {
  const styles: StyleDecl[] = [
    {
      breakpointId: "base",
      styleSourceId: "level1Local",
      property: "--my-property",
      value: { type: "keyword", value: "blue" },
    },
    {
      breakpointId: "base",
      styleSourceId: "level3Local",
      property: "color",
      value: { type: "var", value: "--my-property", fallbacks: [] },
    },
  ];
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([
      ["level3", ["level3Local"]],
      ["level2", ["level2Local"]],
      ["level1", ["level1Local"]],
    ]),
    styleByStyleSourceId: getStyleByStyleSourceId(styles),
  };
  const styleSelector: StyleSelector = {
    instanceSelector: ["level3", "level2", "level1"],
  };
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "--my-property" })
      .usedValue
  ).toEqual({ type: "keyword", value: "blue" });
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "keyword", value: "blue" });
});

test("resolve dependency cycles in custom properties", () => {
  // .body { --color: red; }
  // .box { --color: var(--another); --another: var(--color); background-color: var(--color) }
  const styles: StyleDecl[] = [
    {
      breakpointId: "base",
      styleSourceId: "bodyLocal",
      property: "--color",
      value: { type: "keyword", value: "red" },
    },
    {
      breakpointId: "base",
      styleSourceId: "boxLocal",
      property: "--color",
      value: { type: "var", value: "--another", fallbacks: [] },
    },
    {
      breakpointId: "base",
      styleSourceId: "boxLocal",
      property: "--another",
      value: { type: "var", value: "--color", fallbacks: [] },
    },
    {
      breakpointId: "base",
      styleSourceId: "boxLocal",
      property: "color",
      value: { type: "var", value: "--color", fallbacks: [] },
    },
  ];
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([
      ["body", ["bodyLocal"]],
      ["box", ["boxLocal"]],
    ]),
    styleByStyleSourceId: getStyleByStyleSourceId(styles),
  };
  const styleSelector: StyleSelector = {
    instanceSelector: ["box", "body"],
  };
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "keyword", value: "black" });
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "--color" })
      .usedValue
  ).toEqual({ type: "invalid", value: "" });
});

test("resolve non-cyclic references in custom properties", () => {
  // .body { --color: red; --another: var(--color); }
  // .box { --color: var(--another); background-color: var(--color) }
  const styles: StyleDecl[] = [
    {
      breakpointId: "base",
      styleSourceId: "bodyLocal",
      property: "--color",
      value: { type: "keyword", value: "red" },
    },
    {
      breakpointId: "base",
      styleSourceId: "bodyLocal",
      property: "--another",
      value: { type: "var", value: "--color", fallbacks: [] },
    },
    {
      breakpointId: "base",
      styleSourceId: "boxLocal",
      property: "--color",
      value: { type: "var", value: "--another", fallbacks: [] },
    },
    // same custom property name is defined in parent
    {
      breakpointId: "base",
      styleSourceId: "boxLocal",
      property: "color",
      value: { type: "var", value: "--color", fallbacks: [] },
    },
  ];
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([
      ["body", ["bodyLocal"]],
      ["box", ["boxLocal"]],
    ]),
    styleByStyleSourceId: getStyleByStyleSourceId(styles),
  };
  const styleSelector: StyleSelector = {
    instanceSelector: ["box", "body"],
  };
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "keyword", value: "red" });
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "--color" })
      .usedValue
  ).toEqual({ type: "keyword", value: "red" });
});
