import { describe, test, expect } from "vitest";
import { parseCssValue } from "./parse-css-value";
import { toValue, type CssProperty } from "@webstudio-is/css-engine";

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
        type: "rgb",
        alpha: 0,
        b: 0,
        g: 0,
        r: 0,
      });
    });

    test("modern format", () => {
      expect(parseCssValue("background-color", "rgb(99 102 241/0.5)")).toEqual({
        type: "rgb",
        r: 99,
        g: 102,
        b: 241,
        alpha: 0.5,
      });
    });

    test("Color rgba values", () => {
      expect(parseCssValue("background-color", "#00220011")).toEqual({
        type: "rgb",
        alpha: 0.07,
        b: 0,
        g: 34,
        r: 0,
      });
    });

    test("Color rgba values", () => {
      expect(parseCssValue("color", "red")).toEqual({
        type: "keyword",
        value: "red",
      });
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
    parseCssValue("transitionTimingFunction", "linear(0 0%, 1 100%)")
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
    parseCssValue("animationTimingFunction", "linear(0 0%, 1 100%)")
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
    type: "rgb",
    r: 61,
    g: 77,
    b: 4,
    alpha: 1,
  });
  expect(parseCssValue("--color", "rgba(61, 77, 4, 0.5)")).toEqual({
    type: "rgb",
    r: 61,
    g: 77,
    b: 4,
    alpha: 0.5,
  });
  expect(parseCssValue("--color", "#3d4d04")).toEqual({
    type: "rgb",
    r: 61,
    g: 77,
    b: 4,
    alpha: 1,
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
          type: "tuple",
          value: [
            { type: "unit", unit: "px", value: 1 },
            { type: "unit", unit: "px", value: 1 },
            { type: "unit", unit: "px", value: 2 },
            { type: "keyword", value: "black" },
          ],
        },
      ],
    });
  });

  test("inset and color values can be interchanged", () => {
    expect(parseCssValue("box-shadow", `inset 10px 10px 5px black`)).toEqual({
      type: "layers",
      value: [
        {
          type: "tuple",
          value: [
            { type: "keyword", value: "inset" },
            { type: "unit", unit: "px", value: 10 },
            { type: "unit", unit: "px", value: 10 },
            { type: "unit", unit: "px", value: 5 },
            { type: "keyword", value: "black" },
          ],
        },
      ],
    });
  });

  test("parses value when inset is used but missing blur-radius", () => {
    expect(parseCssValue("box-shadow", `inset 5em 1em gold`)).toEqual({
      type: "layers",
      value: [
        {
          type: "tuple",
          value: [
            { type: "keyword", value: "inset" },
            { type: "unit", unit: "em", value: 5 },
            { type: "unit", unit: "em", value: 1 },
            { type: "keyword", value: "gold" },
          ],
        },
      ],
    });
  });

  test("parses value when offsetX and offsetY are used", () => {
    expect(parseCssValue("box-shadow", `60px -16px teal`)).toEqual({
      type: "layers",
      value: [
        {
          type: "tuple",
          value: [
            { type: "unit", unit: "px", value: 60 },
            { type: "unit", unit: "px", value: -16 },
            { type: "keyword", value: "teal" },
          ],
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
          type: "tuple",
          value: [
            { type: "unit", unit: "number", value: 0 },
            { type: "unit", unit: "px", value: 60 },
            { type: "unit", unit: "px", value: 80 },
            { alpha: 0.6, b: 0, g: 0, r: 0, type: "rgb" },
          ],
        },
        {
          type: "tuple",
          value: [
            { type: "unit", unit: "number", value: 0 },
            { type: "unit", unit: "px", value: 45 },
            { type: "unit", unit: "px", value: 26 },
            { alpha: 0.14, b: 0, g: 0, r: 0, type: "rgb" },
          ],
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
          type: "tuple",
          value: [
            { type: "unit", unit: "number", value: 0 },
            { type: "unit", unit: "number", value: 0 },
            { type: "unit", unit: "px", value: 5 },
            { alpha: 0.2, b: 0, g: 0, r: 0, type: "rgb" },
          ],
        },
        {
          type: "tuple",
          value: [
            { type: "keyword", value: "inset" },
            { type: "unit", unit: "number", value: 0 },
            { type: "unit", unit: "number", value: 0 },
            { type: "unit", unit: "px", value: 10 },
            { alpha: 0.3, b: 0, g: 0, r: 0, type: "rgb" },
          ],
        },
        {
          type: "tuple",
          value: [
            { type: "unit", unit: "number", value: 0 },
            { type: "unit", unit: "number", value: 0 },
            { type: "unit", unit: "px", value: 15 },
            { alpha: 0.4, b: 0, g: 0, r: 0, type: "rgb" },
          ],
        },
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
            type: "tuple",
            value: [
              { type: "unit", unit: "px", value: 10 },
              { type: "unit", unit: "px", value: 10 },
              { type: "unit", unit: "px", value: 25 },
              { alpha: 1, b: 255, g: 0, r: 0, type: "rgb" },
            ],
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
            type: "tuple",
            value: [
              { type: "unit", unit: "px", value: 10 },
              { type: "unit", unit: "px", value: 10 },
              { type: "unit", unit: "px", value: 25 },
              { alpha: 1, b: 255, g: 0, r: 0, type: "rgb" },
            ],
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
            type: "tuple",
            value: [
              { type: "unit", unit: "px", value: 16 },
              { type: "unit", unit: "px", value: 16 },
              { type: "unit", unit: "px", value: 20 },
              { type: "keyword", value: "blue" },
            ],
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
