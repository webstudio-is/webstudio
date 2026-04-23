import { describe, expect, test } from "vitest";
import {
  camelCaseProperty,
  parseClassBasedSelector,
  parseCss,
  parseMediaQuery,
} from "./parse-css";
import { propertyVarTestFixtures } from "./__generated__/property-var-test-fixtures";

describe("Parse CSS", () => {
  test("longhand property name with keyword value", () => {
    expect(
      parseCss(`.test { background-color: red }`, new Map()).styles
    ).toEqual([
      {
        selector: ".test",
        property: "background-color",
        value: { type: "keyword", value: "red" },
      },
    ]);
  });

  test("one class selector rules", () => {
    expect(parseCss(`.test { color: #ff0000 }`, new Map()).styles).toEqual([
      {
        selector: ".test",
        property: "color",
        value: {
          type: "color",
          colorSpace: "hex",
          alpha: 1,
          components: [1, 0, 0],
        },
      },
    ]);
  });

  // @todo this is wrong
  test.skip("parse declaration with missing value", () => {
    expect(parseCss(`.test { color:;}`, new Map()).styles).toEqual([
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
    expect(parseCss(css, new Map()).styles).toEqual([
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
          colorSpace: "hex",
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
    expect(parseCss(css, new Map()).styles).toEqual([
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
    expect(parseCss(`a:hover { color: #ff0000 }`, new Map()).styles).toEqual([
      {
        selector: "a",
        state: ":hover",
        property: "color",
        value: {
          type: "color",
          colorSpace: "hex",
          alpha: 1,
          components: [1, 0, 0],
        },
      },
    ]);
  });

  test("attribute selector", () => {
    expect(
      parseCss(`[class^="a"] { color: #ff0000 }`, new Map()).styles
    ).toEqual([
      {
        selector: '[class^="a"]',
        property: "color",
        value: {
          type: "color",
          colorSpace: "hex",
          alpha: 1,
          components: [1, 0, 0],
        },
      },
    ]);
  });

  test("parse first pseudo class as selector", () => {
    // E.g. :root
    expect(
      parseCss(`:first-pseudo:my-state { color: #ff0000 }`, new Map()).styles
    ).toEqual([
      {
        selector: ":first-pseudo",
        state: ":my-state",
        property: "color",
        value: {
          type: "color",
          colorSpace: "hex",
          alpha: 1,
          components: [1, 0, 0],
        },
      },
    ]);
  });

  test("parse pseudo element", () => {
    expect(
      parseCss(`input::placeholder { color: #ff0000 }`, new Map()).styles
    ).toEqual([
      {
        selector: "input",
        state: "::placeholder",
        property: "color",
        value: {
          type: "color",
          colorSpace: "hex",
          alpha: 1,
          components: [1, 0, 0],
        },
      },
    ]);
  });

  test("parse multiple selectors, one with state", () => {
    expect(parseCss(`a, a:hover { color: #ff0000 }`, new Map()).styles).toEqual(
      [
        {
          selector: "a",
          property: "color",
          value: {
            type: "color",
            colorSpace: "hex",
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
            colorSpace: "hex",
            alpha: 1,
            components: [1, 0, 0],
          },
        },
      ]
    );
  });

  test("parse multiple selectors, both with state", () => {
    expect(
      parseCss(`a:active, a:hover { color: #ff0000 }`, new Map()).styles
    ).toEqual([
      {
        selector: "a",
        state: ":active",
        property: "color",
        value: {
          type: "color",
          colorSpace: "hex",
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
          colorSpace: "hex",
          alpha: 1,
          components: [1, 0, 0],
        },
      },
    ]);
  });

  test("parse multiple rules", () => {
    expect(
      parseCss(`a { color: red} a:hover { color: #ff0000 }`, new Map()).styles
    ).toEqual([
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
          colorSpace: "hex",
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
    expect(parseCss(css, new Map()).styles).toEqual([
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
    expect(parseCss(`a { border: 1px solid red }`, new Map()).styles).toEqual([
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
    expect(parseCss(`a { --my-property: red; }`, new Map()).styles).toEqual([
      {
        selector: "a",
        property: "--my-property",
        value: { type: "unparsed", value: "red" },
      },
    ]);
  });

  test("parse empty custom property", () => {
    expect(parseCss(`a { --my-property: ; }`, new Map()).styles).toEqual([
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
        `,
        new Map()
      ).styles
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
    expect(
      parseCss(`a { color: ; background-color: red }`, new Map()).styles
    ).toEqual([
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
    expect(parseCss(`a { -webkit-color: red; }`, new Map()).styles).toEqual([
      {
        selector: "a",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ]);
  });

  test("keep prefix for property that needs one", () => {
    expect(
      parseCss(`a { -webkit-box-orient: horizontal; }`, new Map()).styles
    ).toEqual([
      {
        selector: "a",
        property: "-webkit-box-orient",
        value: { type: "keyword", value: "horizontal" },
      },
    ]);
  });

  test("keep prefix for -webkit-text-stroke", () => {
    // shorthand expands to prefixed longhands while preserving the prefix
    expect(
      parseCss(`a { -webkit-text-stroke: 1px black; }`, new Map()).styles
    ).toEqual([
      {
        selector: "a",
        property: "-webkit-text-stroke-width",
        value: { type: "unit", unit: "px", value: 1 },
      },
      {
        selector: "a",
        property: "-webkit-text-stroke-color",
        value: {
          type: "keyword",
          value: "black",
        },
      },
    ]);
  });

  test("parse child combinator", () => {
    expect(parseCss(`a > b { color: #ff0000 }`, new Map()).styles).toEqual([
      {
        selector: "a > b",
        property: "color",
        value: {
          type: "color",
          colorSpace: "hex",
          alpha: 1,
          components: [1, 0, 0],
        },
      },
    ]);
  });

  test("parse space combinator", () => {
    expect(parseCss(`.a b { color: #ff0000 }`, new Map()).styles).toEqual([
      {
        selector: ".a b",
        property: "color",
        value: {
          type: "color",
          colorSpace: "hex",
          alpha: 1,
          components: [1, 0, 0],
        },
      },
    ]);
  });

  test("parse nested selectors as one token", () => {
    expect(parseCss(`a b c.d { color: #ff0000 }`, new Map()).styles).toEqual([
      {
        selector: "a b c.d",
        property: "color",
        value: {
          type: "color",
          colorSpace: "hex",
          alpha: 1,
          components: [1, 0, 0],
        },
      },
    ]);
  });
});

test("parse font-smooth properties", () => {
  expect(
    parseCss(
      `
      a {
        font-smoothing: auto;
      }
      b {
        -webkit-font-smoothing: auto;
      }
      c {
        -moz-osx-font-smoothing: auto;
      }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      a {
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
      }
      b {
        tap-highlight-color: transparent;
      }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      a {
        color: red;
      }
      @media all {
        b {
          width: auto;
        }
      }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
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
   `,
      new Map()
    ).styles
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
    parseCss(
      `
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
   `,
      new Map()
    ).styles
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
    parseCss(
      `
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
   `,
      new Map()
    ).styles
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
    parseCss(
      `
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
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      a {
        color: red;
      }
      @supports (display: grid) {
        b {
          color: green;
        }
      }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      @media (prefers-color-scheme: dark) {
        a {
          color: white;
        }
      }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      @media (hover: hover) {
        a {
          color: blue;
        }
      }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      @media (orientation: portrait) {
        a {
          color: green;
        }
      }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      @media (prefers-reduced-motion: reduce) {
        a {
          color: red;
        }
      }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      @media (min-width: 768px) and (max-width: 1024px) {
        a {
          color: green;
        }
      }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      @media (min-width: 768px) and (orientation: landscape) {
        a {
          color: green;
        }
      }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      @media (prefers-color-scheme: dark) and (prefers-contrast: more) {
        a {
          color: white;
        }
      }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
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
   `,
      new Map()
    ).styles
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
    parseCss(
      `
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
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      @media (min-width: 768px) {
        @media (orientation: landscape) {
          @media (hover: hover) {
            a {
              color: red;
            }
          }
        }
      }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      a {
        color: black;
      }
      @media (prefers-color-scheme: dark) {
        a {
          color: white;
        }
      }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      a {
        color: red;
      }
      @media (min-width: 40rem) {
        a {
          color: green;
        }
      }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      a {
        color: red;
      }
      @media print {
        a {
          color: black;
        }
      }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      a {
        color: red;
      }
      @supports (display: grid) {
        a {
          color: green;
        }
      }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      &:hover {
        color: red;
      }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      &[data-state=active] {
        color: red;
      }
   `,
      new Map()
    ).styles
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
  expect(parseCss(`.card:hover { color: red }`, new Map()).styles).toEqual([
    {
      selector: ".card",
      state: ":hover",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ]);
});

test("parse class selector with pseudo-element", () => {
  expect(parseCss(`.card::before { content: none }`, new Map()).styles).toEqual(
    [
      {
        selector: ".card",
        state: "::before",
        property: "content",
        value: { type: "keyword", value: "none" },
      },
    ]
  );
});

test("parse compound class selector", () => {
  expect(parseCss(`.card.active { opacity: 1 }`, new Map()).styles).toEqual([
    {
      selector: ".card.active",
      property: "opacity",
      value: { type: "unit", unit: "number", value: 1 },
    },
  ]);
});

test("parse compound class selector with pseudo-class", () => {
  expect(
    parseCss(`.card.active:hover { opacity: 0.5 }`, new Map()).styles
  ).toEqual([
    {
      selector: ".card.active",
      state: ":hover",
      property: "opacity",
      value: { type: "unit", unit: "number", value: 0.5 },
    },
  ]);
});

test("parse class with attribute selector", () => {
  expect(parseCss(`.btn[disabled] { opacity: 0.5 }`, new Map()).styles).toEqual(
    [
      {
        selector: ".btn[disabled]",
        property: "opacity",
        value: { type: "unit", unit: "number", value: 0.5 },
      },
    ]
  );
});

test("parse class + attribute + pseudo-class", () => {
  expect(
    parseCss(`.btn[disabled]:focus { outline: none }`, new Map()).styles
  ).toEqual([
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
  expect(parseCss(`#hero { display: flex }`, new Map()).styles).toEqual([
    {
      selector: "#hero",
      property: "display",
      value: { type: "keyword", value: "flex" },
    },
  ]);
});

test("parse element + class compound selector", () => {
  expect(parseCss(`div.card { display: flex }`, new Map()).styles).toEqual([
    {
      selector: "div.card",
      property: "display",
      value: { type: "keyword", value: "flex" },
    },
  ]);
});

test("parse sibling combinator +", () => {
  expect(parseCss(`.a + .b { color: red }`, new Map()).styles).toEqual([
    {
      selector: ".a + .b",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ]);
});

test("parse general sibling combinator ~", () => {
  expect(parseCss(`.a ~ .b { color: red }`, new Map()).styles).toEqual([
    {
      selector: ".a ~ .b",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ]);
});

test("parse :root as pseudo-class selector", () => {
  expect(parseCss(`:root { --color: blue }`, new Map()).styles).toEqual([
    {
      selector: ":root",
      property: "--color",
      value: { type: "unparsed", value: "blue" },
    },
  ]);
});

test("parse universal selector *", () => {
  expect(parseCss(`* { box-sizing: border-box }`, new Map()).styles).toEqual([
    {
      selector: "*",
      property: "box-sizing",
      value: { type: "keyword", value: "border-box" },
    },
  ]);
});

test("parse &::pseudo-element as state", () => {
  expect(parseCss(`&::after { content: none }`, new Map()).styles).toEqual([
    {
      selector: "",
      state: "::after",
      property: "content",
      value: { type: "keyword", value: "none" },
    },
  ]);
});

test("parse &:functional-pseudo as state", () => {
  expect(parseCss(`&:nth-child(2) { color: red }`, new Map()).styles).toEqual([
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
  expect(parseCss("", new Map()).styles).toEqual([]);
});

test("parse malformed CSS returns empty array", () => {
  expect(parseCss("{{{{", new Map()).styles).toEqual([]);
});

test("parse CSS with no declarations returns empty array", () => {
  expect(parseCss(".card {}", new Map()).styles).toEqual([]);
});

test("parse multiple properties from one rule", () => {
  const result = parseCss(
    `.card { display: flex; color: red; opacity: 1 }`,
    new Map()
  ).styles;
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
  expect(parseCss(`.a, .b { color: red }`, new Map()).styles).toEqual([
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
  expect(parseCss(`.card, div { display: flex }`, new Map()).styles).toEqual([
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
  expect(
    parseCss(`.a:hover, .b:focus { color: blue }`, new Map()).styles
  ).toEqual([
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
    parseCss(
      `
      .card { color: red }
      @keyframes fade { from { opacity: 1 } to { opacity: 0 } }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      .card { color: red }
      @font-face { font-family: "Custom"; src: url(font.woff2); }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      @media (min-width: 768px) {
        .card { color: green }
        @supports (display: grid) {
          .card { display: grid }
        }
      }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      @media screen {
        a { color: red }
      }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      @media print and (min-width: 768px) {
        a { color: black }
      }
   `,
      new Map()
    ).styles
  ).toEqual([]);
});

test("parse non-px units in non-width features are allowed", () => {
  expect(
    parseCss(
      `
      @media (min-resolution: 2dppx) {
        a { color: red }
      }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      @media (min-width: 640px) {
        .card:hover { color: blue }
      }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      @media (max-width: 768px) {
        .card.featured { display: block }
      }
   `,
      new Map()
    ).styles
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
    parseCss(
      `
      @media (min-width: 768px) {
        @media (min-width: 40em) {
          a { color: red }
        }
      }
   `,
      new Map()
    ).styles
  ).toEqual([]);
});

test("nested media with print inner is rejected", () => {
  expect(
    parseCss(
      `
      @media (min-width: 768px) {
        @media print {
          a { color: red }
        }
      }
   `,
      new Map()
    ).styles
  ).toEqual([]);
});

test("background: single var() resolving to a color in the same rule expands to background-color with the concrete color", () => {
  // --clr-red is in the same rule, so it's substituted before expansion.
  // background-color gets the concrete hex color (not a var ref).
  // The var declaration itself is also stored separately.
  const result = parseCss(
    `
    .my-parent {
      --clr-red: #f00;
      background: var(--clr-red);
    }
  `,
    new Map()
  ).styles;
  const bgColor = result.find(
    (d) => d.selector === ".my-parent" && d.property === "background-color"
  );
  expect(bgColor?.value).toEqual(
    expect.objectContaining({ type: "color", colorSpace: "hex" })
  );
});

test("background: single var() resolving to a non-color expands using resolved value", () => {
  const result = parseCss(
    `
    .my-parent {
      --bg: url("img.png") no-repeat center;
      background: var(--bg);
    }
  `,
    new Map()
  ).styles;
  // Expanded from the resolved value: background-image should be the url
  expect(result).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ property: "background-image" }),
      expect.objectContaining({ property: "background-repeat" }),
    ])
  );
  const image = result.find((d) => d.property === "background-image");
  expect(image?.value).toEqual(
    expect.objectContaining({
      type: "layers",
      value: expect.arrayContaining([
        expect.objectContaining({ type: "image" }),
      ]),
    })
  );
});

test("shorthand: var() in border is substituted and expanded", () => {
  // border expands: border → border-color/width/style → border-{side}-color/width/style
  const result = parseCss(
    `
    .box {
      --clr: blue;
      --w: 2px;
      border: var(--w) solid var(--clr);
    }
  `,
    new Map()
  ).styles;
  expect(result).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        property: "border-top-color",
        value: expect.objectContaining({ type: "keyword", value: "blue" }),
      }),
      expect.objectContaining({
        property: "border-top-width",
        value: expect.objectContaining({ type: "unit", value: 2, unit: "px" }),
      }),
    ])
  );
});

test("shorthand: var() in transition is substituted and expanded", () => {
  const result = parseCss(
    `
    .box {
      --dur: 300ms;
      transition: opacity var(--dur) ease;
    }
  `,
    new Map()
  ).styles;
  expect(result).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ property: "transition-duration" }),
      expect.objectContaining({ property: "transition-property" }),
    ])
  );
  // transition-duration is wrapped in a layers value (supports multiple transitions)
  const duration = result.find((d) => d.property === "transition-duration");
  expect(duration?.value).toEqual(
    expect.objectContaining({
      type: "layers",
      value: expect.arrayContaining([
        expect.objectContaining({ type: "unit", value: 300, unit: "ms" }),
      ]),
    })
  );
});

// ─── Comprehensive var() substitution in shorthands ───────────────────────────

const u = (value: number, unit: string) =>
  expect.objectContaining({ type: "unit", value, unit });
const num = (value: number) => u(value, "number");
const kw = (value: string) =>
  expect.objectContaining({ type: "keyword", value });
const layers = (...items: unknown[]) =>
  expect.objectContaining({
    type: "layers",
    value: expect.arrayContaining(items),
  });
const prop = (property: string, value: unknown) =>
  expect.objectContaining({ property, value });

const valueContainsVarReference = (value: unknown): boolean => {
  const serialized = JSON.stringify(value);
  return serialized.includes('"type":"var"') || serialized.includes("var(");
};

const decls = (css: string) =>
  parseCss(`.x { ${css} }`, new Map()).styles.filter(
    (d) => d.selector === ".x"
  );

describe("var() substitution — background", () => {
  test("var() for color part alongside other background parts", () => {
    const result = decls(`
      --clr: green;
      background: no-repeat var(--clr);
    `);
    expect(result).toEqual(
      expect.arrayContaining([
        prop("background-color", kw("green")),
        prop("background-repeat", layers(kw("no-repeat"))),
      ])
    );
  });

  test("gradient var() references are preserved in background-image", () => {
    const result = decls(`
      background: linear-gradient(38deg, var(--aurora-clr1), var(--aurora-clr2), var(--aurora-clr3));
    `);
    expect(result).toEqual(
      expect.arrayContaining([
        prop(
          "background-image",
          layers(
            expect.objectContaining({
              type: "unparsed",
              value:
                "linear-gradient(38deg,var(--aurora-clr1),var(--aurora-clr2),var(--aurora-clr3))",
            })
          )
        ),
      ])
    );
  });

  test("cross-selector background gradients keep authored var() references", () => {
    const result = parseCss(
      `
      .scope {
        --tone-1: #ff0000;
        --tone-2: #00ff00;
        --tone-3: #0000ff;
      }

      .panel {
        background: linear-gradient(38deg, var(--tone-1), var(--tone-2), var(--tone-3));
      }
    `,
      new Map([
        ["--tone-1", "#ff0000"],
        ["--tone-2", "#00ff00"],
        ["--tone-3", "#0000ff"],
      ])
    ).styles;
    const backgroundImage = result.find(
      (decl) =>
        decl.selector === ".panel" && decl.property === "background-image"
    );
    expect(backgroundImage?.value).toEqual(
      expect.objectContaining({
        type: "layers",
        value: [
          expect.objectContaining({
            type: "unparsed",
            value:
              "linear-gradient(38deg,var(--tone-1),var(--tone-2),var(--tone-3))",
          }),
        ],
      })
    );
  });

  test("multiple vars for image and repeat parts", () => {
    const result = decls(`
      --img: url("hero.png");
      --rpt: no-repeat;
      background: var(--img) var(--rpt) center;
    `);
    expect(result).toEqual(
      expect.arrayContaining([
        prop(
          "background-image",
          layers(expect.objectContaining({ type: "image" }))
        ),
        prop("background-repeat", layers(kw("no-repeat"))),
      ])
    );
  });

  test("var() for background-position part", () => {
    const result = decls(`
      --pos: center bottom;
      background: red var(--pos);
    `);
    expect(result).toEqual(
      expect.arrayContaining([
        prop(
          "background-color",
          expect.objectContaining({ type: "keyword", value: "red" })
        ),
        prop("background-position-x", layers(kw("center"))),
        prop("background-position-y", layers(kw("bottom"))),
      ])
    );
  });
});

describe("var() substitution — CSS var() inline fallback", () => {
  test("uses plain inline fallback when var is unresolvable", () => {
    // --w is not defined anywhere; inline fallback 2px should be used
    const result = decls(`border: var(--w, 2px) solid red;`);
    expect(result).toEqual(
      expect.arrayContaining([
        prop("border-top-width", u(2, "px")),
        prop("border-top-style", kw("solid")),
        prop("border-top-color", kw("red")),
      ])
    );
  });

  test("var value takes precedence over inline fallback", () => {
    // --w is defined as 4px; inline fallback 2px should be ignored
    const result = decls(`--w: 4px; border: var(--w, 2px) solid red;`);
    expect(result).toEqual(
      expect.arrayContaining([prop("border-top-width", u(4, "px"))])
    );
  });

  test("no error emitted when resolved via inline fallback", () => {
    const { errors } = parseCss(
      `.x { border: var(--w, 1px) solid black; }`,
      new Map()
    );
    expect(errors).toEqual([]);
  });

  test("nested var() in fallback is resolved — var(--a, var(--b))", () => {
    // --a unresolvable, fallback is var(--b) which resolves to 3px
    const result = decls(`--b: 3px; border: var(--a, var(--b)) solid red;`);
    expect(result).toEqual(
      expect.arrayContaining([
        prop("border-top-width", u(3, "px")),
        prop("border-top-style", kw("solid")),
        prop("border-top-color", kw("red")),
      ])
    );
  });

  test("nested var() in fallback from cssVars — var(--a, var(--b))", () => {
    // --a unresolvable in same-rule and cssVars, fallback var(--b) in cssVars
    const result = parseCss(
      `.x { border: var(--a, var(--b)) solid black; }`,
      new Map([["--b", "4px"]])
    ).styles.filter((d) => d.selector === ".x");
    expect(result).toEqual(
      expect.arrayContaining([prop("border-top-width", u(4, "px"))])
    );
  });

  test("deeply nested fallback var(--a, var(--b, var(--c)))", () => {
    // --a and --b unresolvable, --c resolves
    const result = decls(
      `--c: 5px; border: var(--a, var(--b, var(--c))) solid red;`
    );
    expect(result).toEqual(
      expect.arrayContaining([prop("border-top-width", u(5, "px"))])
    );
  });

  test("all nested fallback vars unresolvable — property dropped with error", () => {
    const { errors } = parseCss(
      `.x { border: var(--a, var(--b)) solid red; }`,
      new Map()
    );
    // --a is the top-level var reported in the error
    expect(errors).toEqual([
      `"border" was not applied because --a could not be resolved`,
    ]);
  });

  test("primary unresolvable, fallback resolves — background shorthand", () => {
    // --primary is not defined, fallback blue should be used for background-color
    const result = decls(`background: var(--primary, blue);`);
    expect(result).toEqual(
      expect.arrayContaining([prop("background-color", kw("blue"))])
    );
  });

  test("primary unresolvable, fallback resolves — no error emitted", () => {
    const { errors } = parseCss(
      `.x { background: var(--primary, blue); }`,
      new Map()
    );
    expect(errors).toEqual([]);
  });

  test("primary unresolvable, fallback resolves — mixed shorthand", () => {
    // --w is not defined, fallback 1px is used; other parts are literal
    const result = decls(`border: var(--w, 1px) solid var(--clr, navy);`);
    expect(result).toEqual(
      expect.arrayContaining([
        prop("border-top-width", u(1, "px")),
        prop("border-top-style", kw("solid")),
        prop("border-top-color", kw("navy")),
      ])
    );
  });

  test("partial resolution — some vars resolve, some do not — error emitted", () => {
    // --w resolves, --clr does not; an error is emitted for --clr
    const { errors } = parseCss(
      `.x { --w: 1px; border: var(--w) solid var(--clr); }`,
      new Map()
    );
    expect(errors).toEqual([
      `"border" was not applied because --clr could not be resolved`,
    ]);
  });

  test("border shorthand with unresolved var is preserved as var() value", () => {
    const result = decls(`border: 1px solid var(--border-color);`);
    expect(result).toEqual(
      expect.arrayContaining([
        prop(
          "border-top-color",
          expect.objectContaining({ type: "var", value: "border-color" })
        ),
        prop(
          "border-right-color",
          expect.objectContaining({ type: "var", value: "border-color" })
        ),
        prop(
          "border-bottom-color",
          expect.objectContaining({ type: "var", value: "border-color" })
        ),
        prop(
          "border-left-color",
          expect.objectContaining({ type: "var", value: "border-color" })
        ),
      ])
    );
  });

  test("border-color longhand with unresolved var is preserved", () => {
    const result = decls(`border-color: var(--border-color);`);
    expect(result).toEqual(
      expect.arrayContaining([
        prop(
          "border-top-color",
          expect.objectContaining({ type: "var", value: "border-color" })
        ),
      ])
    );
  });

  test("outline shorthand does not leak unresolved width var into color", () => {
    const result = decls(`outline: var(--outline-width) solid;`);

    expect(result).toEqual(
      expect.arrayContaining([
        prop(
          "outline-width",
          expect.objectContaining({ type: "var", value: "outline-width" })
        ),
      ])
    );

    const outlineColor = result.find(
      (decl) => decl.property === "outline-color"
    );
    expect(outlineColor).toBeDefined();
    expect(outlineColor?.value).not.toEqual(
      expect.objectContaining({ type: "var" })
    );
  });

  test("border shorthand with repeated unresolved var preserves color var", () => {
    const result = decls(
      `border: var(--border-color) solid var(--border-color);`
    );

    expect(result).toEqual(
      expect.arrayContaining([
        prop(
          "border-top-color",
          expect.objectContaining({ type: "var", value: "border-color" })
        ),
        prop(
          "border-right-color",
          expect.objectContaining({ type: "var", value: "border-color" })
        ),
        prop(
          "border-bottom-color",
          expect.objectContaining({ type: "var", value: "border-color" })
        ),
        prop(
          "border-left-color",
          expect.objectContaining({ type: "var", value: "border-color" })
        ),
      ])
    );
  });
});

describe("var() substitution — transitive (nested) var() resolution", () => {
  test("var() whose value contains var() — calc(var(--base) * N)", () => {
    const result = decls(`
      --base-size: 1rem;
      --border-width: calc(var(--base-size) * 0.0625);
      border: var(--border-width) solid red;
    `);
    expect(result).toEqual(
      expect.arrayContaining([
        prop(
          "border-top-width",
          expect.objectContaining({
            type: "unparsed",
            value: "calc(1rem*0.0625)",
          })
        ),
        prop("border-top-style", kw("solid")),
        prop("border-top-color", kw("red")),
      ])
    );
  });

  test("var() whose value contains var() — color-mix(var(--clr))", () => {
    const result = decls(`
      --base-clr: green;
      --border-color: color-mix(in srgb, var(--base-clr) 65%, black);
      border: 2px solid var(--border-color);
    `);
    expect(result).toEqual(
      expect.arrayContaining([
        prop("border-top-width", u(2, "px")),
        prop("border-top-style", kw("solid")),
        prop(
          "border-top-color",
          expect.objectContaining({
            type: "unparsed",
            value: "color-mix(in srgb,green 65%,black)",
          })
        ),
      ])
    );
  });

  test("full .use_calc scenario — calc and color-mix with transitive vars", () => {
    const result = decls(`
      --base-size: 1rem;
      --base-clr: green;
      --border-width: calc(var(--base-size) * 0.0625);
      --border-color: color-mix(in srgb, var(--base-clr) 65%, black);
      border: var(--border-width) solid var(--border-color);
    `);
    expect(result).toEqual(
      expect.arrayContaining([
        prop(
          "border-top-width",
          expect.objectContaining({
            type: "unparsed",
            value: "calc(1rem*0.0625)",
          })
        ),
        prop("border-top-style", kw("solid")),
        prop(
          "border-top-color",
          expect.objectContaining({
            type: "unparsed",
            value: "color-mix(in srgb,green 65%,black)",
          })
        ),
      ])
    );
  });

  test("three levels of transitive vars", () => {
    const result = decls(`
      --a: 5px;
      --b: var(--a);
      --c: var(--b);
      border: var(--c) solid red;
    `);
    expect(result).toEqual(
      expect.arrayContaining([
        prop("border-top-width", u(5, "px")),
        prop("border-top-style", kw("solid")),
        prop("border-top-color", kw("red")),
      ])
    );
  });
});

describe("parseCss — external cssVars parameter", () => {
  // Helper that passes an external var map
  const declsWithVars = (css: string, vars: Record<string, string>) =>
    parseCss(`.x { ${css} }`, new Map(Object.entries(vars))).styles.filter(
      (d) => d.selector === ".x"
    );

  // ── background ────────────────────────────────────────────────────────────

  test("background: cross-rule var resolves via cssVars", () => {
    // --clr defined only in cssVars (parent rule), not in same rule.
    // The var() reference must be preserved — it must NOT be inlined to the
    // concrete color, because the variable lives on an ancestor element.
    const result = declsWithVars(`background: var(--clr);`, {
      "--clr": "tomato",
    });
    expect(result).toEqual(
      expect.arrayContaining([
        prop(
          "background-color",
          expect.objectContaining({ type: "var", value: "clr" })
        ),
      ])
    );
  });

  test("background: same-rule var takes precedence over cssVars", () => {
    // same rule has --clr: blue, cssVars has --clr: red — blue wins
    const result = declsWithVars(`--clr: blue; background: var(--clr);`, {
      "--clr": "red",
    });
    expect(result).toEqual(
      expect.arrayContaining([prop("background-color", kw("blue"))])
    );
  });

  test("background: mixed — one var from same rule, one from cssVars", () => {
    // --img is in same rule, --pos is only in cssVars
    const result = declsWithVars(
      `--img: url(hero.png); background: var(--img) var(--pos);`,
      { "--pos": "center" }
    );
    expect(result).toEqual(
      expect.arrayContaining([
        prop(
          "background-image",
          layers(expect.objectContaining({ type: "image" }))
        ),
        prop("background-position-x", layers(kw("center"))),
      ])
    );
  });

  // ── border ────────────────────────────────────────────────────────────────

  test("border: cross-rule var for width via cssVars", () => {
    const result = declsWithVars(`border: var(--bw) solid black;`, {
      "--bw": "2px",
    });
    expect(result).toEqual(
      expect.arrayContaining([
        prop("border-top-width", u(2, "px")),
        prop("border-right-width", u(2, "px")),
        prop("border-bottom-width", u(2, "px")),
        prop("border-left-width", u(2, "px")),
      ])
    );
  });

  test("border: cross-rule var for color via cssVars", () => {
    const result = declsWithVars(`border: 1px solid var(--border-clr);`, {
      "--border-clr": "#333",
    });
    expect(result).toEqual(
      expect.arrayContaining([
        prop("border-top-color", expect.objectContaining({ type: "color" })),
        prop("border-right-color", expect.objectContaining({ type: "color" })),
        prop("border-bottom-color", expect.objectContaining({ type: "color" })),
        prop("border-left-color", expect.objectContaining({ type: "color" })),
      ])
    );
  });

  test("border: width from same rule, color from cssVars", () => {
    const result = declsWithVars(
      `--w: 3px; border: var(--w) dashed var(--clr);`,
      { "--clr": "navy" }
    );
    expect(result).toEqual(
      expect.arrayContaining([
        prop("border-top-width", u(3, "px")),
        prop("border-top-style", kw("dashed")),
        prop("border-top-color", kw("navy")),
      ])
    );
  });

  // ── margin / padding ──────────────────────────────────────────────────────

  test("margin: cross-rule var for all sides via cssVars", () => {
    // Single cross-rule var: var() reference must be preserved on every
    // expanded longhand (all four sides receive the var's value).
    const result = declsWithVars(`margin: var(--space);`, {
      "--space": "16px",
    });
    const varSpace = expect.objectContaining({ type: "var", value: "space" });
    expect(result).toEqual(
      expect.arrayContaining([
        prop("margin-top", varSpace),
        prop("margin-right", varSpace),
        prop("margin-bottom", varSpace),
        prop("margin-left", varSpace),
      ])
    );
  });

  test("padding: cross-rule var for horizontal via cssVars", () => {
    const result = declsWithVars(`padding: var(--v) var(--h);`, {
      "--v": "8px",
      "--h": "16px",
    });
    expect(result).toEqual(
      expect.arrayContaining([
        prop("padding-top", u(8, "px")),
        prop("padding-right", u(16, "px")),
        prop("padding-bottom", u(8, "px")),
        prop("padding-left", u(16, "px")),
      ])
    );
  });

  // ── transition ────────────────────────────────────────────────────────────

  test("transition: cross-rule var for duration via cssVars", () => {
    const result = declsWithVars(`transition: opacity var(--speed) ease;`, {
      "--speed": "400ms",
    });
    const duration = result.find((d) => d.property === "transition-duration");
    expect(duration?.value).toEqual(
      layers(expect.objectContaining({ type: "unit", value: 400, unit: "ms" }))
    );
  });

  test("transition: duration from same rule, delay from cssVars", () => {
    const result = declsWithVars(
      `--dur: 200ms; transition: color var(--dur) linear var(--del);`,
      { "--del": "100ms" }
    );
    const duration = result.find((d) => d.property === "transition-duration");
    const delay = result.find((d) => d.property === "transition-delay");
    expect(duration?.value).toEqual(
      layers(expect.objectContaining({ type: "unit", value: 200, unit: "ms" }))
    );
    expect(delay?.value).toEqual(
      layers(expect.objectContaining({ type: "unit", value: 100, unit: "ms" }))
    );
  });

  // ── font ──────────────────────────────────────────────────────────────────

  test("font: cross-rule var for size via cssVars", () => {
    const result = declsWithVars(`font: bold var(--fs) sans-serif;`, {
      "--fs": "18px",
    });
    expect(result).toEqual(
      expect.arrayContaining([prop("font-size", u(18, "px"))])
    );
  });

  test("font: weight from cssVars, size from same rule", () => {
    const result = declsWithVars(
      `--sz: 14px; font: var(--fw) var(--sz) Arial;`,
      {
        "--fw": "600",
      }
    );
    expect(result).toEqual(
      expect.arrayContaining([
        prop("font-weight", num(600)),
        prop("font-size", u(14, "px")),
      ])
    );
  });

  // ── flex ──────────────────────────────────────────────────────────────────

  test("flex: cross-rule var for basis via cssVars", () => {
    const result = declsWithVars(`flex: 1 1 var(--basis);`, {
      "--basis": "300px",
    });
    expect(result).toEqual(
      expect.arrayContaining([prop("flex-basis", u(300, "px"))])
    );
  });

  // ── gap ───────────────────────────────────────────────────────────────────

  test("gap: cross-rule vars for row and column via cssVars", () => {
    const result = declsWithVars(`gap: var(--row-gap) var(--col-gap);`, {
      "--row-gap": "8px",
      "--col-gap": "16px",
    });
    expect(result).toEqual(
      expect.arrayContaining([
        prop("row-gap", u(8, "px")),
        prop("column-gap", u(16, "px")),
      ])
    );
  });

  // ── multi-token cross-rule var ────────────────────────────────────────────

  test("border: cross-rule multi-token var preserves var() on all longhands", () => {
    // --b resolves to a full shorthand value; no single longhand string equals
    // "2px solid red", so var() must be assigned to every longhand.
    const result = declsWithVars(`border: var(--b);`, {
      "--b": "2px solid red",
    });
    const varB = expect.objectContaining({ type: "var", value: "b" });
    expect(result).toEqual(
      expect.arrayContaining([
        prop("border-top-width", varB),
        prop("border-top-style", varB),
        prop("border-top-color", varB),
        prop("border-right-width", varB),
      ])
    );
  });

  test("background: cross-rule multi-token var preserves var() on all longhands", () => {
    const result = declsWithVars(`background: var(--bg);`, {
      "--bg": "url(hero.png) no-repeat center",
    });
    const varBg = expect.objectContaining({ type: "var", value: "bg" });
    expect(result).toEqual(
      expect.arrayContaining([
        prop("background-image", varBg),
        prop("background-repeat", varBg),
        prop("background-position-x", varBg),
      ])
    );
  });

  test("padding: cross-rule two-value var preserves var() on all sides", () => {
    // --p: 8px 16px resolves to different values per side; none equals the
    // full "8px 16px" text → all four padding longhands get var(--p).
    const result = declsWithVars(`padding: var(--p);`, {
      "--p": "8px 16px",
    });
    const varP = expect.objectContaining({ type: "var", value: "p" });
    expect(result).toEqual(
      expect.arrayContaining([
        prop("padding-top", varP),
        prop("padding-right", varP),
        prop("padding-bottom", varP),
        prop("padding-left", varP),
      ])
    );
  });

  test("background: cross-rule rgb-with-spaces var preserves var() on background-color", () => {
    // csstree normalises rgb(255, 0, 0) to rgb(255,0,0) in expandShorthands;
    // the comparison must account for this whitespace difference.
    const result = declsWithVars(`background: var(--clr);`, {
      "--clr": "rgb(255, 0, 0)",
    });
    expect(result).toEqual(
      expect.arrayContaining([
        prop(
          "background-color",
          expect.objectContaining({ type: "var", value: "clr" })
        ),
      ])
    );
  });

  // ── multiple rules: cssVars doesn't bleed between rules ───────────────────

  test("cssVars are available in both rules when passed", () => {
    const styles = parseCss(
      `.a { border: var(--w) solid red; } .b { margin: var(--w); }`,
      new Map([["--w", "4px"]])
    ).styles;
    const aBorderTop = styles.find(
      (d) => d.selector === ".a" && d.property === "border-top-width"
    );
    const bMarginTop = styles.find(
      (d) => d.selector === ".b" && d.property === "margin-top"
    );
    // .a: border has extra tokens ("solid red") — not a single var, so resolved
    expect(aBorderTop?.value).toEqual(u(4, "px"));
    // .b: margin is a single cross-rule var — var() reference is preserved
    expect(bMarginTop?.value).toEqual(
      expect.objectContaining({ type: "var", value: "w" })
    );
  });

  test("same-rule var overrides cssVars in first rule, not second", () => {
    // .a has --w: 10px in same rule, .b does not
    const styles = parseCss(
      `.a { --w: 10px; margin: var(--w); } .b { margin: var(--w); }`,
      new Map([["--w", "4px"]])
    ).styles;
    const aMarginTop = styles.find(
      (d) => d.selector === ".a" && d.property === "margin-top"
    );
    const bMarginTop = styles.find(
      (d) => d.selector === ".b" && d.property === "margin-top"
    );
    // .a: same-rule var → inlined to concrete value
    expect(aMarginTop?.value).toEqual(u(10, "px"));
    // .b: cross-rule var → var() reference preserved
    expect(bMarginTop?.value).toEqual(
      expect.objectContaining({ type: "var", value: "w" })
    );
  });

  const unsupportedFixtures = propertyVarTestFixtures.filter(
    (fixture) => fixture.cases.length === 0
  );

  test("grammar var fixture covers every supported property", () => {
    expect(unsupportedFixtures).toEqual([]);
  });

  const generatedCases = propertyVarTestFixtures.flatMap((fixture) => {
    return fixture.cases.map((testCase) => ({
      caseId: testCase.id,
      kind: fixture.kind,
      positions: testCase.positions,
      property: fixture.property,
      syntax: fixture.syntax,
      value: testCase.value,
      variables: testCase.variables,
    }));
  });

  const knownResolvedGapCases = new Set([
    "font/pattern-1-slot-1",
    "list-style/pattern-1-slot-2",
  ]);

  const resolvableGeneratedCases = generatedCases.filter((testCase) => {
    return (
      knownResolvedGapCases.has(`${testCase.property}/${testCase.caseId}`) ===
      false
    );
  });

  test.each(resolvableGeneratedCases)(
    "grammar var case: $property / $caseId — cssVars resolve without invalid values",
    ({ property, value, variables }) => {
      const result = declsWithVars(`${property}: ${value};`, variables);
      expect(result.length).toBeGreaterThan(0);
      const invalids = result.filter((decl) => decl.value.type === "invalid");
      expect(invalids).toHaveLength(0);
    }
  );

  const unresolvedGeneratedGapCases = generatedCases.filter((testCase) => {
    return knownResolvedGapCases.has(`${testCase.property}/${testCase.caseId}`);
  });

  test.each(unresolvedGeneratedGapCases)(
    "grammar var case: $property / $caseId — current parser gap is explicit",
    ({ property, value, variables }) => {
      const result = declsWithVars(`${property}: ${value};`, variables);
      const invalids = result.filter((decl) => decl.value.type === "invalid");
      expect(result.length === 0 || invalids.length > 0).toBe(true);
    }
  );

  test.each(generatedCases)(
    "grammar var case: $property / $caseId — authored var references stay parseable",
    ({ property, value }) => {
      const result = decls(`${property}: ${value};`);
      expect(result.length).toBeGreaterThan(0);
      const invalids = result.filter((decl) => decl.value.type === "invalid");
      expect(invalids).toHaveLength(0);
      const preserved = result.some((decl) =>
        valueContainsVarReference(decl.value)
      );
      expect(preserved).toBe(true);
    }
  );
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
