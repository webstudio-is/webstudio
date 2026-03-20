import { describe, expect, test } from "vitest";
import {
  camelCaseProperty,
  parseClassBasedSelector,
  parseCss,
  parseMediaQuery,
} from "./parse-css";

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
        value: {
          type: "color",
          colorSpace: "srgb",
          alpha: 1,
          components: [1, 0, 0],
        },
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
        value: {
          type: "color",
          colorSpace: "srgb",
          alpha: 1,
          components: [0.9216, 1, 0.9882],
        },
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
        value: {
          type: "color",
          colorSpace: "srgb",
          alpha: 1,
          components: [1, 0, 0],
        },
      },
    ]);
  });

  test("attribute selector", () => {
    expect(parseCss(`[class^="a"] { color: #ff0000 }`)).toEqual([
      {
        selector: '[class^="a"]',
        property: "color",
        value: {
          type: "color",
          colorSpace: "srgb",
          alpha: 1,
          components: [1, 0, 0],
        },
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
        value: {
          type: "color",
          colorSpace: "srgb",
          alpha: 1,
          components: [1, 0, 0],
        },
      },
    ]);
  });

  test("parse pseudo element", () => {
    expect(parseCss(`input::placeholder { color: #ff0000 }`)).toEqual([
      {
        selector: "input",
        state: "::placeholder",
        property: "color",
        value: {
          type: "color",
          colorSpace: "srgb",
          alpha: 1,
          components: [1, 0, 0],
        },
      },
    ]);
  });

  test("parse multiple selectors, one with state", () => {
    expect(parseCss(`a, a:hover { color: #ff0000 }`)).toEqual([
      {
        selector: "a",
        property: "color",
        value: {
          type: "color",
          colorSpace: "srgb",
          alpha: 1,
          components: [1, 0, 0],
        },
      },
      {
        selector: "a",
        state: ":hover",
        property: "color",
        value: {
          type: "color",
          colorSpace: "srgb",
          alpha: 1,
          components: [1, 0, 0],
        },
      },
    ]);
  });

  test("parse multiple selectors, both with state", () => {
    expect(parseCss(`a:active, a:hover { color: #ff0000 }`)).toEqual([
      {
        selector: "a",
        state: ":active",
        property: "color",
        value: {
          type: "color",
          colorSpace: "srgb",
          alpha: 1,
          components: [1, 0, 0],
        },
      },
      {
        selector: "a",
        state: ":hover",
        property: "color",
        value: {
          type: "color",
          colorSpace: "srgb",
          alpha: 1,
          components: [1, 0, 0],
        },
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
          type: "color",
          colorSpace: "srgb",
          alpha: 1,
          components: [1, 0, 0],
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

  test("parse empty custom property", () => {
    expect(parseCss(`a { --my-property: ; }`)).toEqual([
      {
        selector: "a",
        property: "--my-property",
        value: { type: "unparsed", value: "" },
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

  test("keep prefix for -webkit-text-stroke", () => {
    // shorthand is kept as-is (not expanded) but prefix is preserved
    expect(parseCss(`a { -webkit-text-stroke: 1px black; }`)).toEqual([
      {
        selector: "a",
        property: "-webkit-text-stroke",
        value: {
          type: "tuple",
          value: [
            { type: "unit", unit: "px", value: 1 },
            { type: "keyword", value: "black" },
          ],
        },
      },
    ]);
  });

  test("parse child combinator", () => {
    expect(parseCss(`a > b { color: #ff0000 }`)).toEqual([
      {
        selector: "a > b",
        property: "color",
        value: {
          type: "color",
          colorSpace: "srgb",
          alpha: 1,
          components: [1, 0, 0],
        },
      },
    ]);
  });

  test("parse space combinator", () => {
    expect(parseCss(`.a b { color: #ff0000 }`)).toEqual([
      {
        selector: ".a b",
        property: "color",
        value: {
          type: "color",
          colorSpace: "srgb",
          alpha: 1,
          components: [1, 0, 0],
        },
      },
    ]);
  });

  test("parse nested selectors as one token", () => {
    expect(parseCss(`a b c.d { color: #ff0000 }`)).toEqual([
      {
        selector: "a b c.d",
        property: "color",
        value: {
          type: "color",
          colorSpace: "srgb",
          alpha: 1,
          components: [1, 0, 0],
        },
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
      value: {
        type: "color",
        colorSpace: "srgb",
        alpha: 0,
        components: [0, 0, 0],
      },
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

test("parse previously unsupported media queries", () => {
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
    {
      breakpoint: "(min-width:768px) and (max-width:1024px)",
      selector: "b",
      property: "color",
      value: { type: "keyword", value: "green" },
    },
    {
      breakpoint: "(min-width:768px) and (max-width:1024px)",
      selector: "c",
      property: "color",
      value: { type: "keyword", value: "blue" },
    },
    {
      breakpoint: "(hover:hover)",
      selector: "d",
      property: "color",
      value: { type: "keyword", value: "yellow" },
    },
    // @media (min-width: 40rem) is still ignored (non-px unit)
  ]);
});

test("parse nested media queries by flattening", () => {
  expect(
    parseCss(`
      @media (min-width: 768px)  {
        a {
          color: green;
        }
        @media (max-width: 1024px) {
          a {
            color: red;
          }
        }
      }
   `)
  ).toEqual([
    {
      breakpoint: "(min-width:768px)",
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "green" },
    },
    {
      breakpoint: "(min-width:768px) and (max-width:1024px)",
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

test("parse condition-based media queries", () => {
  expect(
    parseCss(`
      @media (prefers-color-scheme: dark) {
        a {
          color: white;
        }
      }
   `)
  ).toEqual([
    {
      breakpoint: `(prefers-color-scheme:dark)`,
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "white" },
    },
  ]);
});

test("parse hover media feature", () => {
  expect(
    parseCss(`
      @media (hover: hover) {
        a {
          color: blue;
        }
      }
   `)
  ).toEqual([
    {
      breakpoint: `(hover:hover)`,
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "blue" },
    },
  ]);
});

test("parse orientation media feature", () => {
  expect(
    parseCss(`
      @media (orientation: portrait) {
        a {
          color: green;
        }
      }
   `)
  ).toEqual([
    {
      breakpoint: `(orientation:portrait)`,
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "green" },
    },
  ]);
});

test("parse prefers-reduced-motion media feature", () => {
  expect(
    parseCss(`
      @media (prefers-reduced-motion: reduce) {
        a {
          color: red;
        }
      }
   `)
  ).toEqual([
    {
      breakpoint: `(prefers-reduced-motion:reduce)`,
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ]);
});

test("parse combined min-width and max-width media query", () => {
  expect(
    parseCss(`
      @media (min-width: 768px) and (max-width: 1024px) {
        a {
          color: green;
        }
      }
   `)
  ).toEqual([
    {
      breakpoint: `(min-width:768px) and (max-width:1024px)`,
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "green" },
    },
  ]);
});

test("parse min-width combined with condition feature", () => {
  expect(
    parseCss(`
      @media (min-width: 768px) and (orientation: landscape) {
        a {
          color: green;
        }
      }
   `)
  ).toEqual([
    {
      breakpoint: `(min-width:768px) and (orientation:landscape)`,
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "green" },
    },
  ]);
});

test("parse multiple condition features in media query", () => {
  expect(
    parseCss(`
      @media (prefers-color-scheme: dark) and (prefers-contrast: more) {
        a {
          color: white;
        }
      }
   `)
  ).toEqual([
    {
      breakpoint: `(prefers-color-scheme:dark) and (prefers-contrast:more)`,
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "white" },
    },
  ]);
});

test("parse nested media queries", () => {
  expect(
    parseCss(`
      @media (min-width: 768px) {
        a {
          color: green;
        }
        @media (max-width: 1024px) {
          a {
            color: red;
          }
        }
      }
   `)
  ).toEqual([
    {
      breakpoint: "(min-width:768px)",
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "green" },
    },
    {
      breakpoint: "(min-width:768px) and (max-width:1024px)",
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ]);
});

test("parse nested media with condition inside width", () => {
  expect(
    parseCss(`
      @media (min-width: 768px) {
        a {
          color: green;
        }
        @media (prefers-color-scheme: dark) {
          a {
            color: white;
          }
        }
      }
   `)
  ).toEqual([
    {
      breakpoint: "(min-width:768px)",
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "green" },
    },
    {
      breakpoint: "(min-width:768px) and (prefers-color-scheme:dark)",
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "white" },
    },
  ]);
});

test("parse deeply nested media queries", () => {
  expect(
    parseCss(`
      @media (min-width: 768px) {
        @media (orientation: landscape) {
          @media (hover: hover) {
            a {
              color: red;
            }
          }
        }
      }
   `)
  ).toEqual([
    {
      breakpoint:
        "(min-width:768px) and (orientation:landscape) and (hover:hover)",
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ]);
});

test("parse condition and base styles together", () => {
  expect(
    parseCss(`
      a {
        color: black;
      }
      @media (prefers-color-scheme: dark) {
        a {
          color: white;
        }
      }
   `)
  ).toEqual([
    {
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "black" },
    },
    {
      breakpoint: "(prefers-color-scheme:dark)",
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "white" },
    },
  ]);
});

test("still ignore non-px units in media queries", () => {
  expect(
    parseCss(`
      a {
        color: red;
      }
      @media (min-width: 40rem) {
        a {
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

test("still ignore @media print", () => {
  expect(
    parseCss(`
      a {
        color: red;
      }
      @media print {
        a {
          color: black;
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

test("still ignore @supports", () => {
  expect(
    parseCss(`
      a {
        color: red;
      }
      @supports (display: grid) {
        a {
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

// ---- Selector types ----

test("parse class selector with pseudo-class", () => {
  expect(parseCss(`.card:hover { color: red }`)).toEqual([
    {
      selector: ".card",
      state: ":hover",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ]);
});

test("parse class selector with pseudo-element", () => {
  expect(parseCss(`.card::before { content: none }`)).toEqual([
    {
      selector: ".card",
      state: "::before",
      property: "content",
      value: { type: "keyword", value: "none" },
    },
  ]);
});

test("parse compound class selector", () => {
  expect(parseCss(`.card.active { opacity: 1 }`)).toEqual([
    {
      selector: ".card.active",
      property: "opacity",
      value: { type: "unit", unit: "number", value: 1 },
    },
  ]);
});

test("parse compound class selector with pseudo-class", () => {
  expect(parseCss(`.card.active:hover { opacity: 0.5 }`)).toEqual([
    {
      selector: ".card.active",
      state: ":hover",
      property: "opacity",
      value: { type: "unit", unit: "number", value: 0.5 },
    },
  ]);
});

test("parse class with attribute selector", () => {
  expect(parseCss(`.btn[disabled] { opacity: 0.5 }`)).toEqual([
    {
      selector: ".btn[disabled]",
      property: "opacity",
      value: { type: "unit", unit: "number", value: 0.5 },
    },
  ]);
});

test("parse class + attribute + pseudo-class", () => {
  expect(parseCss(`.btn[disabled]:focus { outline: none }`)).toEqual([
    {
      selector: ".btn[disabled]",
      state: ":focus",
      property: "outline-width",
      value: { type: "keyword", value: "medium" },
    },
    {
      selector: ".btn[disabled]",
      state: ":focus",
      property: "outline-style",
      value: { type: "keyword", value: "none" },
    },
    {
      selector: ".btn[disabled]",
      state: ":focus",
      property: "outline-color",
      value: { type: "keyword", value: "currentcolor" },
    },
  ]);
});

test("parse ID selector", () => {
  expect(parseCss(`#hero { display: flex }`)).toEqual([
    {
      selector: "#hero",
      property: "display",
      value: { type: "keyword", value: "flex" },
    },
  ]);
});

test("parse element + class compound selector", () => {
  expect(parseCss(`div.card { display: flex }`)).toEqual([
    {
      selector: "div.card",
      property: "display",
      value: { type: "keyword", value: "flex" },
    },
  ]);
});

test("parse sibling combinator +", () => {
  expect(parseCss(`.a + .b { color: red }`)).toEqual([
    {
      selector: ".a + .b",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ]);
});

test("parse general sibling combinator ~", () => {
  expect(parseCss(`.a ~ .b { color: red }`)).toEqual([
    {
      selector: ".a ~ .b",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ]);
});

test("parse :root as pseudo-class selector", () => {
  expect(parseCss(`:root { --color: blue }`)).toEqual([
    {
      selector: ":root",
      property: "--color",
      value: { type: "unparsed", value: "blue" },
    },
  ]);
});

test("parse universal selector *", () => {
  expect(parseCss(`* { box-sizing: border-box }`)).toEqual([
    {
      selector: "*",
      property: "box-sizing",
      value: { type: "keyword", value: "border-box" },
    },
  ]);
});

test("parse &::pseudo-element as state", () => {
  expect(parseCss(`&::after { content: none }`)).toEqual([
    {
      selector: "",
      state: "::after",
      property: "content",
      value: { type: "keyword", value: "none" },
    },
  ]);
});

test("parse &:functional-pseudo as state", () => {
  expect(parseCss(`&:nth-child(2) { color: red }`)).toEqual([
    {
      selector: "",
      state: ":nth-child",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ]);
});

// ---- Edge cases ----

test("parse empty string returns empty array", () => {
  expect(parseCss("")).toEqual([]);
});

test("parse malformed CSS returns empty array", () => {
  expect(parseCss("{{{{")).toEqual([]);
});

test("parse CSS with no declarations returns empty array", () => {
  expect(parseCss(".card {}")).toEqual([]);
});

test("parse multiple properties from one rule", () => {
  const result = parseCss(`.card { display: flex; color: red; opacity: 1 }`);
  expect(result).toEqual([
    {
      selector: ".card",
      property: "display",
      value: { type: "keyword", value: "flex" },
    },
    {
      selector: ".card",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
    {
      selector: ".card",
      property: "opacity",
      value: { type: "unit", unit: "number", value: 1 },
    },
  ]);
});

test("parse comma-separated class selectors", () => {
  expect(parseCss(`.a, .b { color: red }`)).toEqual([
    {
      selector: ".a",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
    {
      selector: ".b",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ]);
});

test("parse comma-separated mixed selectors (class + element)", () => {
  expect(parseCss(`.card, div { display: flex }`)).toEqual([
    {
      selector: ".card",
      property: "display",
      value: { type: "keyword", value: "flex" },
    },
    {
      selector: "div",
      property: "display",
      value: { type: "keyword", value: "flex" },
    },
  ]);
});

test("parse comma-separated selectors with different states", () => {
  expect(parseCss(`.a:hover, .b:focus { color: blue }`)).toEqual([
    {
      selector: ".a",
      state: ":hover",
      property: "color",
      value: { type: "keyword", value: "blue" },
    },
    {
      selector: ".b",
      state: ":focus",
      property: "color",
      value: { type: "keyword", value: "blue" },
    },
  ]);
});

// ---- At-rules not supported ----

test("ignore @keyframes", () => {
  expect(
    parseCss(`
      .card { color: red }
      @keyframes fade { from { opacity: 1 } to { opacity: 0 } }
   `)
  ).toEqual([
    {
      selector: ".card",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ]);
});

test("ignore @font-face", () => {
  expect(
    parseCss(`
      .card { color: red }
      @font-face { font-family: "Custom"; src: url(font.woff2); }
   `)
  ).toEqual([
    {
      selector: ".card",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ]);
});

test("ignore @supports nested inside @media", () => {
  expect(
    parseCss(`
      @media (min-width: 768px) {
        .card { color: green }
        @supports (display: grid) {
          .card { display: grid }
        }
      }
   `)
  ).toEqual([
    {
      breakpoint: "(min-width:768px)",
      selector: ".card",
      property: "color",
      value: { type: "keyword", value: "green" },
    },
  ]);
});

// ---- Media query edge cases ----

test("parse bare screen media type as base query", () => {
  expect(
    parseCss(`
      @media screen {
        a { color: red }
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

test("ignore @media print with min-width", () => {
  expect(
    parseCss(`
      @media print and (min-width: 768px) {
        a { color: black }
      }
   `)
  ).toEqual([]);
});

test("parse non-px units in non-width features are allowed", () => {
  expect(
    parseCss(`
      @media (min-resolution: 2dppx) {
        a { color: red }
      }
   `)
  ).toEqual([
    {
      breakpoint: "(min-resolution:2dppx)",
      selector: "a",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ]);
});

test("class selector inside media query preserves both breakpoint and selector", () => {
  expect(
    parseCss(`
      @media (min-width: 640px) {
        .card:hover { color: blue }
      }
   `)
  ).toEqual([
    {
      breakpoint: "(min-width:640px)",
      selector: ".card",
      state: ":hover",
      property: "color",
      value: { type: "keyword", value: "blue" },
    },
  ]);
});

test("compound class inside media query", () => {
  expect(
    parseCss(`
      @media (max-width: 768px) {
        .card.featured { display: block }
      }
   `)
  ).toEqual([
    {
      breakpoint: "(max-width:768px)",
      selector: ".card.featured",
      property: "display",
      value: { type: "keyword", value: "block" },
    },
  ]);
});

test("nested media with non-px inner is rejected", () => {
  expect(
    parseCss(`
      @media (min-width: 768px) {
        @media (min-width: 40em) {
          a { color: red }
        }
      }
   `)
  ).toEqual([]);
});

test("nested media with print inner is rejected", () => {
  expect(
    parseCss(`
      @media (min-width: 768px) {
        @media print {
          a { color: red }
        }
      }
   `)
  ).toEqual([]);
});

describe("parseMediaQuery", () => {
  test("simple min-width", () => {
    expect(parseMediaQuery(`(min-width: 768px)`)).toEqual({
      minWidth: 768,
    });
  });

  test("simple max-width", () => {
    expect(parseMediaQuery(`(max-width: 768px)`)).toEqual({
      maxWidth: 768,
    });
  });

  test("orientation portrait condition", () => {
    expect(parseMediaQuery(`(orientation: portrait)`)).toEqual({
      condition: "orientation:portrait",
    });
  });

  test("orientation landscape condition", () => {
    expect(parseMediaQuery(`(orientation: landscape)`)).toEqual({
      condition: "orientation:landscape",
    });
  });

  test("hover condition", () => {
    expect(parseMediaQuery(`(hover: hover)`)).toEqual({
      condition: "hover:hover",
    });
  });

  test("whitespace normalization", () => {
    expect(parseMediaQuery(`(orientation:portrait)`)).toEqual({
      condition: "orientation:portrait",
    });
    expect(parseMediaQuery(`(  orientation  :  portrait  )`)).toEqual({
      condition: "orientation:portrait",
    });
  });

  test("multiple conditions", () => {
    expect(
      parseMediaQuery(`(orientation: portrait) and (hover: hover)`)
    ).toEqual({
      condition: "orientation:portrait and hover:hover",
    });
  });

  test("prefers-color-scheme dark", () => {
    expect(parseMediaQuery(`(prefers-color-scheme: dark)`)).toEqual({
      condition: "prefers-color-scheme:dark",
    });
  });

  test("prefers-color-scheme light", () => {
    expect(parseMediaQuery(`(prefers-color-scheme: light)`)).toEqual({
      condition: "prefers-color-scheme:light",
    });
  });

  test("pointer coarse", () => {
    expect(parseMediaQuery(`(pointer: coarse)`)).toEqual({
      condition: "pointer:coarse",
    });
  });

  test("prefers-reduced-motion", () => {
    expect(parseMediaQuery(`(prefers-reduced-motion: reduce)`)).toEqual({
      condition: "prefers-reduced-motion:reduce",
    });
  });

  test("prefers-contrast", () => {
    expect(parseMediaQuery(`(prefers-contrast: more)`)).toEqual({
      condition: "prefers-contrast:more",
    });
  });

  test("display-mode", () => {
    expect(parseMediaQuery(`(display-mode: standalone)`)).toEqual({
      condition: "display-mode:standalone",
    });
  });

  test("any-hover", () => {
    expect(parseMediaQuery(`(any-hover: hover)`)).toEqual({
      condition: "any-hover:hover",
    });
  });

  test("any-pointer", () => {
    expect(parseMediaQuery(`(any-pointer: fine)`)).toEqual({
      condition: "any-pointer:fine",
    });
  });

  test("combined min-width and max-width", () => {
    expect(
      parseMediaQuery(`(min-width: 768px) and (max-width: 1024px)`)
    ).toEqual({
      minWidth: 768,
      maxWidth: 1024,
    });
  });

  test("combined max-width and min-width (reversed order)", () => {
    expect(
      parseMediaQuery(`(max-width: 1024px) and (min-width: 768px)`)
    ).toEqual({
      minWidth: 768,
      maxWidth: 1024,
    });
  });

  test("min-width combined with condition feature", () => {
    expect(
      parseMediaQuery(`(min-width: 768px) and (orientation: landscape)`)
    ).toEqual({
      minWidth: 768,
      condition: "orientation:landscape",
    });
  });

  test("max-width combined with condition feature", () => {
    expect(parseMediaQuery(`(max-width: 480px) and (hover: none)`)).toEqual({
      maxWidth: 480,
      condition: "hover:none",
    });
  });

  test("min-width, max-width, and condition feature combined", () => {
    expect(
      parseMediaQuery(
        `(min-width: 768px) and (max-width: 1024px) and (orientation: portrait)`
      )
    ).toEqual({
      minWidth: 768,
      maxWidth: 1024,
      condition: "orientation:portrait",
    });
  });

  test("returns undefined for non-px units", () => {
    expect(parseMediaQuery(`(min-width: 40rem)`)).toBeUndefined();
    expect(parseMediaQuery(`(min-width: 50em)`)).toBeUndefined();
  });

  test("returns undefined for media types without features", () => {
    expect(parseMediaQuery(`print`)).toBeUndefined();
    expect(parseMediaQuery(`screen`)).toBeUndefined();
  });
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

describe("parseClassBasedSelector", () => {
  test("simple class selector", () => {
    expect(parseClassBasedSelector(".card")).toEqual({
      tokenName: "card",
      classNames: ["card"],
    });
  });

  test("compound class selector", () => {
    expect(parseClassBasedSelector(".card.active")).toEqual({
      tokenName: "card.active",
      classNames: ["card", "active"],
    });
  });

  test("triple compound class selector", () => {
    expect(parseClassBasedSelector(".a.b.c")).toEqual({
      tokenName: "a.b.c",
      classNames: ["a", "b", "c"],
    });
  });

  test("class with attribute selector", () => {
    expect(parseClassBasedSelector(".btn[disabled]")).toEqual({
      tokenName: "btn",
      classNames: ["btn"],
      states: ["[disabled]"],
    });
  });

  test("compound class with attribute selector", () => {
    expect(parseClassBasedSelector(".card.active[open]")).toEqual({
      tokenName: "card.active",
      classNames: ["card", "active"],
      states: ["[open]"],
    });
  });

  test("rejects element selector", () => {
    expect(parseClassBasedSelector("div")).toBeUndefined();
  });

  test("rejects id selector", () => {
    expect(parseClassBasedSelector("#hero")).toBeUndefined();
  });

  test("rejects :root pseudo selector", () => {
    expect(parseClassBasedSelector(":root")).toBeUndefined();
  });

  test("descendant combinator: .card .inner", () => {
    expect(parseClassBasedSelector(".card .inner")).toEqual({
      tokenName: "card__inner",
      classNames: ["inner"],
      ancestors: [{ classNames: ["card"], combinator: "descendant" }],
    });
  });

  test("child combinator: .card>.inner", () => {
    expect(parseClassBasedSelector(".card>.inner")).toEqual({
      tokenName: "card__inner",
      classNames: ["inner"],
      ancestors: [{ classNames: ["card"], combinator: "child" }],
    });
  });

  test("rejects sibling combinator", () => {
    expect(parseClassBasedSelector(".a+.b")).toBeUndefined();
  });

  test("rejects general sibling combinator", () => {
    expect(parseClassBasedSelector(".a~.b")).toBeUndefined();
  });

  test("rejects universal selector", () => {
    expect(parseClassBasedSelector("*")).toBeUndefined();
  });

  test("rejects empty string", () => {
    expect(parseClassBasedSelector("")).toBeUndefined();
  });

  test("attribute selector with value", () => {
    expect(parseClassBasedSelector(".input[type=text]")).toEqual({
      tokenName: "input",
      classNames: ["input"],
      states: ["[type=text]"],
    });
  });

  test("class with :hover pseudo-class", () => {
    expect(parseClassBasedSelector(".card:hover")).toEqual({
      tokenName: "card",
      classNames: ["card"],
      states: [":hover"],
    });
  });

  test("class with ::before pseudo-element", () => {
    expect(parseClassBasedSelector(".card::before")).toEqual({
      tokenName: "card",
      classNames: ["card"],
      states: ["::before"],
    });
  });

  test("class with functional pseudo-class :nth-child(2n+1)", () => {
    expect(parseClassBasedSelector(".item:nth-child(2n+1)")).toEqual({
      tokenName: "item",
      classNames: ["item"],
      states: [":nth-child(2n+1)"],
    });
  });

  test("class with multiple states: attribute + pseudo", () => {
    expect(parseClassBasedSelector(".btn[disabled]:hover")).toEqual({
      tokenName: "btn",
      classNames: ["btn"],
      states: ["[disabled]", ":hover"],
    });
  });

  test("compound class with pseudo-class and pseudo-element", () => {
    expect(parseClassBasedSelector(".card.active:hover::after")).toEqual({
      tokenName: "card.active",
      classNames: ["card", "active"],
      states: [":hover", "::after"],
    });
  });

  test("class with multiple attribute selectors", () => {
    expect(parseClassBasedSelector(".input[type=text][required]")).toEqual({
      tokenName: "input",
      classNames: ["input"],
      states: ["[type=text]", "[required]"],
    });
  });

  test("class with :focus-within pseudo-class", () => {
    expect(parseClassBasedSelector(".form:focus-within")).toEqual({
      tokenName: "form",
      classNames: ["form"],
      states: [":focus-within"],
    });
  });

  test("rejects element.class (type selector prefix)", () => {
    expect(parseClassBasedSelector("div.card")).toBeUndefined();
  });

  test("rejects nesting selector &.class", () => {
    expect(parseClassBasedSelector("&.card")).toBeUndefined();
  });

  // Nested selector tests
  test("multiple ancestors: .a .b .c", () => {
    expect(parseClassBasedSelector(".a .b .c")).toEqual({
      tokenName: "a__b__c",
      classNames: ["c"],
      ancestors: [
        { classNames: ["a"], combinator: "descendant" },
        { classNames: ["b"], combinator: "descendant" },
      ],
    });
  });

  test("compound segments in nested: .card.active .title.bold", () => {
    expect(parseClassBasedSelector(".card.active .title.bold")).toEqual({
      tokenName: "card.active__title.bold",
      classNames: ["title", "bold"],
      ancestors: [{ classNames: ["card", "active"], combinator: "descendant" }],
    });
  });

  test("mixed combinators: .a .b > .c", () => {
    expect(parseClassBasedSelector(".a .b > .c")).toEqual({
      tokenName: "a__b__c",
      classNames: ["c"],
      ancestors: [
        { classNames: ["a"], combinator: "descendant" },
        { classNames: ["b"], combinator: "child" },
      ],
    });
  });

  test("nested with state on target: .card > .title:hover", () => {
    expect(parseClassBasedSelector(".card > .title:hover")).toEqual({
      tokenName: "card__title",
      classNames: ["title"],
      states: [":hover"],
      ancestors: [{ classNames: ["card"], combinator: "child" }],
    });
  });

  test("nested with pseudo-element: .card .title::before", () => {
    expect(parseClassBasedSelector(".card .title::before")).toEqual({
      tokenName: "card__title",
      classNames: ["title"],
      states: ["::before"],
      ancestors: [{ classNames: ["card"], combinator: "descendant" }],
    });
  });

  test("rejects type selector in ancestor: h1 .card", () => {
    expect(parseClassBasedSelector("h1 .card")).toBeUndefined();
  });

  test("rejects type selector in target: .card h1", () => {
    expect(parseClassBasedSelector(".card h1")).toBeUndefined();
  });

  test("rejects id selector in target: .card #hero", () => {
    expect(parseClassBasedSelector(".card #hero")).toBeUndefined();
  });

  test("rejects attribute selector in ancestor: .card[disabled] .title", () => {
    expect(parseClassBasedSelector(".card[disabled] .title")).toBeUndefined();
  });
});
