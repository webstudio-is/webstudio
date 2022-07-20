import { type CssRule, initialBreakpoints, type Breakpoint } from "../css";
import { toCss } from "./to-css";

const breakpoints: Array<Breakpoint> = initialBreakpoints.map(
  (breakpoint, index) => ({
    ...breakpoint,
    id: String(index),
    projectId: "projectId",
  })
);

describe("Convert WS CSS rules to stitches", () => {
  test("basic", () => {
    const cssRules: Array<CssRule> = [
      {
        style: {
          color: {
            type: "keyword",
            value: "red",
          },
        },
        breakpoint: "0",
      },
    ];
    const stitchesCss = toCss(cssRules, breakpoints);
    expect(stitchesCss).toEqual({
      "@0": {
        color: "red",
      },
    });
  });

  test("sort order based on maxWidth in breakpoints", () => {
    const cssRules: Array<CssRule> = [
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
    ];

    const stitchesCss = toCss(cssRules, breakpoints);
    expect(Object.keys(stitchesCss)).toStrictEqual(["@0", "@1", "@2"]);
  });
});
