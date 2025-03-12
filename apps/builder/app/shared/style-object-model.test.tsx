import type { JSX } from "react";
import { describe, expect, test } from "vitest";
import type { HtmlTags } from "html-tags";
import {
  type Breakpoint,
  type Styles,
  type StyleSourceSelections,
  type Instance,
  type StyleDecl,
  getStyleDeclKey,
} from "@webstudio-is/sdk";
import { $, renderData } from "@webstudio-is/template";
import { camelCaseProperty, parseCss } from "@webstudio-is/css-data";
import type { CssProperty, StyleValue } from "@webstudio-is/css-engine";
import {
  type StyleObjectModel,
  getComputedStyleDecl,
  getPresetStyleDeclKey,
} from "./style-object-model";

/**
 * Create model fixture with a few features
 *
 * presets
 * - each selector is a tag name
 *
 * css
 * - each selector is style source id
 * - media prelude is breakpoint id
 *
 * jsx
 * - ws:id - instance id
 * - ws:tag - instance tag
 * - class - the list of style source ids
 */
const createModel = ({
  presets,
  css,
  jsx,
  matchingBreakpoints,
  matchingStates,
}: {
  presets?: Record<string, string>;
  css: string;
  jsx: JSX.Element;
  matchingBreakpoints?: Breakpoint["id"][];
  matchingStates?: Set<string>;
}): StyleObjectModel => {
  const instanceTags = new Map<Instance["id"], HtmlTags>();
  const parsedStyles = parseCss(css);
  const styles: Styles = new Map();
  for (const { breakpoint, selector, state, property, value } of parsedStyles) {
    const styleDecl: StyleDecl = {
      styleSourceId: selector,
      breakpointId: breakpoint ?? "base",
      state,
      property: camelCaseProperty(property),
      value,
    };
    styles.set(getStyleDeclKey(styleDecl), styleDecl);
  }
  const { instances, props } = renderData(jsx);
  const styleSourceSelections: StyleSourceSelections = new Map();
  for (const prop of props.values()) {
    if (prop.name === "class" && prop.type === "string") {
      styleSourceSelections.set(prop.instanceId, {
        instanceId: prop.instanceId,
        values: prop.value.split(" "),
      });
    }
    if (prop.name === "ws:tag" && prop.type === "string") {
      instanceTags.set(prop.instanceId, prop.value as HtmlTags);
    }
  }
  const instanceComponents = new Map<string, string>();
  for (const instance of instances.values()) {
    instanceComponents.set(instance.id, instance.component);
  }
  const presetStyles = new Map<string, StyleValue>();
  for (const [componentName, css] of Object.entries(presets ?? {})) {
    const parsedStyles = parseCss(css);
    for (const styleDecl of parsedStyles) {
      const key = getPresetStyleDeclKey({
        component: componentName,
        tag: styleDecl.selector,
        state: styleDecl.state,
        property: styleDecl.property,
      });
      presetStyles.set(key, styleDecl.value);
    }
  }
  return {
    styles,
    styleSourceSelections,
    presetStyles,
    instanceTags,
    instanceComponents,
    matchingBreakpoints: matchingBreakpoints ?? ["base"],
    matchingStates: matchingStates ?? new Set(),
  };
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
  const instanceSelector = ["body"];
  // cascaded property
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "width" })
      .usedValue
  ).toEqual({ type: "unit", unit: "px", value: 10 });
  // initial for not inherited property
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "height" })
      .usedValue
  ).toEqual({ type: "keyword", value: "auto" });
  // initial for inherited property
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "color" })
      .usedValue
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
  const instanceSelector = ["body"];
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "width" })
      .usedValue
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
  const instanceSelector = ["level3", "level2", "level1"];
  // should inherit declared value
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "width" })
      .usedValue
  ).toEqual({ type: "unit", unit: "px", value: 10 });
  // should inherit initial value as height is not inherited
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "height" })
      .usedValue
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
  const instanceSelector = ["level2", "level1"];
  // when property is not inherited use initial value
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "width" })
      .usedValue
  ).toEqual({ type: "keyword", value: "auto" });
  // when property is inherited use inherited value
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "color" })
      .usedValue
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
  const instanceSelector = ["level3", "level2", "level1"];
  // inherited value
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "color" })
      .usedValue
  ).toEqual({ type: "keyword", value: "blue" });
  // not inherited value
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "width" })
      .usedValue
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
  const instanceSelector = ["level2", "level1"];
  expect(
    getComputedStyleDecl({
      model,
      instanceSelector,
      property: "border-top-color",
    }).usedValue
  ).toEqual({ type: "keyword", value: "blue" });
  expect(
    getComputedStyleDecl({
      model,
      instanceSelector,
      property: "background-color",
    }).usedValue
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
  const instanceSelector = ["level3", "level2", "level1"];
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "color" })
      .usedValue
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
  const instanceSelector = ["body"];
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "color" })
      .usedValue
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
  const instanceSelector = ["body"];
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "--my-property" })
      .cascadedValue
  ).toEqual({ type: "unparsed", value: "blue" });
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "color" })
      .usedValue
  ).toEqual({ type: "unparsed", value: "blue" });
});

test("compute single custom property without layers", () => {
  const model = createModel({
    css: `
      bodyLocal {
        --gradient: linear-gradient(#fff, #000), linear-gradient(#000, #fff);
        background-image: var(--gradient);
      }
    `,
    jsx: <$.Body ws:id="body" class="bodyLocal"></$.Body>,
  });
  expect(
    getComputedStyleDecl({
      model,
      instanceSelector: ["body"],
      property: "background-image",
    }).computedValue
  ).toEqual({
    type: "unparsed",
    value: "linear-gradient(#fff,#000),linear-gradient(#000,#fff)",
  });
});

test("support custom properties in layers", () => {
  const model = createModel({
    css: `
      bodyLocal {
        --gradient-1: linear-gradient(#fff, #000);
        --gradient-2: linear-gradient(#000, #fff);
        background-image: var(--gradient-1), var(--gradient-2);
      }
    `,
    jsx: <$.Body ws:id="body" class="bodyLocal"></$.Body>,
  });
  expect(
    getComputedStyleDecl({
      model,
      instanceSelector: ["body"],
      property: "background-image",
    }).computedValue
  ).toEqual({
    type: "layers",
    value: [
      { type: "unparsed", value: "linear-gradient(#fff,#000)" },
      { type: "unparsed", value: "linear-gradient(#000,#fff)" },
    ],
  });
});

test("parse single custom property without tuples", () => {
  const model = createModel({
    css: `
      bodyLocal {
        --noise: contrast(300%) brightness(100%);
        filter: var(--noise);
      }
    `,
    jsx: <$.Body ws:id="body" class="bodyLocal"></$.Body>,
  });
  expect(
    getComputedStyleDecl({
      model,
      instanceSelector: ["body"],
      property: "filter",
    }).computedValue
  ).toEqual({ type: "unparsed", value: "contrast(300%) brightness(100%)" });
});

test("support custom properties in tuples", () => {
  const model = createModel({
    css: `
      bodyLocal {
        --noise-1: contrast(300%);
        --noise-2: brightness(100%);
        filter: var(--noise-1) var(--noise-2);
      }
    `,
    jsx: <$.Body ws:id="body" class="bodyLocal"></$.Body>,
  });
  expect(
    getComputedStyleDecl({
      model,
      instanceSelector: ["body"],
      property: "filter",
    }).computedValue
  ).toEqual({
    type: "tuple",
    value: [
      { type: "unparsed", value: "contrast(300%)" },
      { type: "unparsed", value: "brightness(100%)" },
    ],
  });
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
  const instanceSelector = ["body"];
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "color" })
      .usedValue
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
  const instanceSelector = ["body"];
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "color" })
      .usedValue
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
  const instanceSelector = ["box", "body"];
  // inherited property use inherited value
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "color" })
      .usedValue
  ).toEqual({ type: "keyword", value: "red" });
  // not inherited property use initial value
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "width" })
      .usedValue
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
  const instanceSelector = ["level3", "level2", "level1"];
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "--my-property" })
      .usedValue
  ).toEqual({ type: "unparsed", value: "blue" });
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "color" })
      .usedValue
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
  const instanceSelector = ["box", "body"];
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "color" })
      .usedValue
  ).toEqual({ type: "keyword", value: "black" });
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "--color" })
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
  const instanceSelector = ["box", "body"];
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "color" })
      .usedValue
  ).toEqual({ type: "unparsed", value: "red" });
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "--color" })
      .usedValue
  ).toEqual({ type: "unparsed", value: "red" });
});

test("allow multiple usages of the same custom property", () => {
  const model = createModel({
    css: `
      bodyLocal {
        --gradient: linear-gradient(#fff, #000);
      }
      boxLocal {
        background-image: var(--gradient), var(--gradient);
      }
    `,
    jsx: (
      <$.Body ws:id="body" class="bodyLocal">
        <$.Box ws:id="box" class="boxLocal"></$.Box>
      </$.Body>
    ),
  });
  expect(
    getComputedStyleDecl({
      model,
      instanceSelector: ["box", "body"],
      property: "background-image",
    }).usedValue
  ).toEqual({
    type: "layers",
    value: [
      { type: "unparsed", value: "linear-gradient(#fff,#000)" },
      { type: "unparsed", value: "linear-gradient(#fff,#000)" },
    ],
  });
});

test("cascade value from matching breakpoints", () => {
  const model = createModel({
    css: `
      @media small {
        bodyLocal {
          width: 20px;
        }
      }
      @media large {
        bodyLocal {
          width: 30px;
        }
      }
      bodyLocal {
        width: 10px;
      }
    `,
    jsx: <$.Body ws:id="body" class="bodyLocal"></$.Body>,
    matchingBreakpoints: ["base", "small", "large"],
  });
  const instanceSelector = ["body"];
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "width" })
      .usedValue
  ).toEqual({ type: "unit", unit: "px", value: 30 });
});

test("ignore values from not matching breakpoints", () => {
  const model = createModel({
    css: `
      bodyLocal {
        width: 10px;
      }
      @media small {
        bodyLocal {
          width: 20px;
        }
      }
      @media large {
        bodyLocal {
          width: 30px;
        }
      }
    `,
    jsx: <$.Body ws:id="body" class="bodyLocal"></$.Body>,
    // large is not matching breakpoint
    matchingBreakpoints: ["base", "small"],
  });
  const instanceSelector = ["body"];
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "width" })
      .usedValue
  ).toEqual({ type: "unit", unit: "px", value: 20 });
});

test("cascade value from matching style sources", () => {
  const model = createModel({
    css: `
      bodyLocal {
        width: 20px;
      }
      bodyToken {
        width: 10px;
      }
    `,
    jsx: <$.Body ws:id="body" class="bodyToken bodyLocal"></$.Body>,
  });
  const instanceSelector = ["body"];
  // the latest token value wins
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "width" })
      .usedValue
  ).toEqual({ type: "unit", unit: "px", value: 20 });
});

test("cascade values with matching states", () => {
  const model = createModel({
    css: `
      bodyLocal:hover {
        width: 20px;
      }
    `,
    jsx: <$.Body ws:id="body" class="bodyLocal"></$.Body>,
    matchingStates: new Set([":hover"]),
  });
  const instanceSelector = ["body"];
  // value with state wins
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "width" })
      .usedValue
  ).toEqual({ type: "unit", unit: "px", value: 20 });
});

test("prefer stateless values over matching states", () => {
  const model = createModel({
    css: `
      bodyLocal {
        width: 10px;
      }
      bodyLocal:hover {
        width: 20px;
      }
    `,
    jsx: <$.Body ws:id="body" class="bodyLocal"></$.Body>,
    matchingStates: new Set([":hover"]),
  });
  const instanceSelector = ["body"];
  // value with state wins
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "width" })
      .usedValue
  ).toEqual({ type: "unit", unit: "px", value: 10 });
});

test("ignore values from not matching states", () => {
  const model = createModel({
    css: `
      bodyLocal:hover {
        width: 20px;
      }
      bodyLocal:focus {
        width: 30px;
      }
    `,
    jsx: <$.Body ws:id="body" class="bodyLocal"></$.Body>,
    matchingStates: new Set([":hover"]),
  });
  const instanceSelector = ["body"];
  // ignore :focus state because it is not matching
  expect(
    getComputedStyleDecl({ model, instanceSelector, property: "width" })
      .usedValue
  ).toEqual({ type: "unit", unit: "px", value: 20 });
});

test("support html styles", () => {
  // @layer browser { body { display: block } }
  const model = createModel({
    css: "",
    jsx: (
      <$.Body ws:id="bodyId" ws:tag="body">
        <$.Span ws:id="spanId" ws:tag="span"></$.Span>
        <$.Heading ws:id="headingId" ws:tag="h1"></$.Heading>
      </$.Body>
    ),
  });
  // tag with browser styles
  expect(
    getComputedStyleDecl({
      model,
      instanceSelector: ["bodyId"],
      property: "display",
    }).usedValue
  ).toEqual({ type: "keyword", value: "block" });
  expect(
    getComputedStyleDecl({
      model,
      instanceSelector: ["headingId", "bodyId"],
      property: "margin-top",
    }).usedValue
  ).toEqual({ type: "unit", value: 0.67, unit: "em" });
  // tag without browser styles
  expect(
    getComputedStyleDecl({
      model,
      instanceSelector: ["spanId"],
      property: "display",
    }).usedValue
  ).toEqual({ type: "keyword", value: "inline" });
});

test("support preset styles", () => {
  // @layer preset { body:hover { width: 100px } }
  const model = createModel({
    presets: {
      Body: `
        body {
          width: 100px;
        }
      `,
    },
    css: ``,
    jsx: <$.Body ws:id="body" ws:tag="body"></$.Body>,
  });
  expect(
    getComputedStyleDecl({
      model,
      instanceSelector: ["body"],
      property: "width",
    }).usedValue
  ).toEqual({ type: "unit", value: 100, unit: "px" });
});

test("ignore values from not matching states in preset styles", () => {
  // @layer preset {
  //   body { color: red }
  //   body:focus { color: blue }
  // }
  const model = createModel({
    presets: {
      Body: `
        body {
          color: red;
        }
        body:focus {
          color: blue;
        }
      `,
    },
    css: ``,
    jsx: <$.Body ws:id="body" ws:tag="body"></$.Body>,
  });
  expect(
    getComputedStyleDecl({
      model,
      instanceSelector: ["body"],
      property: "color",
    }).usedValue
  ).toEqual({ type: "keyword", value: "red" });
});

test("breakpoints are more specific than style sources", () => {
  const model = createModel({
    css: `
      @media small {
        bodyToken {
          width: 20px;
        }
      }
      bodyLocal {
        width: 10px;
      }
    `,
    jsx: <$.Body ws:id="body" class="bodyToken bodyLocal"></$.Body>,
    matchingBreakpoints: ["base", "small"],
  });
  // bigger breakpoint on current style source should overide
  // when the next style source has the same property on smaller breakpoint
  expect(
    getComputedStyleDecl({
      model,
      instanceSelector: ["body"],
      property: "width",
    }).usedValue
  ).toEqual({ type: "unit", unit: "px", value: 20 });
});

test("breakpoints are more specific than matching states", () => {
  const model = createModel({
    css: `
      @media small {
        bodyLocal {
          width: 10px;
        }
      }
      bodyLocal:hover {
        width: 20px;
      }
    `,
    jsx: <$.Body ws:id="body" class="bodyLocal"></$.Body>,
    matchingBreakpoints: ["base", "small"],
    matchingStates: new Set([":hover"]),
  });
  // values with states override values without states on bigger breakpoint
  expect(
    getComputedStyleDecl({
      model,
      instanceSelector: ["body"],
      property: "width",
    }).usedValue
  ).toEqual({ type: "unit", unit: "px", value: 10 });
});

test("user styles are more specific than preset styles", () => {
  // @layer preset { body:hover { color: blue } }
  const model = createModel({
    presets: {
      Body: `
        /* with state */
        body:hover {
          color: blue;
        }
      `,
    },
    css: `
      /* without state */
      bodyLocal {
        color: red;
      }
    `,
    jsx: <$.Body ws:id="body" class="bodyLocal"></$.Body>,
    matchingStates: new Set([":hover"]),
  });
  expect(
    getComputedStyleDecl({
      model,
      instanceSelector: ["body"],
      property: "color",
    }).usedValue
  ).toEqual({ type: "keyword", value: "red" });
});

test("preset styles are more specific than browser styles", () => {
  // @layer browser { body { display: block } }
  // @layer preset { body { display: flex } }
  const model = createModel({
    presets: {
      Body: `
        body {
          display: flex;
        }
      `,
    },
    css: ``,
    jsx: <$.Body ws:id="body" ws:tag="body"></$.Body>,
  });
  expect(
    getComputedStyleDecl({
      model,
      instanceSelector: ["body"],
      property: "display",
    }).usedValue
  ).toEqual({ type: "keyword", value: "flex" });
});

test("access cascaded value without resolving", () => {
  const model = createModel({
    css: `
      local {
        color: initial;
      }
    `,
    jsx: <$.Body ws:id="body" class="local"></$.Body>,
  });
  expect(
    getComputedStyleDecl({
      model,
      instanceSelector: ["body"],
      property: "color",
    }).cascadedValue
  ).toEqual({ type: "keyword", value: "initial" });
});

test("fallback cascaded value to inherited computed value", () => {
  const model = createModel({
    css: `
      body {
        border-top-color: currentcolor;
      }
    `,
    jsx: (
      <$.Body ws:id="body" class="body">
        <$.Box ws:id="box" class="box"></$.Box>
      </$.Body>
    ),
  });
  expect(
    getComputedStyleDecl({
      model,
      instanceSelector: ["box", "body"],
      property: "border-top-color",
    }).cascadedValue
  ).toEqual({ type: "keyword", value: "currentColor" });
});

test("work with unknown or invalid properties", () => {
  const model = createModel({
    css: `
      bodyLocal {
        unknown-property: [object Object];
      }
    `,
    jsx: <$.Body ws:id="body" class="bodyLocal"></$.Body>,
  });
  const instanceSelector = ["body"];
  expect(
    getComputedStyleDecl({
      model,
      instanceSelector,
      property: "unknownProperty" as CssProperty,
    }).usedValue
  ).toEqual({ type: "unparsed", value: "[object Object]" });
  expect(
    getComputedStyleDecl({
      model,
      instanceSelector,
      property: "undefinedProperty" as CssProperty,
    }).usedValue
  ).toEqual({ type: "invalid", value: "" });
});

describe("selected style", () => {
  test("access selected style source value within cascade", () => {
    const model = createModel({
      css: `
        token {
          color: red;
        }
        local {
          color: blue;
        }
      `,
      jsx: <$.Body ws:id="body" class="token local"></$.Body>,
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        styleSourceId: "token",
        property: "color",
      }).usedValue
    ).toEqual({ type: "keyword", value: "red" });
  });

  test("fallback to previous style source", () => {
    const model = createModel({
      css: `
        token {
          color: red;
        }
      `,
      jsx: <$.Body ws:id="body" class="token local"></$.Body>,
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        styleSourceId: "local",
        property: "color",
      }).usedValue
    ).toEqual({ type: "keyword", value: "red" });
  });

  test("fallback to final style source", () => {
    const model = createModel({
      css: `
        first {
          color: red;
        }
        local {
          color: blue;
        }
      `,
      jsx: <$.Body ws:id="body" class="first second local"></$.Body>,
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        styleSourceId: "second",
        property: "color",
      }).usedValue
    ).toEqual({ type: "keyword", value: "blue" });
  });

  test("access selected state value", () => {
    const model = createModel({
      css: `
        local {
          color: red;
        }
        local:hover {
          color: green;
        }
      `,
      jsx: <$.Body ws:id="body" class="local"></$.Body>,
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        property: "color",
      }).usedValue
    ).toEqual({ type: "keyword", value: "red" });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        state: ":hover",
        property: "color",
      }).usedValue
    ).toEqual({ type: "keyword", value: "green" });
  });

  test("fallback to stateless value", () => {
    const model = createModel({
      css: `
        local {
          color: red;
        }
      `,
      jsx: <$.Body ws:id="body" class="local"></$.Body>,
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        state: ":hover",
        property: "color",
      }).usedValue
    ).toEqual({ type: "keyword", value: "red" });
  });

  test("prefer stateless when states are matched but not selected", () => {
    const model = createModel({
      css: `
        local {
          color: red;
        }
        local:hover {
          color: blue;
        }
      `,
      jsx: <$.Body ws:id="body" class="local"></$.Body>,
      matchingStates: new Set([":hover"]),
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        property: "color",
      }).usedValue
    ).toEqual({ type: "keyword", value: "red" });
  });

  test("prefer selected state over matched one", () => {
    const model = createModel({
      css: `
        local:hover {
          color: green;
        }
        local:focus {
          color: blue;
        }
      `,
      jsx: <$.Body ws:id="body" class="local"></$.Body>,
      matchingStates: new Set([":hover", ":focus"]),
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        state: ":hover",
        property: "color",
      }).usedValue
    ).toEqual({ type: "keyword", value: "green" });
  });

  test("prefer selected state over breakpoint", () => {
    const model = createModel({
      css: `
        local:hover {
          color: red;
        }
        @media small {
          local {
            color: blue;
          }
        }
      `,
      jsx: <$.Body ws:id="body" class="local"></$.Body>,
      matchingBreakpoints: ["base", "small"],
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        state: ":hover",
        property: "color",
      }).usedValue
    ).toEqual({ type: "keyword", value: "red" });
  });

  test("prefer selected state from preset", () => {
    const model = createModel({
      presets: {
        Body: `
          body {
            color: red;
          }
          body:hover {
            color: blue;
          }
        `,
      },
      css: "",
      jsx: <$.Body ws:id="body" ws:tag="body" class="local"></$.Body>,
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        property: "color",
      }).usedValue
    ).toEqual({ type: "keyword", value: "red" });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        state: ":hover",
        property: "color",
      }).usedValue
    ).toEqual({ type: "keyword", value: "blue" });
  });
});

describe("style value source", () => {
  test("default", () => {
    const model = createModel({
      css: "",
      jsx: <$.Body ws:id="body" ws:tag="body" class="local"></$.Body>,
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        property: "color",
      }).source
    ).toEqual({ name: "default" });
  });

  test("preset", () => {
    const model = createModel({
      presets: {
        Body: `
          body {
            color: red;
          }
        `,
      },
      css: "",
      jsx: <$.Body ws:id="body" ws:tag="body" class="local"></$.Body>,
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        property: "color",
      }).source
    ).toEqual({ name: "preset", instanceId: "body" });
  });

  test("remote style source", () => {
    const model = createModel({
      // presets should be ignored
      presets: {
        Body: `
          body {
            color: yellow;
          }
        `,
      },
      css: `
        second {
          color: red;
        }
      `,
      jsx: (
        <$.Body ws:id="body" ws:tag="body" class="first second third"></$.Body>
      ),
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        styleSourceId: "first",
        property: "color",
      }).source
    ).toEqual({
      name: "remote",
      instanceId: "body",
      breakpointId: "base",
      styleSourceId: "second",
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        styleSourceId: "second",
        property: "color",
      }).source
    ).toEqual({
      name: "local",
      instanceId: "body",
      breakpointId: "base",
      styleSourceId: "second",
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        styleSourceId: "third",
        property: "color",
      }).source
    ).toEqual({
      name: "remote",
      instanceId: "body",
      breakpointId: "base",
      styleSourceId: "second",
    });
  });

  test("overwritten style source", () => {
    const model = createModel({
      // presets should be ignored
      presets: {
        Body: `
          body {
            color: yellow;
          }
        `,
      },
      css: `
        first {
          color: red;
        }
        second {
          color: green;
        }
        third {
          color: blue;
        }
      `,
      jsx: (
        <$.Body ws:id="body" ws:tag="body" class="first second third"></$.Body>
      ),
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        styleSourceId: "first",
        property: "color",
      }).source
    ).toEqual({
      name: "overwritten",
      instanceId: "body",
      breakpointId: "base",
      styleSourceId: "third",
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        styleSourceId: "second",
        property: "color",
      }).source
    ).toEqual({
      name: "overwritten",
      instanceId: "body",
      breakpointId: "base",
      styleSourceId: "third",
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        styleSourceId: "third",
        property: "color",
      }).source
    ).toEqual({
      name: "local",
      instanceId: "body",
      breakpointId: "base",
      styleSourceId: "third",
    });
  });

  test("remote matching state", () => {
    const model = createModel({
      css: `
        local:hover {
          color: red;
        }
      `,
      jsx: <$.Body ws:id="body" ws:tag="body" class="local"></$.Body>,
      matchingStates: new Set([":hover"]),
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        property: "color",
      }).source
    ).toEqual({
      name: "remote",
      instanceId: "body",
      breakpointId: "base",
      styleSourceId: "local",
      state: ":hover",
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        state: ":hover",
        property: "color",
      }).source
    ).toEqual({
      name: "local",
      instanceId: "body",
      breakpointId: "base",
      styleSourceId: "local",
      state: ":hover",
    });
  });

  test("overwritten stateless", () => {
    const model = createModel({
      css: `
        local {
          color: red;
        }
        local:hover {
          color: blue;
        }
      `,
      jsx: <$.Body ws:id="body" ws:tag="body" class="local"></$.Body>,
      matchingStates: new Set([":hover"]),
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        property: "color",
      }).source
    ).toEqual({
      name: "overwritten",
      instanceId: "body",
      breakpointId: "base",
      styleSourceId: "local",
      state: ":hover",
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        state: ":hover",
        property: "color",
      }).source
    ).toEqual({
      name: "local",
      instanceId: "body",
      breakpointId: "base",
      styleSourceId: "local",
      state: ":hover",
    });
  });

  test("remote breakpoint", () => {
    const model = createModel({
      css: `
        local {
          color: red;
        }
        @media small {
          local {
            border-top-color: blue;
          }
        }
      `,
      jsx: <$.Body ws:id="body" ws:tag="body" class="local"></$.Body>,
      matchingBreakpoints: ["base", "small"],
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        property: "color",
      }).source
    ).toEqual({
      name: "remote",
      instanceId: "body",
      breakpointId: "base",
      styleSourceId: "local",
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["body"],
        property: "border-top-color",
      }).source
    ).toEqual({
      name: "local",
      instanceId: "body",
      breakpointId: "small",
      styleSourceId: "local",
    });
  });

  test("remote inherited", () => {
    const model = createModel({
      css: `
        bodyLocal {
          color: red;
        }
        boxLocal {
          color: blue;
          width: 100%;
        }
      `,
      jsx: (
        <$.Body ws:id="body" ws:tag="body" class="bodyLocal">
          <$.Box ws:id="outer" ws:tag="div" class="outerLocal">
            <$.Box ws:id="box" ws:tag="div" class="boxLocal">
              <$.Box ws:id="inner" ws:tag="div" class="innerLocal"></$.Box>
            </$.Box>
          </$.Box>
        </$.Body>
      ),
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["inner", "box", "outer", "body"],
        property: "color",
      }).source
    ).toEqual({
      name: "remote",
      instanceId: "box",
      breakpointId: "base",
      styleSourceId: "boxLocal",
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["inner", "box", "outer", "body"],
        property: "width",
      }).source
    ).toEqual({ name: "default" });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["box", "outer", "body"],
        property: "color",
      }).source
    ).toEqual({
      name: "local",
      instanceId: "box",
      breakpointId: "base",
      styleSourceId: "boxLocal",
    });
  });

  test("local with inherit keyword", () => {
    const model = createModel({
      css: `
        bodyLocal {
          color: red;
        }
        boxLocal {
          color: inherit;
        }
      `,
      jsx: (
        <$.Body ws:id="body" ws:tag="body" class="bodyLocal">
          <$.Box ws:id="box" ws:tag="div" class="boxLocal"></$.Box>
        </$.Body>
      ),
    });
    expect(
      getComputedStyleDecl({
        model,
        instanceSelector: ["box", "body"],
        property: "color",
      }).source
    ).toEqual({
      name: "local",
      instanceId: "box",
      breakpointId: "base",
      styleSourceId: "boxLocal",
    });
  });
});
