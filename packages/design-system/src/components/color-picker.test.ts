import { describe, test, expect } from "vitest";
import type { ColorSpace } from "hdr-color-input";
import type { ColorValue } from "@webstudio-is/css-engine";
import { __testing__ } from "./color-picker";
const { cssStringToStyleValue, shouldCommitColorChange } = __testing__;

describe("shouldCommitColorChange", () => {
  test("returns false when values serialize identically", () => {
    expect(
      shouldCommitColorChange(
        {
          type: "color",
          colorSpace: "srgb",
          components: [1, 0, 0],
          alpha: 1,
        },
        {
          type: "color",
          colorSpace: "srgb",
          components: [1, 0, 0],
          alpha: 1,
        }
      )
    ).toBe(false);
  });

  test("returns true when values differ", () => {
    expect(
      shouldCommitColorChange(
        {
          type: "color",
          colorSpace: "srgb",
          components: [1, 0, 0],
          alpha: 1,
        },
        {
          type: "color",
          colorSpace: "srgb",
          components: [0, 1, 0],
          alpha: 1,
        }
      )
    ).toBe(true);
  });
});

// All ColorSpace values from hdr-color-input and their expected CSS input strings
// (as <color-input> would emit in its change event).
describe("cssStringToStyleValue", () => {
  // Keyed by ColorValue["colorSpace"] so TypeScript errors when a new color
  // space is added to the schema without adding a corresponding test entry.
  const cases = {
    hex: {
      css: "#ff0000",
      space: "hex",
      colorSpace: "hex",
      components: [1, 0, 0],
      alpha: 1,
    },
    srgb: {
      css: "rgb(0 128 255)",
      space: "srgb",
      colorSpace: "srgb",
      components: [0, 0.502, 1],
      alpha: 1,
    },
    hsl: {
      css: "hsl(120 100% 50%)",
      space: "hsl",
      colorSpace: "hsl",
      components: [120, 100, 50],
      alpha: 1,
    },
    hwb: {
      css: "hwb(120 0% 0%)",
      space: "hwb",
      colorSpace: "hwb",
      components: [120, 0, 0],
      alpha: 1,
    },
    lab: {
      css: "lab(50 20 30)",
      space: "lab",
      colorSpace: "lab",
      components: [50, 20, 30],
      alpha: 1,
    },
    lch: {
      css: "lch(50 40 120)",
      space: "lch",
      colorSpace: "lch",
      components: [50, 40, 120],
      alpha: 1,
    },
    oklab: {
      css: "oklab(0.7 0.1 -0.1)",
      space: "oklab",
      colorSpace: "oklab",
      components: [0.7, 0.1, -0.1],
      alpha: 1,
    },
    oklch: {
      css: "oklch(0.7 0.1 180)",
      space: "oklch",
      colorSpace: "oklch",
      components: [0.7, 0.1, 180],
      alpha: 1,
    },
    "srgb-linear": {
      css: "color(srgb-linear 1 0 0)",
      space: "srgb-linear",
      colorSpace: "srgb-linear",
      components: [1, 0, 0],
      alpha: 1,
    },
    // display-p3 CSS name maps to internal p3 color space
    p3: {
      css: "color(display-p3 0.4 0.6 0.3)",
      space: "display-p3",
      colorSpace: "p3",
      components: [0.4, 0.6, 0.3],
      alpha: 1,
    },
    // a98-rgb CSS name maps to internal a98rgb color space
    a98rgb: {
      css: "color(a98-rgb 0.4 0.6 0.3)",
      space: "a98-rgb",
      colorSpace: "a98rgb",
      components: [0.4, 0.6, 0.3],
      alpha: 1,
    },
    prophoto: {
      css: "color(prophoto-rgb 0.4 0.6 0.3)",
      space: "prophoto",
      colorSpace: "prophoto",
      components: [0.4, 0.6, 0.3],
      alpha: 1,
    },
    rec2020: {
      css: "color(rec2020 0.4 0.6 0.3)",
      space: "rec2020",
      colorSpace: "rec2020",
      components: [0.4, 0.6, 0.3],
      alpha: 1,
    },
    "xyz-d65": {
      css: "color(xyz-d65 0.4 0.6 0.3)",
      space: "xyz-d65",
      colorSpace: "xyz-d65",
      components: [0.4, 0.6, 0.3],
      alpha: 1,
    },
    "xyz-d50": {
      css: "color(xyz-d50 0.4 0.6 0.3)",
      space: "xyz-d50",
      colorSpace: "xyz-d50",
      components: [0.4, 0.6, 0.3],
      alpha: 1,
    },
  } satisfies Record<
    ColorValue["colorSpace"],
    { space: ColorSpace; [k: string]: unknown }
  >;

  for (const [
    key,
    { css, space, colorSpace, components, alpha },
  ] of Object.entries(cases)) {
    test(key, () => {
      expect(cssStringToStyleValue(css, space as ColorSpace)).toEqual({
        type: "color",
        colorSpace,
        components,
        alpha,
      });
    });
  }

  test("xyz alias maps to xyz-d65", () => {
    expect(cssStringToStyleValue("color(xyz 0.4 0.6 0.3)", "xyz")).toEqual({
      type: "color",
      colorSpace: "xyz-d65",
      components: [0.4, 0.6, 0.3],
      alpha: 1,
    });
  });

  test("hex with alpha", () => {
    expect(cssStringToStyleValue("#ff000080", "hex")).toEqual({
      type: "color",
      colorSpace: "hex",
      components: [1, 0, 0],
      alpha: 0.502,
    });
  });

  test("alpha channel is preserved", () => {
    expect(cssStringToStyleValue("oklch(0.7 0.1 180 / 0.5)", "oklch")).toEqual({
      type: "color",
      colorSpace: "oklch",
      components: [0.7, 0.1, 180],
      alpha: 0.5,
    });
  });
});
