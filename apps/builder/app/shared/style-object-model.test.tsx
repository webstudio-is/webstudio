import { expect, test } from "@jest/globals";
import type { Instance, StyleDecl, StyleSource } from "@webstudio-is/sdk";
import { $, renderJsx } from "@webstudio-is/sdk/testing";
import {
  type StyleObjectModel,
  type StyleSelector,
  getComputedStyleDecl,
} from "./style-object-model";
import { parseCss } from "@webstudio-is/css-data";
import { mapGroupBy } from "./shim";

const createModel = ({
  css,
  jsx,
}: {
  css: string;
  jsx: JSX.Element;
}): StyleObjectModel => {
  const parsedStyles = parseCss(css, { customProperties: true });
  const styles: StyleDecl[] = [];
  for (const { breakpoint, selector, state, property, value } of parsedStyles) {
    styles.push({
      styleSourceId: selector,
      breakpointId: breakpoint ?? "base",
      state,
      property,
      value,
    });
  }
  const { props } = renderJsx(jsx);
  const styleSourcesByInstanceId = new Map<
    Instance["id"],
    StyleSource["id"][]
  >();
  for (const prop of props.values()) {
    if (prop.name === "class" && prop.type === "string") {
      styleSourcesByInstanceId.set(prop.instanceId, prop.value.split(" "));
    }
  }
  return {
    styleSourcesByInstanceId,
    styleByStyleSourceId: mapGroupBy(
      styles,
      (styleDecl) => `${styleDecl.styleSourceId}:${styleDecl.property}` as const
    ),
    metas: new Map(),
    instanceTags: new Map(),
    instanceComponents: new Map(),
  };
};

const getStyleByStyleSourceId = (styles: StyleDecl[]) => {
  return mapGroupBy(
    styles,
    (styleDecl) => `${styleDecl.styleSourceId}:${styleDecl.property}` as const
  );
};

test("use cascaded style when specified and fallback to initial value", () => {
  const model = createModel({
    css: `
      bodyLocal {
        width: 10px;
      }
    `,
    jsx: <$.Body ws:id="body" class="bodyLocal"></$.Body>,
  });
  const styleSelector: StyleSelector = {
    instanceSelector: ["body"],
    matchingBreakpoints: ["base"],
    matchingStates: new Set(),
  };
  // cascaded property
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "width" }).usedValue
  ).toEqual({ type: "unit", unit: "px", value: 10 });
  // initial for not inherited property
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "height" }).usedValue
  ).toEqual({ type: "keyword", value: "auto" });
  // initial for inherited property
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "keyword", value: "black" });
});

test("support initial keyword", () => {
  const model = createModel({
    css: `
      bodyLocal {
        width: initial;
      }
    `,
    jsx: <$.Body ws:id="body" class="bodyLocal"></$.Body>,
  });
  const styleSelector: StyleSelector = {
    instanceSelector: ["body"],
    matchingBreakpoints: ["base"],
    matchingStates: new Set(),
  };
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "width" }).usedValue
  ).toEqual({ type: "keyword", value: "auto" });
});

test("support inherit keyword", () => {
  const model = createModel({
    css: `
      level1Local {
        height: 20px;
      }
      level2Local {
        width: 10px;
      }
      level3Local {
        width: inherit;
        height: inherit;
      }
    `,
    jsx: (
      <$.Box ws:id="level1" class="level1Local">
        <$.Box ws:id="level2" class="level2Local">
          <$.Box ws:id="level3" class="level3Local"></$.Box>
        </$.Box>
      </$.Box>
    ),
  });
  const styleSelector: StyleSelector = {
    instanceSelector: ["level3", "level2", "level1"],
    matchingBreakpoints: ["base"],
    matchingStates: new Set(),
  };
  // should inherit declared value
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "width" }).usedValue
  ).toEqual({ type: "unit", unit: "px", value: 10 });
  // should inherit initial value as height is not inherited
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "height" }).usedValue
  ).toEqual({ type: "keyword", value: "auto" });
});

test("support unset keyword", () => {
  const model = createModel({
    css: `
      level1Local {
        color: blue;
        width: 10px;
      }
      level2Local {
        color: unset;
        width: unset;
      }
    `,
    jsx: (
      <$.Box ws:id="level1" class="level1Local">
        <$.Box ws:id="level2" class="level2Local"></$.Box>
      </$.Box>
    ),
  });
  const styleSelector: StyleSelector = {
    instanceSelector: ["level2", "level1"],
    matchingBreakpoints: ["base"],
    matchingStates: new Set(),
  };
  // when property is not inherited use initial value
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "width" }).usedValue
  ).toEqual({ type: "keyword", value: "auto" });
  // when property is inherited use inherited value
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "keyword", value: "blue" });
});

test("inherit style from ancestors", () => {
  const model = createModel({
    css: `
      level1Local {
        color: blue;
        width: 10px;
      }
    `,
    jsx: (
      <$.Box ws:id="level1" class="level1Local">
        <$.Box ws:id="level2" class="level2Local">
          <$.Box ws:id="level3" class="level3Local"></$.Box>
        </$.Box>
      </$.Box>
    ),
  });
  const styleSelector: StyleSelector = {
    instanceSelector: ["level3", "level2", "level1"],
    matchingBreakpoints: ["base"],
    matchingStates: new Set(),
  };
  // inherited value
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "keyword", value: "blue" });
  // not inherited value
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "width" }).usedValue
  ).toEqual({ type: "keyword", value: "auto" });
});

test("support currentcolor keyword", () => {
  const model = createModel({
    css: `
      level1Local {
        color: blue;
      }
      level2Local {
        /* support lower case */
        border-top-color: currentcolor;
        /* support camel case */
        background-color: currentColor;
      }
    `,
    jsx: (
      <$.Box ws:id="level1" class="level1Local">
        <$.Box ws:id="level2" class="level2Local"></$.Box>
      </$.Box>
    ),
  });
  const styleSelector: StyleSelector = {
    instanceSelector: ["level2", "level1"],
    matchingBreakpoints: ["base"],
    matchingStates: new Set(),
  };
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "borderTopColor" })
      .usedValue
  ).toEqual({ type: "keyword", value: "blue" });
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "backgroundColor" })
      .usedValue
  ).toEqual({ type: "keyword", value: "blue" });
});

test("in color property currentcolor is inherited", () => {
  const model = createModel({
    css: `
      level1Local {
        color: blue;
      }
      level2Local {
        color: currentcolor;
      }
      level3Local {
        color: currentcolor;
      }
    `,
    jsx: (
      <$.Box ws:id="level1" class="level1Local">
        <$.Box ws:id="level2" class="level2Local"></$.Box>
      </$.Box>
    ),
  });
  const styleSelector: StyleSelector = {
    instanceSelector: ["level3", "level2", "level1"],
    matchingBreakpoints: ["base"],
    matchingStates: new Set(),
  };
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "keyword", value: "blue" });
});

test("in root color property currentcolor is initial", () => {
  const model = createModel({
    css: `
      bodyLocal {
        color: currentcolor;
      }
    `,
    jsx: <$.Body ws:id="body" class="bodyLocal"></$.Body>,
  });
  const styleSelector: StyleSelector = {
    instanceSelector: ["body"],
    matchingBreakpoints: ["base"],
    matchingStates: new Set(),
  };
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "keyword", value: "black" });
});

test("support custom properties", () => {
  const model = createModel({
    css: `
      bodyLocal {
        --my-property: blue;
        color: var(--my-property);
      }
    `,
    jsx: <$.Body ws:id="body" class="bodyLocal"></$.Body>,
  });
  const styleSelector: StyleSelector = {
    instanceSelector: ["body"],
    matchingBreakpoints: ["base"],
    matchingStates: new Set(),
  };
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "--my-property" })
      .usedValue
  ).toEqual({ type: "unparsed", value: "blue" });
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "unparsed", value: "blue" });
});

test("use fallback value when custom property does not exist", () => {
  const model = createModel({
    css: `
      bodyLocal {
        color: var(--my-property, red);
      }
    `,
    jsx: <$.Body ws:id="body" class="bodyLocal"></$.Body>,
  });
  const styleSelector: StyleSelector = {
    instanceSelector: ["body"],
    matchingBreakpoints: ["base"],
    matchingStates: new Set(),
  };
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "unparsed", value: "red" });
});

test("use initial value when custom property does not exist", () => {
  const model = createModel({
    css: `
      bodyLocal {
        color: var(--my-property);
      }
    `,
    jsx: <$.Body ws:id="body" class="bodyLocal"></$.Body>,
  });
  const styleSelector: StyleSelector = {
    instanceSelector: ["body"],
    matchingBreakpoints: ["base"],
    matchingStates: new Set(),
  };
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "keyword", value: "black" });
});

test("use inherited value when custom property does not exist", () => {
  const model = createModel({
    css: `
      bodyLocal {
        color: red;
        width: fit-content;
      }
      boxLocal {
        color: var(--my-property);
        width: var(--my-property);
      }
    `,
    jsx: (
      <$.Body ws:id="body" class="bodyLocal">
        <$.Box ws:id="box" class="boxLocal"></$.Box>
      </$.Body>
    ),
  });
  const styleSelector: StyleSelector = {
    instanceSelector: ["box", "body"],
    matchingBreakpoints: ["base"],
    matchingStates: new Set(),
  };
  // inherited property use inherited value
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "keyword", value: "red" });
  // not inherited property use initial value
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "width" }).usedValue
  ).toEqual({ type: "keyword", value: "auto" });
});

test("inherit custom property", () => {
  const model = createModel({
    css: `
      level1Local {
        --my-property: blue;
      }
      level3Local {
        color: var(--my-property);
      }
    `,
    jsx: (
      <$.Box ws:id="level1" class="level1Local">
        <$.Box ws:id="level2" class="level2Local">
          <$.Box ws:id="level3" class="level3Local"></$.Box>
        </$.Box>
      </$.Box>
    ),
  });
  const styleSelector: StyleSelector = {
    instanceSelector: ["level3", "level2", "level1"],
    matchingBreakpoints: ["base"],
    matchingStates: new Set(),
  };
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "--my-property" })
      .usedValue
  ).toEqual({ type: "unparsed", value: "blue" });
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "unparsed", value: "blue" });
});

test("resolve dependency cycles in custom properties", () => {
  const model = createModel({
    css: `
      bodyLocal {
        --color: red;
      }
      boxLocal {
        --color: var(--another);
        --another: var(--color);
        color: var(--color);
      }
    `,
    jsx: (
      <$.Body ws:id="body" class="bodyLocal">
        <$.Box ws:id="box" class="boxLocal"></$.Box>
      </$.Body>
    ),
  });
  const styleSelector: StyleSelector = {
    instanceSelector: ["box", "body"],
    matchingBreakpoints: ["base"],
    matchingStates: new Set(),
  };
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "keyword", value: "black" });
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "--color" })
      .usedValue
  ).toEqual({ type: "invalid", value: "" });
});

test("resolve non-cyclic references in custom properties", () => {
  const model = createModel({
    css: `
      bodyLocal {
        --color: red;
        --another: var(--color);
      }
      boxLocal {
        --color: var(--another);
        color: var(--color);
      }
    `,
    jsx: (
      <$.Body ws:id="body" class="bodyLocal">
        <$.Box ws:id="box" class="boxLocal"></$.Box>
      </$.Body>
    ),
  });
  const styleSelector: StyleSelector = {
    instanceSelector: ["box", "body"],
    matchingBreakpoints: ["base"],
    matchingStates: new Set(),
  };
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "color" }).usedValue
  ).toEqual({ type: "unparsed", value: "red" });
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "--color" })
      .usedValue
  ).toEqual({ type: "unparsed", value: "red" });
});

test("cascade value from matching breakpoints", () => {
  // @media small { body { width: 20px } }
  // @media large { body { width: 30px } }
  // @media base { body { width: 10px } }
  const styles: StyleDecl[] = [
    {
      breakpointId: "small",
      styleSourceId: "bodyLocal",
      property: "width",
      value: { type: "unit", value: 20, unit: "px" },
    },
    {
      breakpointId: "large",
      styleSourceId: "bodyLocal",
      property: "width",
      value: { type: "unit", value: 30, unit: "px" },
    },
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
    metas: new Map(),
    instanceTags: new Map(),
    instanceComponents: new Map(),
  };
  const styleSelector: StyleSelector = {
    instanceSelector: ["body"],
    matchingBreakpoints: ["base", "small", "large"],
    matchingStates: new Set(),
  };
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "width" }).usedValue
  ).toEqual({ type: "unit", unit: "px", value: 30 });
});

test("ignore values from not matching breakpoints", () => {
  // @media base { body { width: 10px } }
  // @media small { body { width: 20px } }
  // @media large { body { width: 30px } }
  const styles: StyleDecl[] = [
    {
      breakpointId: "base",
      styleSourceId: "bodyLocal",
      property: "width",
      value: { type: "unit", value: 10, unit: "px" },
    },
    {
      breakpointId: "small",
      styleSourceId: "bodyLocal",
      property: "width",
      value: { type: "unit", value: 20, unit: "px" },
    },
    {
      breakpointId: "large",
      styleSourceId: "bodyLocal",
      property: "width",
      value: { type: "unit", value: 30, unit: "px" },
    },
  ];
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([["body", ["bodyLocal"]]]),
    styleByStyleSourceId: getStyleByStyleSourceId(styles),
    metas: new Map(),
    instanceTags: new Map(),
    instanceComponents: new Map(),
  };
  const styleSelector: StyleSelector = {
    instanceSelector: ["body"],
    // large is not matching breakpoint
    matchingBreakpoints: ["base", "small"],
    matchingStates: new Set(),
  };
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "width" }).usedValue
  ).toEqual({ type: "unit", unit: "px", value: 20 });
});

test("cascade value from matching style sources", () => {
  // .bodyLocal { width: 20px }
  // .bodyToken { width: 20px }
  const styles: StyleDecl[] = [
    {
      breakpointId: "base",
      styleSourceId: "bodyLocal",
      property: "width",
      value: { type: "unit", value: 20, unit: "px" },
    },
    {
      breakpointId: "base",
      styleSourceId: "bodyToken",
      property: "width",
      value: { type: "unit", value: 10, unit: "px" },
    },
  ];
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([["body", ["bodyToken", "bodyLocal"]]]),
    styleByStyleSourceId: getStyleByStyleSourceId(styles),
    metas: new Map(),
    instanceTags: new Map(),
    instanceComponents: new Map(),
  };
  const styleSelector: StyleSelector = {
    instanceSelector: ["body"],
    matchingBreakpoints: ["base"],
    matchingStates: new Set(),
  };
  // the latest token value wins
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "width" }).usedValue
  ).toEqual({ type: "unit", unit: "px", value: 20 });
});

test("cascade values with states as more specific", () => {
  // body:hover { width: 20px }
  // body { width: 10px }
  const styles: StyleDecl[] = [
    {
      breakpointId: "base",
      styleSourceId: "bodyLocal",
      state: ":hover",
      property: "width",
      value: { type: "unit", value: 20, unit: "px" },
    },
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
    metas: new Map(),
    instanceTags: new Map(),
    instanceComponents: new Map(),
  };
  const styleSelector: StyleSelector = {
    instanceSelector: ["body"],
    matchingBreakpoints: ["base"],
    matchingStates: new Set([":hover"]),
  };
  // value with state wins
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "width" }).usedValue
  ).toEqual({ type: "unit", unit: "px", value: 20 });
});

test("ignore values from not matching states", () => {
  // body { width: 10px }
  // body:hover { width: 20px }
  // body:focus { width: 30px }
  const styles: StyleDecl[] = [
    {
      breakpointId: "base",
      styleSourceId: "bodyLocal",
      property: "width",
      value: { type: "unit", value: 10, unit: "px" },
    },
    {
      breakpointId: "base",
      styleSourceId: "bodyLocal",
      state: ":hover",
      property: "width",
      value: { type: "unit", value: 20, unit: "px" },
    },
    {
      breakpointId: "base",
      styleSourceId: "bodyLocal",
      state: ":focus",
      property: "width",
      value: { type: "unit", value: 30, unit: "px" },
    },
  ];
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([["body", ["bodyLocal"]]]),
    styleByStyleSourceId: getStyleByStyleSourceId(styles),
    metas: new Map(),
    instanceTags: new Map(),
    instanceComponents: new Map(),
  };
  const styleSelector: StyleSelector = {
    instanceSelector: ["body"],
    matchingBreakpoints: ["base"],
    matchingStates: new Set([":hover"]),
  };
  // ignore :focus state because it is not matching
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "width" }).usedValue
  ).toEqual({ type: "unit", unit: "px", value: 20 });
});

test("support html styles", () => {
  // @layer browser { body { display: block } }
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([
      ["body", ["bodyLocal"]],
      ["span", ["spanLocal"]],
    ]),
    styleByStyleSourceId: getStyleByStyleSourceId([]),
    metas: new Map(),
    instanceTags: new Map([
      ["body", "body"],
      ["span", "span"],
    ]),
    instanceComponents: new Map(),
  };
  // tag with browser styles
  expect(
    getComputedStyleDecl({
      model,
      styleSelector: {
        instanceSelector: ["body"],
        matchingBreakpoints: ["base"],
        matchingStates: new Set(),
      },
      property: "display",
    }).usedValue
  ).toEqual({ type: "keyword", value: "block" });
  // tag without browser styles
  expect(
    getComputedStyleDecl({
      model,
      styleSelector: {
        instanceSelector: ["span"],
        matchingBreakpoints: ["base"],
        matchingStates: new Set(),
      },
      property: "display",
    }).usedValue
  ).toEqual({ type: "keyword", value: "inline" });
});

test("support preset styles", () => {
  // @layer preset { body:hover { width: 100px } }
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([["body", ["bodyLocal"]]]),
    styleByStyleSourceId: getStyleByStyleSourceId([]),
    instanceTags: new Map([["body", "body"]]),
    instanceComponents: new Map([["body", "Body"]]),
    metas: new Map([
      [
        "Body",
        {
          type: "container",
          icon: "",
          presetStyle: {
            body: [
              {
                property: "width",
                value: { type: "unit", value: 100, unit: "px" },
              },
            ],
          },
        },
      ],
    ]),
  };
  expect(
    getComputedStyleDecl({
      model,
      styleSelector: {
        instanceSelector: ["body"],
        matchingBreakpoints: ["base"],
        matchingStates: new Set(),
      },
      property: "width",
    }).usedValue
  ).toEqual({ type: "unit", value: 100, unit: "px" });
});

test("ignore values from not matching states in preset styles", () => {
  // @layer preset {
  //   body { color: red }
  //   body:focus { color: blue }
  // }
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([["body", ["bodyLocal"]]]),
    styleByStyleSourceId: getStyleByStyleSourceId([]),
    instanceTags: new Map([["body", "body"]]),
    instanceComponents: new Map([["body", "Body"]]),
    metas: new Map([
      [
        "Body",
        {
          type: "container",
          icon: "",
          presetStyle: {
            body: [
              {
                property: "color",
                value: { type: "keyword", value: "red" },
              },
              {
                state: ":focus",
                property: "color",
                value: { type: "keyword", value: "blue" },
              },
            ],
          },
        },
      ],
    ]),
  };
  expect(
    getComputedStyleDecl({
      model,
      styleSelector: {
        instanceSelector: ["body"],
        matchingBreakpoints: ["base"],
        matchingStates: new Set(),
      },
      property: "color",
    }).usedValue
  ).toEqual({ type: "keyword", value: "red" });
});

test("breakpoints are more specific than style sources", () => {
  // @media small { body { width: 20px } }
  // @media base { body { width: 10px } }
  const styles: StyleDecl[] = [
    {
      breakpointId: "small",
      styleSourceId: "bodyToken",
      property: "width",
      value: { type: "unit", value: 20, unit: "px" },
    },
    {
      breakpointId: "base",
      styleSourceId: "bodyLocal",
      property: "width",
      value: { type: "unit", value: 10, unit: "px" },
    },
  ];
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([["body", ["bodyToken", "bodyLocal"]]]),
    styleByStyleSourceId: getStyleByStyleSourceId(styles),
    metas: new Map(),
    instanceTags: new Map(),
    instanceComponents: new Map(),
  };
  const styleSelector: StyleSelector = {
    instanceSelector: ["body"],
    matchingBreakpoints: ["base", "small"],
    matchingStates: new Set(),
  };
  // bigger breakpoint on current style source should overide
  // when the next style source has the same property on smaller breakpoint
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "width" }).usedValue
  ).toEqual({ type: "unit", unit: "px", value: 20 });
});

test("states are more specific than breakpoints", () => {
  // @media base { body:hover { width: 10px } }
  // @media small { body { width: 20px } }
  const styles: StyleDecl[] = [
    {
      breakpointId: "base",
      styleSourceId: "bodyLocal",
      state: ":hover",
      property: "width",
      value: { type: "unit", value: 20, unit: "px" },
    },
    {
      breakpointId: "small",
      styleSourceId: "bodyLocal",
      property: "width",
      value: { type: "unit", value: 10, unit: "px" },
    },
  ];
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([["body", ["bodyLocal"]]]),
    styleByStyleSourceId: getStyleByStyleSourceId(styles),
    metas: new Map(),
    instanceTags: new Map(),
    instanceComponents: new Map(),
  };
  const styleSelector: StyleSelector = {
    instanceSelector: ["body"],
    matchingBreakpoints: ["base", "small"],
    matchingStates: new Set([":hover"]),
  };
  // values with states override values without states on bigger breakpoint
  expect(
    getComputedStyleDecl({ model, styleSelector, property: "width" }).usedValue
  ).toEqual({ type: "unit", unit: "px", value: 20 });
});

test("user styles are more specific than preset styles", () => {
  // @layer preset { body:hover { color: blue } }
  // body { color: red }
  const styles: StyleDecl[] = [
    {
      breakpointId: "base",
      styleSourceId: "bodyLocal",
      // without state
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ];
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([["body", ["bodyLocal"]]]),
    styleByStyleSourceId: getStyleByStyleSourceId(styles),
    instanceTags: new Map([["body", "body"]]),
    instanceComponents: new Map([["body", "Body"]]),
    metas: new Map([
      [
        "Body",
        {
          type: "container",
          icon: "",
          presetStyle: {
            body: [
              {
                // with state
                state: "hover",
                property: "color",
                value: { type: "keyword", value: "blue" },
              },
            ],
          },
        },
      ],
    ]),
  };
  expect(
    getComputedStyleDecl({
      model,
      styleSelector: {
        instanceSelector: ["body"],
        matchingBreakpoints: ["base"],
        matchingStates: new Set([":hover"]),
      },
      property: "color",
    }).usedValue
  ).toEqual({ type: "keyword", value: "red" });
});

test("preset styles are more specific than browser styles", () => {
  // @layer browser { body { display: block } }
  // @layer preset { body { display: flex } }
  const model: StyleObjectModel = {
    styleSourcesByInstanceId: new Map([["body", ["bodyLocal"]]]),
    styleByStyleSourceId: getStyleByStyleSourceId([]),
    instanceTags: new Map([["body", "body"]]),
    instanceComponents: new Map([["body", "Body"]]),
    metas: new Map([
      [
        "Body",
        {
          type: "container",
          icon: "",
          presetStyle: {
            body: [
              {
                property: "display",
                value: { type: "keyword", value: "flex" },
              },
            ],
          },
        },
      ],
    ]),
  };
  expect(
    getComputedStyleDecl({
      model,
      styleSelector: {
        instanceSelector: ["body"],
        matchingBreakpoints: ["base"],
        matchingStates: new Set(),
      },
      property: "display",
    }).usedValue
  ).toEqual({ type: "keyword", value: "flex" });
});
