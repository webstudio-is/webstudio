import { describe, expect, test } from "vitest";
import { camelCaseProperty, parseCss, parseMediaQuery } from "./parse-css";

describe("Parse CSS", () => {
  test("longhand property name with keyword value", () => {
    expect(parseCss(`.test { background-color: red }`)).toEqual([
      {
        selector: ".test",
        property: "background-color",
        value: { type: "keyword", value: "red" },
      },
    ]);
  });

  test("one class selector rules", () => {
    expect(parseCss(`.test { color: #ff0000 }`)).toEqual([
      {
        selector: ".test",
        property: "color",
        value: { alpha: 1, b: 0, g: 0, r: 255, type: "rgb" },
      },
    ]);
  });

  // @todo this is wrong
  test.skip("parse declaration with missing value", () => {
    expect(parseCss(`.test { color:;}`)).toEqual([
      {
        selector: ".test",
        property: "color",
        value: { type: "guaranteedInvalid" },
      },
    ]);
  });

  test("parse supported shorthand values", () => {
    const css = `
      .test {
        background: #ff0000 linear-gradient(180deg, #11181C 0%, rgba(17, 24, 28, 0) 36.09%), #EBFFFC;
      }
    `;
    expect(parseCss(css)).toEqual([
      {
        selector: ".test",
        property: "background-image",
        value: {
          type: "layers",
          value: [
            {
              type: "unparsed",
              value:
                "linear-gradient(180deg,#11181C 0%,rgba(17,24,28,0) 36.09%)",
            },
            { type: "keyword", value: "none" },
          ],
        },
      },
      {
        selector: ".test",
        property: "background-position-x",
        value: {
          type: "layers",
          value: [
            { type: "unit", unit: "%", value: 0 },
            { type: "unit", unit: "%", value: 0 },
          ],
        },
      },
      {
        selector: ".test",
        property: "background-position-y",
        value: {
          type: "layers",
          value: [
            { type: "unit", unit: "%", value: 0 },
            { type: "unit", unit: "%", value: 0 },
          ],
        },
      },
      {
        selector: ".test",
        property: "background-size",
        value: {
          type: "layers",
          value: [
            {
              type: "tuple",
              value: [
                { type: "keyword", value: "auto" },
                { type: "keyword", value: "auto" },
              ],
            },
            {
              type: "tuple",
              value: [
                { type: "keyword", value: "auto" },
                { type: "keyword", value: "auto" },
              ],
            },
          ],
        },
      },
      {
        selector: ".test",
        property: "background-repeat",
        value: {
          type: "layers",
          value: [
            { type: "keyword", value: "repeat" },
            { type: "keyword", value: "repeat" },
          ],
        },
      },
      {
        selector: ".test",
        property: "background-attachment",
        value: {
          type: "layers",
          value: [
            { type: "keyword", value: "scroll" },
            { type: "keyword", value: "scroll" },
          ],
        },
      },
      {
        selector: ".test",
        property: "background-origin",
        value: {
          type: "layers",
          value: [
            { type: "keyword", value: "padding-box" },
            { type: "keyword", value: "padding-box" },
          ],
        },
      },
      {
        selector: ".test",
        property: "background-clip",
        value: {
          type: "layers",
          value: [
            { type: "keyword", value: "border-box" },
            { type: "keyword", value: "border-box" },
          ],
        },
      },
      {
        selector: ".test",
        property: "background-color",
        value: { alpha: 1, b: 252, g: 255, r: 235, type: "rgb" },
      },
    ]);
  });

  test("parses single layer", () => {
    const css = `
      .test {
          background-image: none; background-position: 0px 0px; background-size: auto;
      }
    `;
    expect(parseCss(css)).toEqual([
      {
        selector: ".test",
        property: "background-image",
        value: {
          type: "layers",
          value: [{ type: "keyword", value: "none" }],
        },
      },
      {
        selector: ".test",
        property: "background-position-x",
        value: {
          type: "layers",
          value: [{ type: "unit", unit: "px", value: 0 }],
        },
      },
      {
        selector: ".test",
        property: "background-position-y",
        value: {
          type: "layers",
          value: [{ type: "unit", unit: "px", value: 0 }],
        },
      },
      {
        selector: ".test",
        property: "background-size",
        value: {
          type: "layers",
          value: [{ type: "keyword", value: "auto" }],
        },
      },
    ]);
  });

  test("parse state", () => {
    expect(parseCss(`a:hover { color: #ff0000 }`)).toEqual([
      {
        selector: "a",
        state: ":hover",
        property: "color",
        value: { alpha: 1, b: 0, g: 0, r: 255, type: "rgb" },
      },
    ]);
  });

  test("attribute selector", () => {
    expect(parseCss(`[class^="a"] { color: #ff0000 }`)).toEqual([
      {
        selector: '[class^="a"]',
        property: "color",
        value: { alpha: 1, b: 0, g: 0, r: 255, type: "rgb" },
      },
    ]);
  });

  test("parse first pseudo class as selector", () => {
    // E.g. :root
    expect(parseCss(`:first-pseudo:my-state { color: #ff0000 }`)).toEqual([
      {
        selector: ":first-pseudo",
        state: ":my-state",
        property: "color",
        value: { alpha: 1, b: 0, g: 0, r: 255, type: "rgb" },
      },
    ]);
  });

  test("parse pseudo element", () => {
    expect(parseCss(`input::placeholder { color: #ff0000 }`)).toEqual([
      {
        selector: "input",
        state: "::placeholder",
        property: "color",
        value: { alpha: 1, b: 0, g: 0, r: 255, type: "rgb" },
      },
    ]);
  });

  test("parse multiple selectors, one with state", () => {
    expect(parseCss(`a, a:hover { color: #ff0000 }`)).toEqual([
      {
        selector: "a",
        property: "color",
        value: { alpha: 1, b: 0, g: 0, r: 255, type: "rgb" },
      },
      {
        selector: "a",
        state: ":hover",
        property: "color",
        value: { alpha: 1, b: 0, g: 0, r: 255, type: "rgb" },
      },
    ]);
  });

  test("parse multiple selectors, both with state", () => {
    expect(parseCss(`a:active, a:hover { color: #ff0000 }`)).toEqual([
      {
        selector: "a",
        state: ":active",
        property: "color",
        value: { alpha: 1, b: 0, g: 0, r: 255, type: "rgb" },
      },
      {
        selector: "a",
        state: ":hover",
        property: "color",
        value: { alpha: 1, b: 0, g: 0, r: 255, type: "rgb" },
      },
    ]);
  });

  test("parse multiple rules", () => {
    expect(parseCss(`a { color: red} a:hover { color: #ff0000 }`)).toEqual([
      {
        selector: "a",
        property: "color",
        value: {
          type: "keyword",
          value: "red",
        },
      },
      {
        selector: "a",
        state: ":hover",
        property: "color",
        value: {
          alpha: 1,
          b: 0,
          g: 0,
          r: 255,
          type: "rgb",
        },
      },
    ]);
  });

  test("parse multiple rules, remove overwritten properties", () => {
    const css = `
      h1 {
        margin-bottom: 5px;
        font-size: 2em;
      }
      h1 {
        margin-bottom: 10px;
        font-weight: bold;
      }

      h1 {
        margin-top: 20px;
        font-size: 38px;
        line-height: 44px;
      }
    `;
    expect(parseCss(css)).toEqual([
      {
        selector: "h1",
        property: "margin-bottom",
        value: { type: "unit", unit: "px", value: 10 },
      },
      {
        selector: "h1",
        property: "font-size",
        value: { type: "unit", unit: "px", value: 38 },
      },
      {
        selector: "h1",
        property: "font-weight",
        value: { type: "keyword", value: "bold" },
      },
      {
        selector: "h1",
        property: "margin-top",
        value: { type: "unit", unit: "px", value: 20 },
      },
      {
        selector: "h1",
        property: "line-height",
        value: { type: "unit", unit: "px", value: 44 },
      },
    ]);
  });

  test("parse shorthand", () => {
    expect(parseCss(`a { border: 1px solid red }`)).toEqual([
      {
        selector: "a",
        property: "border-top-width",
        value: { type: "unit", unit: "px", value: 1 },
      },
      {
        selector: "a",
        property: "border-right-width",
        value: { type: "unit", unit: "px", value: 1 },
      },
      {
        selector: "a",
        property: "border-bottom-width",
        value: { type: "unit", unit: "px", value: 1 },
      },
      {
        selector: "a",
        property: "border-left-width",
        value: { type: "unit", unit: "px", value: 1 },
      },
      {
        selector: "a",
        property: "border-top-style",
        value: { type: "keyword", value: "solid" },
      },
      {
        selector: "a",
        property: "border-right-style",
        value: { type: "keyword", value: "solid" },
      },
      {
        selector: "a",
        property: "border-bottom-style",
        value: { type: "keyword", value: "solid" },
      },
      {
        selector: "a",
        property: "border-left-style",
        value: { type: "keyword", value: "solid" },
      },
      {
        selector: "a",
        property: "border-top-color",
        value: { type: "keyword", value: "red" },
      },
      {
        selector: "a",
        property: "border-right-color",
        value: { type: "keyword", value: "red" },
      },
      {
        selector: "a",
        property: "border-bottom-color",
        value: { type: "keyword", value: "red" },
      },
      {
        selector: "a",
        property: "border-left-color",
        value: { type: "keyword", value: "red" },
      },
    ]);
  });

  test("parse custom property", () => {
    expect(parseCss(`a { --my-property: red; }`)).toEqual([
      {
        selector: "a",
        property: "--my-property",
        value: { type: "unparsed", value: "red" },
      },
    ]);
  });

  test("parse variable as var value", () => {
    expect(
      parseCss(
        `
        a {
          color: var(--color);
          background-color: var(--color, red);
        }
        `
      )
    ).toEqual([
      {
        selector: "a",
        property: "color",
        value: { type: "var", value: "color" },
      },
      {
        selector: "a",
        property: "background-color",
        value: {
          type: "var",
          value: "color",
          fallback: { type: "unparsed", value: "red" },
        },
      },
    ]);
  });

  test("parse empty value as unset", () => {
    expect(parseCss(`a { color: ; background-color: red }`)).toEqual([
      {
        selector: "a",
        property: "color",
        value: { type: "keyword", value: "unset" },
      },
      {
        selector: "a",
        property: "background-color",
        value: { type: "keyword", value: "red" },
      },
    ]);
  });

  test("unprefix property that doesn't need a prefix", () => {
    expect(parseCss(`a { -webkit-color: red; }`)).toEqual([
      {
        selector: "a",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ]);
  });

  test("keep prefix for property that needs one", () => {
    expect(parseCss(`a { -webkit-box-orient: horizontal; }`)).toEqual([
      {
        selector: "a",
        property: "-webkit-box-orient",
        value: { type: "keyword", value: "horizontal" },
      },
    ]);
  });

  test("parse child combinator", () => {
    expect(parseCss(`a > b { color: #ff0000 }`)).toEqual([
      {
        selector: "a > b",
        property: "color",
        value: { alpha: 1, b: 0, g: 0, r: 255, type: "rgb" },
      },
    ]);
  });

  test("parse space combinator", () => {
    expect(parseCss(`.a b { color: #ff0000 }`)).toEqual([
      {
        selector: ".a b",
        property: "color",
        value: { alpha: 1, b: 0, g: 0, r: 255, type: "rgb" },
      },
    ]);
  });

  test("parse nested selectors as one token", () => {
    expect(parseCss(`a b c.d { color: #ff0000 }`)).toEqual([
      {
        selector: "a b c.d",
        property: "color",
        value: { alpha: 1, b: 0, g: 0, r: 255, type: "rgb" },
      },
    ]);
  });
});

test("parse font-smooth properties", () => {
  expect(
    parseCss(`
      a {
        font-smoothing: auto;
      }
      b {
        -webkit-font-smoothing: auto;
      }
      c {
        -moz-osx-font-smoothing: auto;
      }
   `)
  ).toEqual([
    {
      selector: "a",
      property: "-webkit-font-smoothing",
      value: { type: "keyword", value: "auto" },
    },
    {
      selector: "b",
      property: "-webkit-font-smoothing",
      value: { type: "keyword", value: "auto" },
    },
    {
      selector: "c",
      property: "-moz-osx-font-smoothing",
      value: { type: "keyword", value: "auto" },
    },
  ]);
});

test("parse incorrectly unprefixed tap-highlight-color", () => {
  expect(
    parseCss(`
      a {
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
      }
      b {
        tap-highlight-color: transparent;
      }
   `)
  ).toEqual([
    {
      selector: "a",
      property: "-webkit-tap-highlight-color",
      value: { alpha: 0, b: 0, g: 0, r: 0, type: "rgb" },
    },
    {
      selector: "b",
      property: "-webkit-tap-highlight-color",
      value: { type: "keyword", value: "transparent" },
    },
  ]);
});

test("parse top level rules and media all as base query", () => {
  expect(
    parseCss(`
      a {
        color: red;
      }
      @media all {
        b {
          width: auto;
        }
      }
   `)
  ).toEqual([
    {
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
    {
      selector: "b",
      property: "width",
      value: { type: "keyword", value: "auto" },
    },
  ]);
});

test("parse media queries", () => {
  expect(
    parseCss(`
      @media  ( max-width:  768px )  {
        a {
          color: red;
        }
      }
      @media (min-width: 768px) {
        a {
          color: green;
        }
      }
   `)
  ).toEqual([
    {
      breakpoint: `(max-width:768px)`,
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
    {
      breakpoint: `(min-width:768px)`,
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "green" },
    },
  ]);
});

test("support only screen media type", () => {
  expect(
    parseCss(`
      @media all {
        a {
          color: yellow;
        }
      }
      @media all and ( min-width: 768px )  {
        a {
          color: red;
        }
      }
      @media screen and (min-width: 1024px) {
        a {
          color: green;
        }
      }
      @media print and (min-width: 1280px) {
        a {
          color: blue;
        }
      }
   `)
  ).toEqual([
    {
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "yellow" },
    },
    {
      breakpoint: `(min-width:768px)`,
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
    {
      breakpoint: `(min-width:1024px)`,
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "green" },
    },
  ]);
});

test("ignore unsupported media queries", () => {
  expect(
    parseCss(`
      a {
        color: red;
      }
      @media (min-width: 768px) and (max-width: 1024px) {
        b {
          color: green;
        }
      }
      @media (min-width: 768px) and (max-width: 1024px) {
        c {
          color: blue;
        }
      }
      @media (hover: hover) {
        d {
          color: yellow;
        }
      }
      @media (min-width: 40rem)  {
        e {
          color: orange;
        }
      }
   `)
  ).toEqual([
    {
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ]);
});

test("ignore unsupported at rules", () => {
  expect(
    parseCss(`
      a {
        color: red;
      }
      @supports (display: grid) {
        b {
          color: green;
        }
      }
   `)
  ).toEqual([
    {
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ]);
});

test("parse &:pseudo-classes as state", () => {
  expect(
    parseCss(`
      &:hover {
        color: red;
      }
   `)
  ).toEqual([
    {
      selector: "",
      state: ":hover",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ]);
});

test("parse &[attribute=selector] as state", () => {
  expect(
    parseCss(`
      &[data-state=active] {
        color: red;
      }
   `)
  ).toEqual([
    {
      selector: "",
      state: "[data-state=active]",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ]);
});

test("parse media query", () => {
  expect(parseMediaQuery(`(min-width: 768px)`)).toEqual({
    minWidth: 768,
  });
  expect(parseMediaQuery(`(max-width: 768px)`)).toEqual({
    maxWidth: 768,
  });
  expect(parseMediaQuery(`(hover: hover)`)).toEqual(undefined);
});

test("camel case css property", () => {
  expect(camelCaseProperty("margin-top")).toEqual("marginTop");
  expect(camelCaseProperty("-webkit-font-smoothing")).toEqual(
    "WebkitFontSmoothing"
  );
  expect(camelCaseProperty("-moz-osx-font-smoothing")).toEqual(
    "MozOsxFontSmoothing"
  );
});

test("camel case css property multiple times", () => {
  expect(camelCaseProperty(camelCaseProperty("margin-top"))).toEqual(
    "marginTop"
  );
  expect(
    camelCaseProperty(camelCaseProperty("-webkit-font-smoothing"))
  ).toEqual("WebkitFontSmoothing");
  expect(
    camelCaseProperty(camelCaseProperty("-moz-osx-font-smoothing"))
  ).toEqual("MozOsxFontSmoothing");
});
