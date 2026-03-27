import { describe, test, expect } from "vitest";
import { parseCssValue, isValidDeclaration } from "./parse-css-value";
import {
  toValue,
  type CssProperty,
  type ColorValue,
} from "@webstudio-is/css-engine";

describe("Parse CSS value", () => {
  describe("number value", () => {
    test("unitless", () => {
      expect(parseCssValue("line-height", "10")).toEqual({
        type: "unit",
        unit: "number",
        value: 10,
      });
    });
  });

  describe("unit value", () => {
    test("with unit", () => {
      expect(parseCssValue("width", "10px")).toEqual({
        type: "unit",
        unit: "px",
        value: 10,
      });
    });

    test("empty input", () => {
      expect(parseCssValue("width", "")).toEqual({
        type: "invalid",
        value: "",
      });
    });
  });

  describe("keyword value", () => {
    test("keyword", () => {
      expect(parseCssValue("width", "auto")).toEqual({
        type: "keyword",
        value: "auto",
      });
    });

    test("keyword display block", () => {
      expect(parseCssValue("display", "block")).toEqual({
        type: "keyword",
        value: "block",
      });
    });

    test("keyword with unit", () => {
      expect(parseCssValue("width", "autopx")).toEqual({
        type: "invalid",
        value: "autopx",
      });
    });

    test("invalid", () => {
      // This will return px as a fallback unit, as number is not valid for width.
      expect(parseCssValue("width", "10")).toEqual({
        type: "invalid",
        value: "10",
      });
    });
  });

  describe("Unparesd valid values", () => {
    test("Simple valid function values", () => {
      expect(parseCssValue("width", "calc(4px + 16em)")).toEqual({
        type: "unparsed",
        value: "calc(4px + 16em)",
      });
    });

    test("Invalid function values", () => {
      expect(parseCssValue("width", "blur(4)")).toEqual({
        type: "invalid",
        value: "blur(4)",
      });
    });
  });

  describe("Tuples", () => {
    test("objectPosition", () => {
      expect(parseCssValue("object-position", "left top")).toEqual({
        type: "tuple",
        value: [
          {
            type: "keyword",
            value: "left",
          },
          {
            type: "keyword",
            value: "top",
          },
        ],
      });
    });
  });

  describe("Colors", () => {
    test("Color rgba values", () => {
      expect(parseCssValue("background-color", "rgba(0,0,0,0)")).toEqual({
        type: "color",
        colorSpace: "srgb",
        alpha: 0,
        components: [0, 0, 0],
      });
    });

    test("modern format", () => {
      expect(parseCssValue("background-color", "rgb(99 102 241/0.5)")).toEqual({
        type: "color",
        colorSpace: "srgb",
        alpha: 0.5,
        components: [0.3882, 0.4, 0.9451],
      });
    });

    test("Color rgba values", () => {
      expect(parseCssValue("background-color", "#00220011")).toEqual({
        type: "color",
        colorSpace: "hex",
        alpha: 0.0667,
        components: [0, 0.1333, 0],
      });
    });

    test("Color rgba values", () => {
      expect(parseCssValue("color", "red")).toEqual({
        type: "keyword",
        value: "red",
      });
    });

    test("oklch color", () => {
      expect(
        parseCssValue("background-color", "oklch(59.686% 0.1009 29.234)")
      ).toEqual({
        type: "color",
        colorSpace: "oklch",
        alpha: 1,
        components: [0.5969, 0.1009, 29.234],
      });
    });

    test("oklch color with alpha", () => {
      expect(
        parseCssValue("background-color", "oklch(59.686% 0.1009 29.234 / 0.5)")
      ).toEqual({
        type: "color",
        colorSpace: "oklch",
        alpha: 0.5,
        components: [0.5969, 0.1009, 29.234],
      });
    });

    test("oklch color with modern format", () => {
      expect(parseCssValue("color", "oklch(80% 0.15 240)")).toEqual({
        type: "color",
        colorSpace: "oklch",
        alpha: 1,
        components: [0.8, 0.15, 240],
      });
    });

    test("hsl color", () => {
      expect(parseCssValue("color", "hsl(120 100% 50%)")).toEqual({
        type: "color",
        colorSpace: "hsl",
        alpha: 1,
        components: [120, 100, 50],
      });
    });

    test("hwb color", () => {
      expect(parseCssValue("color", "hwb(120 0% 0%)")).toEqual({
        type: "color",
        colorSpace: "hwb",
        alpha: 1,
        components: [120, 0, 0],
      });
    });

    test("lab color", () => {
      expect(parseCssValue("color", "lab(50 20 30)")).toEqual({
        type: "color",
        colorSpace: "lab",
        alpha: 1,
        components: [50, 20, 30],
      });
    });

    test("lch color", () => {
      expect(parseCssValue("color", "lch(50 40 120)")).toEqual({
        type: "color",
        colorSpace: "lch",
        alpha: 1,
        components: [50, 40, 120],
      });
    });

    test("oklab color", () => {
      expect(parseCssValue("color", "oklab(0.7 0.1 -0.1)")).toEqual({
        type: "color",
        colorSpace: "oklab",
        alpha: 1,
        components: [0.7, 0.1, -0.1],
      });
    });

    test("srgb-linear color", () => {
      expect(parseCssValue("color", "color(srgb-linear 1 0 0)")).toEqual({
        type: "color",
        colorSpace: "srgb-linear",
        alpha: 1,
        components: [1, 0, 0],
      });
    });

    test("display-p3 color", () => {
      expect(parseCssValue("color", "color(display-p3 0.4 0.6 0.3)")).toEqual({
        type: "color",
        colorSpace: "p3",
        alpha: 1,
        components: [0.4, 0.6, 0.3],
      });
    });

    test("a98-rgb color", () => {
      expect(parseCssValue("color", "color(a98-rgb 0.4 0.6 0.3)")).toEqual({
        type: "color",
        colorSpace: "a98rgb",
        alpha: 1,
        components: [0.4, 0.6, 0.3],
      });
    });

    test("prophoto-rgb color", () => {
      expect(parseCssValue("color", "color(prophoto-rgb 0.4 0.6 0.3)")).toEqual(
        {
          type: "color",
          colorSpace: "prophoto",
          alpha: 1,
          components: [0.4, 0.6, 0.3],
        }
      );
    });

    test("rec2020 color", () => {
      expect(parseCssValue("color", "color(rec2020 0.4 0.6 0.3)")).toEqual({
        type: "color",
        colorSpace: "rec2020",
        alpha: 1,
        components: [0.4, 0.6, 0.3],
      });
    });

    test("xyz-d65 color", () => {
      expect(parseCssValue("color", "color(xyz-d65 0.4 0.6 0.3)")).toEqual({
        type: "color",
        colorSpace: "xyz-d65",
        alpha: 1,
        components: [0.4, 0.6, 0.3],
      });
    });

    test("xyz-d50 color", () => {
      expect(parseCssValue("color", "color(xyz-d50 0.4 0.6 0.3)")).toEqual({
        type: "color",
        colorSpace: "xyz-d50",
        alpha: 1,
        components: [0.4, 0.6, 0.3],
      });
    });
  });

  describe("CSS variable in alpha channel", () => {
    // hex is excluded: #RRGGBB syntax has no / alpha slot in CSS.
    // Using satisfies Record<Exclude<...>, unknown> ensures TypeScript errors
    // when a new color space is added to ColorValue without a test entry here.
    const cases = {
      srgb: {
        css: "rgb(255 0 0 / var(--opacity))",
        components: [1, 0, 0],
      },
      hsl: {
        css: "hsl(120 100% 50% / var(--opacity))",
        components: [120, 100, 50],
      },
      hwb: {
        css: "hwb(120 0% 0% / var(--opacity))",
        components: [120, 0, 0],
      },
      lab: {
        css: "lab(50 20 30 / var(--opacity))",
        components: [50, 20, 30],
      },
      lch: {
        css: "lch(50 40 120 / var(--opacity))",
        components: [50, 40, 120],
      },
      oklab: {
        css: "oklab(0.7 0.1 -0.1 / var(--opacity))",
        components: [0.7, 0.1, -0.1],
      },
      oklch: {
        css: "oklch(0.5 0.1 180 / var(--opacity))",
        components: [0.5, 0.1, 180],
      },
      p3: {
        css: "color(display-p3 0.4 0.6 0.3 / var(--opacity))",
        components: [0.4, 0.6, 0.3],
      },
      "srgb-linear": {
        css: "color(srgb-linear 1 0 0 / var(--opacity))",
        components: [1, 0, 0],
      },
      a98rgb: {
        css: "color(a98-rgb 0.5 0.3 0.7 / var(--opacity))",
        components: [0.5, 0.3, 0.7],
      },
      prophoto: {
        css: "color(prophoto-rgb 0.6 0.4 0.2 / var(--opacity))",
        components: [0.6, 0.4, 0.2],
      },
      rec2020: {
        css: "color(rec2020 0.4 0.6 0.3 / var(--opacity))",
        components: [0.4, 0.6, 0.3],
      },
      "xyz-d65": {
        css: "color(xyz-d65 0.5 0.3 0.2 / var(--opacity))",
        components: [0.5, 0.3, 0.2],
      },
      "xyz-d50": {
        css: "color(xyz-d50 0.4 0.6 0.3 / var(--opacity))",
        components: [0.4, 0.6, 0.3],
      },
    } satisfies Record<Exclude<ColorValue["colorSpace"], "hex">, unknown>;

    for (const [colorSpace, { css, components }] of Object.entries(cases)) {
      test(colorSpace, () => {
        expect(parseCssValue("color", css)).toEqual({
          type: "color",
          colorSpace,
          components,
          alpha: {
            type: "var",
            value: "opacity",
            fallback: { type: "unit", unit: "number", value: 1 },
          },
        });
      });
    }
  });

  test("preserve explicit CSS fallback in var alpha channel", () => {
    expect(
      parseCssValue("color", "rgb(24 24 27 / var(--tw-bg-opacity, 0.5))")
    ).toEqual({
      type: "color",
      colorSpace: "srgb",
      components: [0.0941, 0.0941, 0.1059],
      alpha: {
        type: "var",
        value: "tw-bg-opacity",
        fallback: { type: "unparsed", value: "0.5" },
      },
    });
  });
});

test("parse color-mix() as unparsed value", () => {
  expect(parseCssValue("color", "color-mix(in oklch, red 50%, blue)")).toEqual({
    type: "unparsed",
    value: "color-mix(in oklch, red 50%, blue)",
  });
});

test("parse color-mix() on background-color as unparsed value", () => {
  expect(
    parseCssValue(
      "background-color",
      "color-mix(in srgb, #ff0000 30%, transparent)"
    )
  ).toEqual({
    type: "unparsed",
    value: "color-mix(in srgb, #ff0000 30%, transparent)",
  });
});

test("parse color-mix() with var() as first color argument", () => {
  expect(
    parseCssValue("color", "color-mix(in oklch, var(--primary), blue)")
  ).toEqual({
    type: "unparsed",
    value: "color-mix(in oklch, var(--primary), blue)",
  });
});

test("parse color-mix() with var() as second color argument", () => {
  expect(
    parseCssValue("color", "color-mix(in oklch, red, var(--secondary))")
  ).toEqual({
    type: "unparsed",
    value: "color-mix(in oklch, red, var(--secondary))",
  });
});

test("parse color-mix() with var() as percentage", () => {
  expect(
    parseCssValue("color", "color-mix(in srgb, red var(--pct), blue)")
  ).toEqual({
    type: "unparsed",
    value: "color-mix(in srgb, red var(--pct), blue)",
  });
});

describe("relative color syntax", () => {
  test("static relative color (no var)", () => {
    expect(parseCssValue("color", "rgb(from blue r g b / 50%)")).toEqual({
      type: "unparsed",
      value: "rgb(from blue r g b / 50%)",
    });
  });

  test("var() as origin color", () => {
    expect(
      parseCssValue("color", "rgb(from var(--brand-primary) r g b / 25%)")
    ).toEqual({
      type: "unparsed",
      value: "rgb(from var(--brand-primary) r g b / 25%)",
    });
  });

  test("var() as channel value", () => {
    expect(parseCssValue("color", "oklch(from red l var(--chroma) h)")).toEqual(
      {
        type: "unparsed",
        value: "oklch(from red l var(--chroma) h)",
      }
    );
  });

  test("var() as alpha", () => {
    expect(
      parseCssValue("color", "rgb(from red r g b / var(--alpha))")
    ).toEqual({
      type: "unparsed",
      value: "rgb(from red r g b / var(--alpha))",
    });
  });

  test("hsl relative with var() as origin", () => {
    expect(parseCssValue("color", "hsl(from var(--brand) h s 75%)")).toEqual({
      type: "unparsed",
      value: "hsl(from var(--brand) h s 75%)",
    });
  });

  test("oklch relative on background-color", () => {
    expect(
      parseCssValue("background-color", "oklch(from var(--brand) l c h / 0.5)")
    ).toEqual({
      type: "unparsed",
      value: "oklch(from var(--brand) l c h / 0.5)",
    });
  });

  test("var() in both origin and alpha", () => {
    expect(
      parseCssValue("color", "rgb(from var(--brand) r g b / var(--alpha))")
    ).toEqual({
      type: "unparsed",
      value: "rgb(from var(--brand) r g b / var(--alpha))",
    });
  });
});

test("parse background-image property as layers", () => {
  expect(
    parseCssValue(
      "background-image",
      `linear-gradient(180deg, hsla(0, 0.00%, 0.00%, 0.11), white), url("https://667d0b7769e0cc3754b584f6"), none, url("https://667d0fe180995eadc1534a26")`
    )
  ).toEqual({
    type: "layers",
    value: [
      {
        type: "unparsed",
        value: "linear-gradient(180deg,hsla(0,0.00%,0.00%,0.11),white)",
      },
      {
        type: "image",
        value: { type: "url", url: "https://667d0b7769e0cc3754b584f6" },
      },
      {
        type: "keyword",
        value: "none",
      },
      {
        type: "image",
        value: { type: "url", url: "https://667d0fe180995eadc1534a26" },
      },
    ],
  });
});

test("parse background-position-* properties as layers", () => {
  expect(
    parseCssValue("background-position-x", `0px, 550px, 0px, 0px`)
  ).toEqual({
    type: "layers",
    value: [
      { type: "unit", unit: "px", value: 0 },
      { type: "unit", unit: "px", value: 550 },
      { type: "unit", unit: "px", value: 0 },
      { type: "unit", unit: "px", value: 0 },
    ],
  });
  expect(parseCssValue("background-position-y", `0px, 0px, 0px, 0px`)).toEqual({
    type: "layers",
    value: [
      { type: "unit", unit: "px", value: 0 },
      { type: "unit", unit: "px", value: 0 },
      { type: "unit", unit: "px", value: 0 },
      { type: "unit", unit: "px", value: 0 },
    ],
  });
});

test("parse background-size property as layers", () => {
  expect(parseCssValue("background-size", `auto, contain, auto, auto`)).toEqual(
    {
      type: "layers",
      value: [
        { type: "keyword", value: "auto" },
        { type: "keyword", value: "contain" },
        { type: "keyword", value: "auto" },
        { type: "keyword", value: "auto" },
      ],
    }
  );
  expect(
    parseCssValue("background-repeat", `repeat, no-repeat, repeat, repeat`)
  ).toEqual({
    type: "layers",
    value: [
      { type: "keyword", value: "repeat" },
      { type: "keyword", value: "no-repeat" },
      { type: "keyword", value: "repeat" },
      { type: "keyword", value: "repeat" },
    ],
  });
});

test("parse background-attachment property as layers", () => {
  expect(
    parseCssValue("background-attachment", `scroll, fixed, scroll, scroll`)
  ).toEqual({
    type: "layers",
    value: [
      { type: "keyword", value: "scroll" },
      { type: "keyword", value: "fixed" },
      { type: "keyword", value: "scroll" },
      { type: "keyword", value: "scroll" },
    ],
  });
});

test("parse repeated value with css wide keywords", () => {
  expect(parseCssValue("background-attachment", "initial")).toEqual({
    type: "keyword",
    value: "initial",
  });
  expect(parseCssValue("background-attachment", "INHERIT")).toEqual({
    type: "keyword",
    value: "inherit",
  });
  expect(parseCssValue("background-attachment", "unset")).toEqual({
    type: "keyword",
    value: "unset",
  });
  expect(parseCssValue("background-attachment", "revert")).toEqual({
    type: "keyword",
    value: "revert",
  });
  expect(parseCssValue("background-attachment", "revert-layer")).toEqual({
    type: "keyword",
    value: "revert-layer",
  });
});

test("parse transition-property property", () => {
  expect(parseCssValue("transition-property", "none")).toEqual({
    type: "keyword",
    value: "none",
  });
  expect(parseCssValue("transition-property", "opacity, width, all")).toEqual({
    type: "layers",
    value: [
      { type: "unparsed", value: "opacity" },
      { type: "unparsed", value: "width" },
      { type: "keyword", value: "all" },
    ],
  });
  expect(
    parseCssValue("transition-property", "opacity, none, unknown")
  ).toEqual({
    type: "layers",
    value: [
      { type: "unparsed", value: "opacity" },
      { type: "unparsed", value: "none" },
      { type: "unparsed", value: "unknown" },
    ],
  });
});

test("parse transition-duration property", () => {
  expect(parseCssValue("transition-duration", `10ms, 10ms`)).toEqual({
    type: "layers",
    value: [
      { type: "unit", unit: "ms", value: 10 },
      { type: "unit", unit: "ms", value: 10 },
    ],
  });
  expect(parseCssValue("transition-duration", `10ms, foo`)).toEqual({
    type: "invalid",
    value: "10ms, foo",
  });
});

test("parse transition-timing-function property", () => {
  const parsedValue = parseCssValue(
    "transition-timing-function",
    "ease, ease-in, cubic-bezier(0.68,-0.6,.32,1.6), steps(4, jump-start)"
  );
  expect(parsedValue).toEqual({
    type: "layers",
    value: [
      { type: "keyword", value: "ease" },
      { type: "keyword", value: "ease-in" },
      {
        type: "function",
        name: "cubic-bezier",
        args: {
          type: "layers",
          value: [
            { type: "unit", value: 0.68, unit: "number" },
            { type: "unit", value: -0.6, unit: "number" },
            { type: "unit", value: 0.32, unit: "number" },
            { type: "unit", value: 1.6, unit: "number" },
          ],
        },
      },
      {
        type: "function",
        name: "steps",
        args: {
          type: "layers",
          value: [
            { type: "unit", value: 4, unit: "number" },
            { type: "keyword", value: "jump-start" },
          ],
        },
      },
    ],
  });
  expect(toValue(parsedValue)).toMatchInlineSnapshot(
    `"ease, ease-in, cubic-bezier(0.68, -0.6, 0.32, 1.6), steps(4, jump-start)"`
  );
  expect(parseCssValue("transition-timing-function", "ease, testing")).toEqual({
    type: "invalid",
    value: "ease, testing",
  });
  expect(
    parseCssValue("transition-timing-function", "linear(0 0%, 1 100%)")
  ).toEqual({
    type: "layers",
    value: [{ type: "unparsed", value: "linear(0 0%,1 100%)" }],
  });
});

test("parse transition-behavior property as layers", () => {
  expect(parseCssValue("transition-behavior", `normal`)).toEqual({
    type: "layers",
    value: [{ type: "keyword", value: "normal" }],
  });
  expect(
    parseCssValue("transition-behavior", `NORMAL, allow-discrete`)
  ).toEqual({
    type: "layers",
    value: [
      { type: "keyword", value: "normal" },
      { type: "keyword", value: "allow-discrete" },
    ],
  });
  expect(parseCssValue("transition-behavior", `normal, invalid`)).toEqual({
    type: "invalid",
    value: "normal, invalid",
  });
});

test("parse unknown properties as unparsed", () => {
  expect(parseCssValue("animation-timeline" as CssProperty, "auto")).toEqual({
    type: "unparsed",
    value: "auto",
  });
  expect(
    parseCssValue("animation-range-start" as CssProperty, "normal")
  ).toEqual({
    type: "unparsed",
    value: "normal",
  });
  expect(parseCssValue("animation-range-end" as CssProperty, "normal")).toEqual(
    {
      type: "unparsed",
      value: "normal",
    }
  );
  expect(
    parseCssValue("animation-timing-function", "linear(0 0%, 1 100%)")
  ).toEqual({ type: "unparsed", value: "linear(0 0%, 1 100%)" });
});

test("parse transform property as tuple", () => {
  expect(
    parseCssValue("transform", "rotateX(45deg) rotateY(30deg) rotateZ(60deg)")
  ).toEqual({
    type: "tuple",
    value: [
      {
        type: "function",
        name: "rotateX",
        args: {
          type: "layers",
          value: [{ type: "unit", value: 45, unit: "deg" }],
        },
      },
      {
        type: "function",
        name: "rotateY",
        args: {
          type: "layers",
          value: [{ type: "unit", value: 30, unit: "deg" }],
        },
      },
      {
        type: "function",
        name: "rotateZ",
        args: {
          type: "layers",
          value: [{ type: "unit", value: 60, unit: "deg" }],
        },
      },
    ],
  });

  expect(parseCssValue("transform", "skew(30deg, 20deg)")).toEqual({
    type: "tuple",
    value: [
      {
        type: "function",
        name: "skew",
        args: {
          type: "layers",
          value: [
            { type: "unit", value: 30, unit: "deg" },
            { type: "unit", value: 20, unit: "deg" },
          ],
        },
      },
    ],
  });

  expect(
    parseCssValue("transform", "translate3d(-100px, 50px, -150px)")
  ).toEqual({
    type: "tuple",
    value: [
      {
        type: "function",
        name: "translate3d",
        args: {
          type: "layers",
          value: [
            { type: "unit", value: -100, unit: "px" },
            { type: "unit", value: 50, unit: "px" },
            { type: "unit", value: -150, unit: "px" },
          ],
        },
      },
    ],
  });
});

test("parses transform values and returns invalid for invalid values", () => {
  expect(parseCssValue("transform", "scale(1.5, 50px)")).toEqual({
    type: "invalid",
    value: "scale(1.5, 50px)",
  });

  expect(parseCssValue("transform", "matrix(1, 0.5, -0.5, 1, 100)")).toEqual({
    type: "invalid",
    value: "matrix(1, 0.5, -0.5, 1, 100)",
  });
});

test("parses a valid translate value", () => {
  expect(parseCssValue("translate", "100px")).toEqual({
    type: "tuple",
    value: [{ type: "unit", unit: "px", value: 100 }],
  });
  expect(parseCssValue("translate", "100px 200px")).toEqual({
    type: "tuple",
    value: [
      { type: "unit", unit: "px", value: 100 },
      { type: "unit", unit: "px", value: 200 },
    ],
  });
  expect(parseCssValue("translate", "10em 10em 10em")).toEqual({
    type: "tuple",
    value: [
      { type: "unit", unit: "em", value: 10 },
      { type: "unit", unit: "em", value: 10 },
      { type: "unit", unit: "em", value: 10 },
    ],
  });
});

test("parses and returns invalid for invalid translate values", () => {
  expect(parseCssValue("translate", "foo bar")).toEqual({
    type: "invalid",
    value: "foo bar",
  });
  expect(parseCssValue("translate", "100px 200px 300px 400px")).toEqual({
    type: "invalid",
    value: "100px 200px 300px 400px",
  });
  expect(parseCssValue("translate", "100%, 200%")).toEqual({
    type: "invalid",
    value: "100%, 200%",
  });
});

test("parses a valid scale value", () => {
  expect(parseCssValue("scale", "1.5")).toEqual({
    type: "tuple",
    value: [{ type: "unit", value: 1.5, unit: "number" }],
  });
  expect(parseCssValue("scale", "5 10 15")).toEqual({
    type: "tuple",
    value: [
      { type: "unit", value: 5, unit: "number" },
      { type: "unit", value: 10, unit: "number" },
      { type: "unit", value: 15, unit: "number" },
    ],
  });
  expect(parseCssValue("scale", "50%")).toEqual({
    type: "tuple",
    value: [{ type: "unit", value: 50, unit: "%" }],
  });
});

test("throws error for invalid scale proeprty values", () => {
  expect(parseCssValue("scale", "10 foo")).toEqual({
    type: "invalid",
    value: "10 foo",
  });
  expect(parseCssValue("scale", "5 10 15 20")).toEqual({
    type: "invalid",
    value: "5 10 15 20",
  });
  expect(parseCssValue("scale", "5, 15")).toEqual({
    type: "invalid",
    value: "5, 15",
  });
  expect(parseCssValue("scale", "5px")).toEqual({
    type: "invalid",
    value: "5px",
  });
});

test("support custom properties as unparsed values", () => {
  expect(parseCssValue("--my-property", "blue")).toEqual({
    type: "unparsed",
    value: "blue",
  });
  expect(parseCssValue("--my-property", "url(https://my-image.com)")).toEqual({
    type: "unparsed",
    value: "url(https://my-image.com)",
  });
  expect(parseCssValue("--my-property", "blue red")).toEqual({
    type: "unparsed",
    value: "blue red",
  });
  expect(parseCssValue("--my-property", "blue, red")).toEqual({
    type: "unparsed",
    value: "blue, red",
  });
});

test("support custom properties var reference", () => {
  expect(parseCssValue("color", "var(--color)")).toEqual({
    type: "var",
    value: "color",
  });
  expect(parseCssValue("color", "var(--color, red)")).toEqual({
    type: "var",
    value: "color",
    fallback: { type: "unparsed", value: "red" },
  });
});

test("support unit in custom property", () => {
  expect(parseCssValue("--size", "10")).toEqual({
    type: "unit",
    value: 10,
    unit: "number",
  });
  expect(parseCssValue("--size", "10px")).toEqual({
    type: "unit",
    value: 10,
    unit: "px",
  });
  expect(parseCssValue("--size", "10%")).toEqual({
    type: "unit",
    value: 10,
    unit: "%",
  });
});

test("support color in custom property", () => {
  expect(parseCssValue("--color", "rgb(61 77 4)")).toEqual({
    type: "color",
    colorSpace: "srgb",
    alpha: 1,
    components: [0.2392, 0.302, 0.0157],
  });
  expect(parseCssValue("--color", "rgba(61, 77, 4, 0.5)")).toEqual({
    type: "color",
    colorSpace: "srgb",
    alpha: 0.5,
    components: [0.2392, 0.302, 0.0157],
  });
  expect(parseCssValue("--color", "#3d4d04")).toEqual({
    type: "color",
    colorSpace: "hex",
    alpha: 1,
    components: [0.2392, 0.302, 0.0157],
  });
  expect(parseCssValue("--color", "red")).toEqual({
    type: "unparsed",
    value: "red",
  });
});

test("support custom properties var reference in custom property", () => {
  expect(parseCssValue("--bg", "var(--color)")).toEqual({
    type: "var",
    value: "color",
  });
  expect(parseCssValue("--bg", "var(--color, red)")).toEqual({
    type: "var",
    value: "color",
    fallback: { type: "unparsed", value: "red" },
  });
});

test("parse empty custom property as empty unparsed", () => {
  expect(parseCssValue("--inset", "")).toEqual({
    type: "unparsed",
    value: "",
  });
});

test("parse single var in repeated value without layers or tuples", () => {
  expect(parseCssValue("background-image", "var(--gradient)")).toEqual({
    type: "var",
    value: "gradient",
  });
  expect(parseCssValue("filter", "var(--noise)")).toEqual({
    type: "var",
    value: "noise",
  });
});

test("parse multiple var in repeated value as layers and tuples", () => {
  expect(
    parseCssValue("background-image", "var(--gradient-1), var(--gradient-2)")
  ).toEqual({
    type: "layers",
    value: [
      { type: "var", value: "gradient-1" },
      { type: "var", value: "gradient-2" },
    ],
  });
  expect(parseCssValue("filter", "var(--noise-1) var(--noise-2)")).toEqual({
    type: "tuple",
    value: [
      { type: "var", value: "noise-1" },
      { type: "var", value: "noise-2" },
    ],
  });
});

describe("parse shadows", () => {
  test("parses value and returns invalid when used a invalid boxShadow is passed", () => {
    expect(parseCssValue("box-shadow", `10px 10px 5px foo`)).toEqual({
      type: "invalid",
      value: "10px 10px 5px foo",
    });
  });

  test("parses value and returns invalid when a invalid textShadow is passed", () => {
    expect(parseCssValue("text-shadow", `10px 10px 5px foo`)).toEqual({
      type: "invalid",
      value: "10px 10px 5px foo",
    });
  });

  test("throws error when passed a value without a unit", () => {
    expect(parseCssValue("box-shadow", `10 10px 5px red`)).toEqual({
      type: "invalid",
      value: "10 10px 5px red",
    });
  });

  test("parses values and returns a layer when a valid textShadow is passes", () => {
    expect(parseCssValue("text-shadow", "1px 1px 2px black")).toEqual({
      type: "layers",
      value: [
        {
          type: "shadow",
          position: "outset",
          offsetX: { type: "unit", unit: "px", value: 1 },
          offsetY: { type: "unit", unit: "px", value: 1 },
          blur: { type: "unit", unit: "px", value: 2 },
          color: { type: "keyword", value: "black" },
        },
      ],
    });
  });

  test("inset and color values can be interchanged", () => {
    expect(parseCssValue("box-shadow", `inset 10px 10px 5px black`)).toEqual({
      type: "layers",
      value: [
        {
          type: "shadow",
          position: "inset",
          offsetX: { type: "unit", unit: "px", value: 10 },
          offsetY: { type: "unit", unit: "px", value: 10 },
          blur: { type: "unit", unit: "px", value: 5 },
          color: { type: "keyword", value: "black" },
        },
      ],
    });
  });

  test("parses value when inset is used but missing blur-radius", () => {
    expect(parseCssValue("box-shadow", `inset 5em 1em gold`)).toEqual({
      type: "layers",
      value: [
        {
          type: "shadow",
          position: "inset",
          offsetX: { type: "unit", unit: "em", value: 5 },
          offsetY: { type: "unit", unit: "em", value: 1 },
          color: { type: "keyword", value: "gold" },
        },
      ],
    });
  });

  test("parses value when offsetX and offsetY are used", () => {
    expect(parseCssValue("box-shadow", `60px -16px teal`)).toEqual({
      type: "layers",
      value: [
        {
          type: "shadow",
          position: "outset",
          offsetX: { type: "unit", unit: "px", value: 60 },
          offsetY: { type: "unit", unit: "px", value: -16 },
          color: { type: "keyword", value: "teal" },
        },
      ],
    });
  });

  test("parses value from figma", () => {
    expect(
      parseCssValue(
        "box-shadow",
        "0 60px 80px rgba(0,0,0,0.60), 0 45px 26px rgba(0,0,0,0.14)"
      )
    ).toEqual({
      type: "layers",
      value: [
        {
          type: "shadow",
          position: "outset",
          offsetX: { type: "unit", unit: "number", value: 0 },
          offsetY: { type: "unit", unit: "px", value: 60 },
          blur: { type: "unit", unit: "px", value: 80 },
          color: {
            type: "color",
            colorSpace: "srgb",
            alpha: 0.6,
            components: [0, 0, 0],
          },
        },
        {
          type: "shadow",
          position: "outset",
          offsetX: { type: "unit", unit: "number", value: 0 },
          offsetY: { type: "unit", unit: "px", value: 45 },
          blur: { type: "unit", unit: "px", value: 26 },
          color: {
            type: "color",
            colorSpace: "srgb",
            alpha: 0.14,
            components: [0, 0, 0],
          },
        },
      ],
    });
  });

  test(`parses multiple layers of box-shadow property`, () => {
    expect(
      parseCssValue(
        "box-shadow",
        `
        0 0 5px rgba(0, 0, 0, 0.2),
        inset 0 0 10px rgba(0, 0, 0, 0.3),
        0 0 15px rgba(0, 0, 0, 0.4)
        `
      )
    ).toEqual({
      type: "layers",
      value: [
        {
          type: "shadow",
          position: "outset",
          offsetX: { type: "unit", unit: "number", value: 0 },
          offsetY: { type: "unit", unit: "number", value: 0 },
          blur: { type: "unit", unit: "px", value: 5 },
          color: {
            type: "color",
            colorSpace: "srgb",
            alpha: 0.2,
            components: [0, 0, 0],
          },
        },
        {
          type: "shadow",
          position: "inset",
          offsetX: { type: "unit", unit: "number", value: 0 },
          offsetY: { type: "unit", unit: "number", value: 0 },
          blur: { type: "unit", unit: "px", value: 10 },
          color: {
            type: "color",
            colorSpace: "srgb",
            alpha: 0.3,
            components: [0, 0, 0],
          },
        },
        {
          type: "shadow",
          position: "outset",
          offsetX: { type: "unit", unit: "number", value: 0 },
          offsetY: { type: "unit", unit: "number", value: 0 },
          blur: { type: "unit", unit: "px", value: 15 },
          color: {
            type: "color",
            colorSpace: "srgb",
            alpha: 0.4,
            components: [0, 0, 0],
          },
        },
      ],
    });
  });

  test("parse var in box-shadow", () => {
    expect(parseCssValue("box-shadow", "var(--shadow)")).toEqual({
      type: "var",
      value: "shadow",
    });
    expect(
      parseCssValue("box-shadow", "var(--shadow-1), var(--shadow-2)")
    ).toEqual({
      type: "layers",
      value: [
        { type: "var", value: "shadow-1" },
        { type: "var", value: "shadow-2" },
      ],
    });
  });
});

describe("parse filters", () => {
  test("parse values and returns the valid style property values", () => {
    expect(parseCssValue("filter", "blur(4px)")).toEqual({
      type: "tuple",
      value: [
        {
          type: "function",
          name: "blur",
          args: {
            type: "tuple",
            value: [{ type: "unit", unit: "px", value: 4 }],
          },
        },
      ],
    });
    expect(
      parseCssValue("filter", "drop-shadow(10px 10px 25px rgba(0, 0, 255, 1))")
    ).toEqual({
      type: "tuple",
      value: [
        {
          type: "function",
          name: "drop-shadow",
          args: {
            type: "shadow",
            position: "outset",
            offsetX: { type: "unit", unit: "px", value: 10 },
            offsetY: { type: "unit", unit: "px", value: 10 },
            blur: { type: "unit", unit: "px", value: 25 },
            color: {
              type: "color",
              colorSpace: "srgb",
              alpha: 1,
              components: [0, 0, 1],
            },
          },
        },
      ],
    });

    expect(
      parseCssValue("filter", "drop-shadow(10px 10px 25px  #0000FF)")
    ).toEqual({
      type: "tuple",
      value: [
        {
          type: "function",
          name: "drop-shadow",
          args: {
            type: "shadow",
            position: "outset",
            offsetX: { type: "unit", unit: "px", value: 10 },
            offsetY: { type: "unit", unit: "px", value: 10 },
            blur: { type: "unit", unit: "px", value: 25 },
            color: {
              type: "color",
              colorSpace: "hex",
              alpha: 1,
              components: [0, 0, 1],
            },
          },
        },
      ],
    });
    expect(
      parseCssValue("filter", "drop-shadow(10px 10px 25px var(--color))")
    ).toEqual({
      type: "tuple",
      value: [
        {
          type: "function",
          name: "drop-shadow",
          args: {
            type: "unparsed",
            value: "10px 10px 25px var(--color)",
          },
        },
      ],
    });
  });

  test("parse backdrop-filter", () => {
    expect(parseCssValue("backdrop-filter", "blur(4px)")).toEqual({
      type: "tuple",
      value: [
        {
          type: "function",
          name: "blur",
          args: {
            type: "tuple",
            value: [{ type: "unit", unit: "px", value: 4 }],
          },
        },
      ],
    });
  });

  test("Multiple valid function values", () => {
    expect(
      parseCssValue(
        "filter",
        "blur(4px) drop-shadow(16px 16px 20px blue) opacity(25%)"
      )
    ).toEqual({
      type: "tuple",
      value: [
        {
          type: "function",
          name: "blur",
          args: {
            type: "tuple",
            value: [{ type: "unit", unit: "px", value: 4 }],
          },
        },
        {
          type: "function",
          name: "drop-shadow",
          args: {
            type: "shadow",
            position: "outset",
            offsetX: { type: "unit", unit: "px", value: 16 },
            offsetY: { type: "unit", unit: "px", value: 16 },
            blur: { type: "unit", unit: "px", value: 20 },
            color: { type: "keyword", value: "blue" },
          },
        },
        {
          type: "function",
          name: "opacity",
          args: {
            type: "tuple",
            value: [{ type: "unit", unit: "%", value: 25 }],
          },
        },
      ],
    });
  });

  // parsers are used to use copied value. At the moment, we don't have support
  // for complex functions in the UI like the one below like calc(4px + 16em)
  test("Using complex functions inside filter function", () => {
    expect(parseCssValue("filter", "blur(calc(4px + 16em))")).toEqual({
      type: "tuple",
      value: [
        {
          type: "function",
          name: "blur",
          args: {
            type: "tuple",
            value: [],
          },
        },
      ],
    });
  });
});

describe("aspect-ratio", () => {
  test("support single numeric value", () => {
    expect(parseCssValue("aspect-ratio", "10")).toEqual({
      type: "unit",
      unit: "number",
      value: 10,
    });
  });
  test("support keyword", () => {
    expect(parseCssValue("aspect-ratio", "auto")).toEqual({
      type: "keyword",
      value: "auto",
    });
  });
  test("support two values", () => {
    expect(parseCssValue("aspect-ratio", "16 / 9")).toEqual({
      type: "unparsed",
      value: "16 / 9",
    });
  });
});

describe("font-family", () => {
  test("support single value", () => {
    expect(parseCssValue("font-family", "sans-serif")).toEqual({
      type: "fontFamily",
      value: ["sans-serif"],
    });
  });

  test("support multiple values", () => {
    expect(parseCssValue("font-family", "serif, sans-serif")).toEqual({
      type: "fontFamily",
      value: ["serif", "sans-serif"],
    });
  });

  test("support space separated values", () => {
    expect(parseCssValue("font-family", "Song Ti, Hei Ti")).toEqual({
      type: "fontFamily",
      value: ["Song Ti", "Hei Ti"],
    });
    // only two keywords
    expect(parseCssValue("font-family", "Song Ti")).toEqual({
      type: "fontFamily",
      value: ["Song Ti"],
    });
  });

  test("support quoted values", () => {
    expect(parseCssValue("font-family", "\"Song Ti\", 'Hei Ti'")).toEqual({
      type: "fontFamily",
      value: ["Song Ti", "Hei Ti"],
    });
  });
});

test("parse transform-origin", () => {
  expect(parseCssValue("transform-origin", "bottom")).toEqual({
    type: "tuple",
    value: [{ type: "keyword", value: "bottom" }],
  });

  expect(parseCssValue("transform-origin", "left 2px")).toEqual({
    type: "tuple",
    value: [
      { type: "keyword", value: "left" },
      { type: "unit", value: 2, unit: "px" },
    ],
  });

  expect(parseCssValue("transform-origin", "right top")).toEqual({
    type: "tuple",
    value: [
      { type: "keyword", value: "right" },
      { type: "keyword", value: "top" },
    ],
  });

  expect(parseCssValue("transform-origin", "2px 30% 10px")).toEqual({
    type: "tuple",
    value: [
      { type: "unit", value: 2, unit: "px" },
      { type: "unit", value: 30, unit: "%" },
      { type: "unit", value: 10, unit: "px" },
    ],
  });

  expect(parseCssValue("transform-origin", "top left right")).toEqual({
    type: "invalid",
    value: "top left right",
  });
});

test("parse perspective-origin", () => {
  expect(parseCssValue("perspective-origin", "center")).toEqual({
    type: "tuple",
    value: [{ type: "keyword", value: "center" }],
  });

  expect(parseCssValue("perspective-origin", "bottom right")).toEqual({
    type: "tuple",
    value: [
      { type: "keyword", value: "bottom" },
      { type: "keyword", value: "right" },
    ],
  });

  expect(parseCssValue("perspective-origin", "bottom 55%")).toEqual({
    type: "invalid",
    value: "bottom 55%",
  });

  expect(parseCssValue("perspective-origin", "75% bottom")).toEqual({
    type: "tuple",
    value: [
      { type: "unit", value: 75, unit: "%" },
      { type: "keyword", value: "bottom" },
    ],
  });

  expect(parseCssValue("perspective-origin", "-175%")).toEqual({
    type: "tuple",
    value: [{ type: "unit", value: -175, unit: "%" }],
  });

  expect(parseCssValue("perspective-origin", "50% 50%")).toEqual({
    type: "tuple",
    value: [
      { type: "unit", value: 50, unit: "%" },
      { type: "unit", value: 50, unit: "%" },
    ],
  });
});

describe("isValidDeclaration", () => {
  test("custom properties always accept any value", () => {
    expect(isValidDeclaration("--my-color", "anything")).toBe(true);
    expect(isValidDeclaration("--x", "rgb(0 0 0)")).toBe(true);
    expect(isValidDeclaration("--x", "not-valid-garbage")).toBe(true);
  });

  test("var() is valid on any property, detected via AST", () => {
    expect(isValidDeclaration("color", "var(--primary)")).toBe(true);
    expect(isValidDeclaration("color", "var(--primary, red)")).toBe(true);
    expect(isValidDeclaration("width", "var(--size)")).toBe(true);
  });

  // Critical: var() must be detected by the AST walk before reaching the
  // keyword-only check, otherwise var() on these properties would be rejected.
  test("var() on keyword-only properties is valid", () => {
    expect(isValidDeclaration("white-space-collapse", "var(--ws)")).toBe(true);
    expect(isValidDeclaration("text-wrap-mode", "var(--tw)")).toBe(true);
    expect(isValidDeclaration("text-wrap-style", "var(--ts)")).toBe(true);
  });

  test("white-space-collapse: valid keywords accepted", () => {
    expect(isValidDeclaration("white-space-collapse", "collapse")).toBe(true);
    expect(isValidDeclaration("white-space-collapse", "preserve")).toBe(true);
  });

  test("white-space-collapse: unknown keywords rejected", () => {
    expect(isValidDeclaration("white-space-collapse", "not-valid")).toBe(false);
    expect(isValidDeclaration("white-space-collapse", "wrap")).toBe(false);
  });

  test("text-wrap-mode: valid keywords accepted", () => {
    expect(isValidDeclaration("text-wrap-mode", "wrap")).toBe(true);
    expect(isValidDeclaration("text-wrap-mode", "nowrap")).toBe(true);
  });

  test("text-wrap-mode: unknown keywords rejected", () => {
    expect(isValidDeclaration("text-wrap-mode", "not-valid")).toBe(false);
  });

  test("text-wrap-style: valid keywords accepted", () => {
    expect(isValidDeclaration("text-wrap-style", "balance")).toBe(true);
    expect(isValidDeclaration("text-wrap-style", "auto")).toBe(true);
  });

  test("text-wrap-style: unknown keywords rejected", () => {
    expect(isValidDeclaration("text-wrap-style", "not-valid")).toBe(false);
  });

  // Relative color syntax: csstree returns identical "Mismatch" errors for both
  // relative colors and genuinely invalid values, so we detect structurally via
  // the `from` identifier being the first child of the color function node.
  test("static relative color syntax is valid", () => {
    expect(isValidDeclaration("color", "rgb(from blue r g b / 50%)")).toBe(
      true
    );
    expect(isValidDeclaration("color", "oklch(from red l c h)")).toBe(true);
    expect(
      isValidDeclaration("background-color", "hsl(from green h s 75%)")
    ).toBe(true);
  });

  test("relative color with var() origin is valid", () => {
    expect(isValidDeclaration("color", "rgb(from var(--brand) r g b)")).toBe(
      true
    );
    expect(
      isValidDeclaration(
        "color",
        "oklch(from var(--brand) l c h / var(--alpha))"
      )
    ).toBe(true);
  });

  test("standard color values are valid via csstree lexer", () => {
    expect(isValidDeclaration("color", "oklch(0.7 0.15 200)")).toBe(true);
    expect(isValidDeclaration("color", "color-mix(in oklch, red, blue)")).toBe(
      true
    );
    expect(isValidDeclaration("color", "rgb(255 0 0)")).toBe(true);
    expect(isValidDeclaration("color", "#ff0000")).toBe(true);
  });

  test("genuinely invalid CSS values are rejected", () => {
    expect(isValidDeclaration("color", "not-valid-garbage")).toBe(false);
    // blur() is not a valid <color> value
    expect(isValidDeclaration("color", "blur(4)")).toBe(false);
    // red is not a valid <length>
    expect(isValidDeclaration("width", "red")).toBe(false);
  });

  // The AST walk is deep, not shallow. var() nested inside calc() or color-mix()
  // must be detected even though it isn't the top-level node.
  test("var() nested deep inside another function is valid", () => {
    expect(isValidDeclaration("width", "calc(var(--size) + 10px)")).toBe(true);
    expect(
      isValidDeclaration("color", "color-mix(in oklch, var(--primary), blue)")
    ).toBe(true);
  });

  // When csstree's tokenizer itself fails (malformed syntax like unmatched braces)
  // cssTryParseValue returns undefined. In the non-browser path this must return false.
  test("syntactically broken value that csstree cannot parse at all is rejected", () => {
    expect(isValidDeclaration("color", "}")).toBe(false);
  });

  // The newer CSS linear() easing function isn't in csstree's grammar for
  // transition/animation-timing-function, so there's a special lexer.match() call
  // before the normal lexer.matchProperty() call.
  test("transition-timing-function: CSS linear() easing syntax is valid", () => {
    expect(
      isValidDeclaration("transition-timing-function", "linear(0 0%, 1 100%)")
    ).toBe(true);
    expect(
      isValidDeclaration("transition-timing-function", "linear(0, 0.5 25%, 1)")
    ).toBe(true);
  });

  test("animation-timing-function: CSS linear() easing syntax is valid", () => {
    expect(
      isValidDeclaration("animation-timing-function", "linear(0 0%, 1 100%)")
    ).toBe(true);
  });

  // Unknown CSS properties (future or vendor-prefixed) are allowed through so they
  // can be stored as UnparsedValue rather than silently dropped.
  test("unknown CSS properties are accepted via the 'Unknown property' error path", () => {
    expect(
      isValidDeclaration("animation-timeline" as CssProperty, "auto")
    ).toBe(true);
    expect(
      isValidDeclaration("animation-range-start" as CssProperty, "normal")
    ).toBe(true);
  });
});

describe("keyword-only properties via parseCssValue", () => {
  test("white-space-collapse: valid keyword", () => {
    expect(parseCssValue("white-space-collapse", "collapse")).toEqual({
      type: "keyword",
      value: "collapse",
    });
    expect(parseCssValue("white-space-collapse", "preserve")).toEqual({
      type: "keyword",
      value: "preserve",
    });
  });

  test("white-space-collapse: invalid keyword returns invalid", () => {
    expect(parseCssValue("white-space-collapse", "not-valid")).toEqual({
      type: "invalid",
      value: "not-valid",
    });
  });

  test("white-space-collapse: var() is accepted and returned as VarValue", () => {
    expect(parseCssValue("white-space-collapse", "var(--ws-collapse)")).toEqual(
      {
        type: "var",
        value: "ws-collapse",
      }
    );
  });

  test("text-wrap-mode: valid keyword", () => {
    expect(parseCssValue("text-wrap-mode", "wrap")).toEqual({
      type: "keyword",
      value: "wrap",
    });
    expect(parseCssValue("text-wrap-mode", "nowrap")).toEqual({
      type: "keyword",
      value: "nowrap",
    });
  });

  test("text-wrap-mode: invalid value", () => {
    expect(parseCssValue("text-wrap-mode", "not-valid")).toEqual({
      type: "invalid",
      value: "not-valid",
    });
  });

  test("text-wrap-mode: var() is accepted", () => {
    expect(parseCssValue("text-wrap-mode", "var(--tw-mode)")).toEqual({
      type: "var",
      value: "tw-mode",
    });
  });

  test("text-wrap-style: valid keyword", () => {
    expect(parseCssValue("text-wrap-style", "balance")).toEqual({
      type: "keyword",
      value: "balance",
    });
    expect(parseCssValue("text-wrap-style", "auto")).toEqual({
      type: "keyword",
      value: "auto",
    });
  });

  test("text-wrap-style: var() is accepted", () => {
    expect(parseCssValue("text-wrap-style", "var(--style)")).toEqual({
      type: "var",
      value: "style",
    });
  });
});
