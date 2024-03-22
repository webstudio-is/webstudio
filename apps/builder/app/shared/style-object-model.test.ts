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
    getComputedStyleDecl({ model, styleSelector, property: "width" })
      .computedValue
  ).toEqual({ type: "unit", unit: "px", value: 10 });
  // initial for not inherited property
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "height" })
      .computedValue
  ).toEqual({ type: "keyword", value: "auto" });
  // initial for inherited property
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" })
      .computedValue
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
    getComputedStyleDecl({ model, styleSelector, property: "width" })
      .computedValue
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
    getComputedStyleDecl({ model, styleSelector, property: "width" })
      .computedValue
  ).toEqual({ type: "unit", unit: "px", value: 10 });
  // should inherit initial value as height is not inherited
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "height" })
      .computedValue
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
    getComputedStyleDecl({ model, styleSelector, property: "width" })
      .computedValue
  ).toEqual({ type: "keyword", value: "auto" });
  // when property is inherited use inherited value
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" })
      .computedValue
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
    getComputedStyleDecl({ model, styleSelector, property: "color" })
      .computedValue
  ).toEqual({ type: "keyword", value: "blue" });
  // not inherited value
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "width" })
      .computedValue
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
  ).toEqual(
    expect.objectContaining({
      computedValue: { type: "keyword", value: "currentcolor" },
      usedValue: { type: "keyword", value: "blue" },
    })
  );
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "backgroundColor" })
  ).toEqual(
    expect.objectContaining({
      computedValue: { type: "keyword", value: "currentColor" },
      usedValue: { type: "keyword", value: "blue" },
    })
  );
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
    getComputedStyleDecl({ model, styleSelector, property: "color" })
  ).toEqual(
    expect.objectContaining({
      computedValue: { type: "keyword", value: "currentcolor" },
      usedValue: { type: "keyword", value: "blue" },
    })
  );
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
    getComputedStyleDecl({ model, styleSelector, property: "color" })
  ).toEqual(
    expect.objectContaining({
      computedValue: { type: "keyword", value: "currentcolor" },
      usedValue: { type: "keyword", value: "black" },
    })
  );
});
