import { describe, expect, test } from "@jest/globals";
import { parseCss } from "./parse-css";

describe("Parse CSS", () => {
  test("longhand property name with keyword value", () => {
    expect(parseCss(`.test { background-color: red }`)).toMatchInlineSnapshot(`
      {
        "test": [
          {
            "property": "backgroundColor",
            "value": {
              "type": "keyword",
              "value": "red",
            },
          },
        ],
      }
    `);
  });

  test("one class selector rules", () => {
    expect(parseCss(`.test { color: #ff0000 }`)).toMatchInlineSnapshot(`
      {
        "test": [
          {
            "property": "color",
            "value": {
              "alpha": 1,
              "b": 0,
              "g": 0,
              "r": 255,
              "type": "rgb",
            },
          },
        ],
      }
    `);
  });

  test("parses supported shorthand values", () => {
    const css = `
      .test {
        background: #ff0000 linear-gradient(180deg, #11181C 0%, rgba(17, 24, 28, 0) 36.09%), #EBFFFC;
      }
    `;
    expect(parseCss(css)).toMatchInlineSnapshot(`
      {
        "test": [
          {
            "property": "backgroundImage",
            "value": {
              "type": "layers",
              "value": [
                {
                  "type": "unparsed",
                  "value": "linear-gradient(180deg,#11181C 0%,rgba(17,24,28,0) 36.09%)",
                },
              ],
            },
          },
          {
            "property": "backgroundColor",
            "value": {
              "alpha": 1,
              "b": 252,
              "g": 255,
              "r": 235,
              "type": "rgb",
            },
          },
        ],
      }
    `);
  });

  test("parses supported shorthand values 2", () => {
    const css = `
      .test {
          background-image: linear-gradient(180deg, hsla(0, 0.00%, 0.00%, 0.11), white), url("https://667d0b7769e0cc3754b584f6"), none, url("https://667d0fe180995eadc1534a26");
          background-position: 0px 0px, 550px 0px, 0px 0px, 0px 0px;
          background-size: auto, contain, auto, auto;
          background-repeat: repeat, no-repeat, repeat, repeat;
          background-attachment: scroll, fixed, scroll, scroll;
      }
    `;
    expect(parseCss(css)).toMatchInlineSnapshot(`
{
  "test": [
    {
      "property": "backgroundImage",
      "value": {
        "type": "layers",
        "value": [
          {
            "type": "unparsed",
            "value": "linear-gradient(180deg,hsla(0,0.00%,0.00%,0.11),white)",
          },
          {
            "type": "image",
            "value": {
              "type": "url",
              "url": "https://667d0b7769e0cc3754b584f6",
            },
          },
          {
            "type": "keyword",
            "value": "none",
          },
          {
            "type": "image",
            "value": {
              "type": "url",
              "url": "https://667d0fe180995eadc1534a26",
            },
          },
        ],
      },
    },
    {
      "property": "backgroundPosition",
      "value": {
        "type": "layers",
        "value": [
          {
            "type": "tuple",
            "value": [
              {
                "type": "unit",
                "unit": "px",
                "value": 0,
              },
              {
                "type": "unit",
                "unit": "px",
                "value": 0,
              },
            ],
          },
          {
            "type": "tuple",
            "value": [
              {
                "type": "unit",
                "unit": "px",
                "value": 550,
              },
              {
                "type": "unit",
                "unit": "px",
                "value": 0,
              },
            ],
          },
          {
            "type": "tuple",
            "value": [
              {
                "type": "unit",
                "unit": "px",
                "value": 0,
              },
              {
                "type": "unit",
                "unit": "px",
                "value": 0,
              },
            ],
          },
          {
            "type": "tuple",
            "value": [
              {
                "type": "unit",
                "unit": "px",
                "value": 0,
              },
              {
                "type": "unit",
                "unit": "px",
                "value": 0,
              },
            ],
          },
        ],
      },
    },
    {
      "property": "backgroundSize",
      "value": {
        "type": "layers",
        "value": [
          {
            "type": "keyword",
            "value": "auto",
          },
          {
            "type": "keyword",
            "value": "contain",
          },
          {
            "type": "keyword",
            "value": "auto",
          },
          {
            "type": "keyword",
            "value": "auto",
          },
        ],
      },
    },
    {
      "property": "backgroundRepeat",
      "value": {
        "type": "layers",
        "value": [
          {
            "type": "keyword",
            "value": "repeat",
          },
          {
            "type": "keyword",
            "value": "no-repeat",
          },
          {
            "type": "keyword",
            "value": "repeat",
          },
          {
            "type": "keyword",
            "value": "repeat",
          },
        ],
      },
    },
    {
      "property": "backgroundAttachment",
      "value": {
        "type": "layers",
        "value": [
          {
            "type": "keyword",
            "value": "scroll",
          },
          {
            "type": "keyword",
            "value": "fixed",
          },
          {
            "type": "keyword",
            "value": "scroll",
          },
          {
            "type": "keyword",
            "value": "scroll",
          },
        ],
      },
    },
  ],
}
`);
  });

  test("parses single layer", () => {
    const css = `
      .test {
          background-image: none; background-position: 0px 0px; background-size: auto;
      }
    `;
    expect(parseCss(css)).toMatchInlineSnapshot(`
{
  "test": [
    {
      "property": "backgroundImage",
      "value": {
        "type": "layers",
        "value": [
          {
            "type": "keyword",
            "value": "none",
          },
        ],
      },
    },
    {
      "property": "backgroundPosition",
      "value": {
        "type": "layers",
        "value": [
          {
            "type": "tuple",
            "value": [
              {
                "type": "unit",
                "unit": "px",
                "value": 0,
              },
              {
                "type": "unit",
                "unit": "px",
                "value": 0,
              },
            ],
          },
        ],
      },
    },
    {
      "property": "backgroundSize",
      "value": {
        "type": "layers",
        "value": [
          {
            "type": "keyword",
            "value": "auto",
          },
        ],
      },
    },
  ],
}
`);
  });

  test("parse state", () => {
    expect(parseCss(`a:hover { color: #ff0000 }`)).toMatchInlineSnapshot(`
      {
        "a": [
          {
            "property": "color",
            "state": ":hover",
            "value": {
              "alpha": 1,
              "b": 0,
              "g": 0,
              "r": 255,
              "type": "rgb",
            },
          },
        ],
      }
    `);
  });

  test("parse pseudo element", () => {
    expect(parseCss(`input::placeholder { color: #ff0000 }`))
      .toMatchInlineSnapshot(`
      {
        "input": [
          {
            "property": "color",
            "state": "::placeholder",
            "value": {
              "alpha": 1,
              "b": 0,
              "g": 0,
              "r": 255,
              "type": "rgb",
            },
          },
        ],
      }
    `);
  });

  test("parse multiple selectors, one with state", () => {
    expect(parseCss(`a, a:hover { color: #ff0000 }`)).toMatchInlineSnapshot(`
      {
        "a": [
          {
            "property": "color",
            "value": {
              "alpha": 1,
              "b": 0,
              "g": 0,
              "r": 255,
              "type": "rgb",
            },
          },
          {
            "property": "color",
            "state": ":hover",
            "value": {
              "alpha": 1,
              "b": 0,
              "g": 0,
              "r": 255,
              "type": "rgb",
            },
          },
        ],
      }
    `);
  });

  test("parse multiple selectors, both with state", () => {
    expect(parseCss(`a:active, a:hover { color: #ff0000 }`))
      .toMatchInlineSnapshot(`
      {
        "a": [
          {
            "property": "color",
            "state": ":active",
            "value": {
              "alpha": 1,
              "b": 0,
              "g": 0,
              "r": 255,
              "type": "rgb",
            },
          },
          {
            "property": "color",
            "state": ":hover",
            "value": {
              "alpha": 1,
              "b": 0,
              "g": 0,
              "r": 255,
              "type": "rgb",
            },
          },
        ],
      }
    `);
  });

  test("parse multiple rules", () => {
    expect(parseCss(`a { color: red} a:hover { color: #ff0000 }`))
      .toMatchInlineSnapshot(`
        {
          "a": [
            {
              "property": "color",
              "value": {
                "type": "keyword",
                "value": "red",
              },
            },
            {
              "property": "color",
              "state": ":hover",
              "value": {
                "alpha": 1,
                "b": 0,
                "g": 0,
                "r": 255,
                "type": "rgb",
              },
            },
          ],
        }
    `);
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
    expect(parseCss(css)).toMatchInlineSnapshot(`
      {
        "h1": [
          {
            "property": "marginBottom",
            "value": {
              "type": "unit",
              "unit": "px",
              "value": 10,
            },
          },
          {
            "property": "fontWeight",
            "value": {
              "type": "keyword",
              "value": "bold",
            },
          },
          {
            "property": "marginTop",
            "value": {
              "type": "unit",
              "unit": "px",
              "value": 20,
            },
          },
          {
            "property": "fontSize",
            "value": {
              "type": "unit",
              "unit": "px",
              "value": 38,
            },
          },
          {
            "property": "lineHeight",
            "value": {
              "type": "unit",
              "unit": "px",
              "value": 44,
            },
          },
        ],
      }
    `);
  });

  test("parse shorthand", () => {
    expect(parseCss(`a { border: 1px solid red }`)).toMatchInlineSnapshot(`
      {
        "a": [
          {
            "property": "borderTopWidth",
            "value": {
              "type": "unit",
              "unit": "px",
              "value": 1,
            },
          },
          {
            "property": "borderRightWidth",
            "value": {
              "type": "unit",
              "unit": "px",
              "value": 1,
            },
          },
          {
            "property": "borderBottomWidth",
            "value": {
              "type": "unit",
              "unit": "px",
              "value": 1,
            },
          },
          {
            "property": "borderLeftWidth",
            "value": {
              "type": "unit",
              "unit": "px",
              "value": 1,
            },
          },
          {
            "property": "borderTopStyle",
            "value": {
              "type": "keyword",
              "value": "solid",
            },
          },
          {
            "property": "borderRightStyle",
            "value": {
              "type": "keyword",
              "value": "solid",
            },
          },
          {
            "property": "borderBottomStyle",
            "value": {
              "type": "keyword",
              "value": "solid",
            },
          },
          {
            "property": "borderLeftStyle",
            "value": {
              "type": "keyword",
              "value": "solid",
            },
          },
          {
            "property": "borderTopColor",
            "value": {
              "type": "keyword",
              "value": "red",
            },
          },
          {
            "property": "borderRightColor",
            "value": {
              "type": "keyword",
              "value": "red",
            },
          },
          {
            "property": "borderBottomColor",
            "value": {
              "type": "keyword",
              "value": "red",
            },
          },
          {
            "property": "borderLeftColor",
            "value": {
              "type": "keyword",
              "value": "red",
            },
          },
        ],
      }
    `);
  });

  // @todo https://github.com/webstudio-is/webstudio/issues/3399
  test("parse variable", () => {
    expect(parseCss(`a { color: var(--color) }`)).toMatchInlineSnapshot(`
      {
        "a": [
          {
            "property": "color",
            "value": {
              "type": "keyword",
              "value": "unset",
            },
          },
        ],
      }
    `);
  });

  test("parse empty value as unset", () => {
    expect(parseCss(`a { color: ; background-color: red }`))
      .toMatchInlineSnapshot(`
      {
        "a": [
          {
            "property": "color",
            "value": {
              "type": "keyword",
              "value": "unset",
            },
          },
          {
            "property": "backgroundColor",
            "value": {
              "type": "keyword",
              "value": "red",
            },
          },
        ],
      }
    `);
  });

  test("unprefix property that doesn't need a prefix", () => {
    expect(parseCss(`a { -webkit-color: red; }`)).toMatchInlineSnapshot(`
      {
        "a": [
          {
            "property": "color",
            "value": {
              "type": "keyword",
              "value": "red",
            },
          },
        ],
      }
    `);
  });

  test("keep prefix for property that needs one", () => {
    // @todo parser is wrong here, it should be keyword horizontal
    expect(parseCss(`a { -webkit-box-orient: horizontal; }`))
      .toMatchInlineSnapshot(`
{
  "a": [
    {
      "property": "-webkit-box-orient",
      "value": {
        "type": "keyword",
        "value": "horizontal",
      },
    },
  ],
}
`);
  });

  test("parse child combinator", () => {
    expect(parseCss(`a > b { color: #ff0000 }`)).toMatchInlineSnapshot(`{}`);
  });

  test("parse space combinator", () => {
    expect(parseCss(`a b { color: #ff0000 }`)).toMatchInlineSnapshot(`{}`);
  });
});
