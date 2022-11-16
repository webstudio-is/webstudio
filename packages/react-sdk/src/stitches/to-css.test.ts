import type { Instance } from "../db";
import { type CssRule, initialBreakpoints, type Breakpoint } from "../css";
import { toCss } from "./to-css";

const breakpoints: Array<Breakpoint> = initialBreakpoints.map(
  (breakpoint, index) => ({
    ...breakpoint,
    id: String(index),
    projectId: "projectId",
  })
);

const createInstance = (cssRules: Array<CssRule>): Instance => {
  return {
    id: "0",
    cssRules,
    component: "Box",
    children: [],
  };
};

describe("Convert WS CSS rules to stitches", () => {
  test("keyword", () => {
    const instance = createInstance([
      {
        style: {
          color: {
            type: "keyword",
            value: "red",
          },
        },
        breakpoint: "0",
      },
    ]);
    const stitchesCss = toCss(instance, breakpoints);
    expect(stitchesCss).toEqual({
      "@0": {
        color: "red",
      },
    });
  });

  test("unit", () => {
    const instance = createInstance([
      {
        style: {
          width: {
            type: "unit",
            value: 10,
            unit: "px",
          },
        },
        breakpoint: "0",
      },
    ]);
    const stitchesCss = toCss(instance, breakpoints);
    expect(stitchesCss).toEqual({
      "@0": {
        width: "10px",
      },
    });
  });

  test("invalid", () => {
    const instance = createInstance([
      {
        style: {
          width: {
            type: "invalid",
            value: "bad",
          },
        },
        breakpoint: "0",
      },
    ]);
    const stitchesCss = toCss(instance, breakpoints);
    expect(stitchesCss).toEqual({
      "@0": {
        width: "bad",
      },
    });
  });

  test("unset", () => {
    const instance = createInstance([
      {
        style: {
          width: {
            type: "unset",
            value: "",
          },
        },
        breakpoint: "0",
      },
    ]);
    const stitchesCss = toCss(instance, breakpoints);
    expect(stitchesCss).toEqual({
      "@0": {
        width: "",
      },
    });
  });

  test("var", () => {
    const instance = createInstance([
      {
        style: {
          width: {
            type: "var",
            value: "namespace",
            fallbacks: [],
          },
        },
        breakpoint: "0",
      },
    ]);
    const stitchesCss = toCss(instance, breakpoints);
    expect(stitchesCss).toEqual({
      "@0": {
        width: "var(--namespace)",
      },
    });
  });

  test("var with fallbacks", () => {
    const instance = createInstance([
      {
        style: {
          width: {
            type: "var",
            value: "namespace",
            fallbacks: [
              {
                type: "keyword",
                value: "normal",
              },
              {
                type: "unit",
                value: 10,
                unit: "px",
              },
            ],
          },
        },
        breakpoint: "0",
      },
    ]);
    const stitchesCss = toCss(instance, breakpoints);
    expect(stitchesCss).toEqual({
      "@0": {
        width: "var(--namespace, normal, 10px)",
      },
    });
  });

  test("fontFamily", () => {
    const instance = createInstance([
      {
        style: {
          fontFamily: {
            type: "fontFamily",
            value: ["Courier New"],
          },
        },
        breakpoint: "0",
      },
    ]);
    const stitchesCss = toCss(instance, breakpoints);
    expect(stitchesCss).toEqual({
      "@0": {
        fontFamily: "Courier New, monospace",
      },
    });
  });

  test("withFallback option", () => {
    const instance = createInstance([
      {
        style: {
          fontFamily: {
            type: "fontFamily",
            value: ["Courier New"],
          },
        },
        breakpoint: "0",
      },
    ]);
    const stitchesCss = toCss(instance, breakpoints, { withFallback: false });
    expect(stitchesCss).toEqual({
      "@0": {
        fontFamily: "Courier New",
      },
    });
  });

  test("sort order based on maxWidth in breakpoints", () => {
    const instance = createInstance([
      {
        style: {
          color: {
            type: "keyword",
            value: "green",
          },
        },
        breakpoint: "2",
      },

      {
        style: {
          color: {
            type: "keyword",
            value: "blue",
          },
        },
        breakpoint: "0",
      },
      {
        style: {
          color: {
            type: "keyword",
            value: "red",
          },
        },
        breakpoint: "1",
      },
    ]);

    const stitchesCss = toCss(instance, breakpoints);
    expect(Object.keys(stitchesCss)).toStrictEqual(["@0", "@1", "@2"]);
  });
});
