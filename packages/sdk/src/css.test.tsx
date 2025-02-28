import { expect, test } from "vitest";
import { $, ws, css, renderData } from "@webstudio-is/template";
import { generateCss, type CssConfig } from "./css";
import type { Breakpoint } from "./schema/breakpoints";
import { rootComponent } from "./core-metas";

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map((item) => [item.id, item] as const));

const generateAllCss = (config: Omit<CssConfig, "atomic">) => {
  const { cssText, classes } = generateCss({
    ...config,
    atomic: false,
  });
  const { cssText: atomicCssText, classes: atomicClasses } = generateCss({
    ...config,
    atomic: true,
  });
  return { cssText, atomicCssText, classes, atomicClasses };
};

test("generate css for one instance with two tokens", () => {
  const { cssText, atomicCssText, atomicClasses } = generateAllCss({
    ...renderData(<$.Box ws:id="box"></$.Box>),
    breakpoints: toMap<Breakpoint>([{ id: "base", label: "" }]),
    styleSourceSelections: new Map([
      ["box", { instanceId: "box", values: ["token", "local"] }],
    ]),
    styles: new Map([
      [
        "token:base:color",
        {
          styleSourceId: "local",
          breakpointId: "base",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
      ],

      [
        "local:base:color",
        {
          styleSourceId: "token",
          breakpointId: "base",
          property: "color",
          value: { type: "keyword", value: "blue" },
        },
      ],
    ]),
    componentMetas: new Map(),
    assetBaseUrl: "",
  });
  expect(cssText).toMatchInlineSnapshot(`
"
@media all {
  .w-box {
    color: red
  }
}"
`);
  expect(atomicCssText).toMatchInlineSnapshot(`
"
@media all {
  .cawkhls {
    color: red
  }
}"
`);
  expect(atomicClasses).toMatchInlineSnapshot(`
Map {
  "box" => [
    "cawkhls",
  ],
}
`);
});

test("generate descendant selector", () => {
  const { cssText, atomicCssText, atomicClasses } = generateAllCss({
    ...renderData(
      <$.Body
        ws:id="body"
        ws:style={css`
          color: blue;
          &:hover {
            color: red;
          }
        `}
      >
        <ws.descendant
          ws:id="descendant"
          selector=" a"
          ws:style={css`
            color: blue;
            &:hover {
              color: red;
            }
          `}
        />
      </$.Body>
    ),
    componentMetas: new Map(),
    assetBaseUrl: "",
  });
  expect(cssText).toMatchInlineSnapshot(`
"
@media all {
  .w-body {
    color: blue
  }
  .w-body:hover {
    color: red
  }
  .w-body a {
    color: blue
  }
  .w-body a:hover {
    color: red
  }
}"
`);
  expect(atomicCssText).toMatchInlineSnapshot(`
"
@media all {
  .c17hlgoh {
    color: blue
  }
  .c92zrdl:hover {
    color: red
  }
  .chhpmat a {
    color: blue
  }
  .c32fhpn a:hover {
    color: red
  }
}"
`);
  expect(atomicClasses).toMatchInlineSnapshot(`
Map {
  "body" => [
    "c17hlgoh",
    "c92zrdl",
    "chhpmat",
    "c32fhpn",
  ],
}
`);
});

test("generate component presets with multiple tags", () => {
  const { cssText, atomicCssText, classes, atomicClasses } = generateAllCss({
    assets: new Map(),
    instances: new Map(),
    props: new Map(),
    breakpoints: new Map(),
    styleSourceSelections: new Map([]),
    styles: new Map(),
    componentMetas: new Map([
      [
        "ListItem",
        {
          type: "container",
          icon: "",
          presetStyle: {
            div: [
              {
                property: "display",
                value: { type: "keyword", value: "block" },
              },
            ],
            a: [
              {
                property: "user-select",
                value: { type: "keyword", value: "none" },
              },
            ],
          },
        },
      ],
    ]),
    assetBaseUrl: "",
  });
  expect(cssText).toMatchInlineSnapshot(`
"@layer presets {
  div.w-list-item {
    display: block
  }
  a.w-list-item {
    -webkit-user-select: none;
    user-select: none
  }
}
"
`);
  expect(cssText).toEqual(atomicCssText);
  expect(classes).toMatchInlineSnapshot(`Map {}`);
  expect(classes).toEqual(atomicClasses);
});

test("deduplicate component presets for similarly named components", () => {
  const { cssText, atomicCssText, classes, atomicClasses } = generateAllCss({
    assets: new Map(),
    instances: new Map(),
    props: new Map(),
    breakpoints: new Map(),
    styleSourceSelections: new Map([]),
    styles: new Map(),
    componentMetas: new Map([
      [
        "ListItem",
        {
          type: "container",
          icon: "",
          presetStyle: {
            div: [
              {
                property: "display",
                value: { type: "keyword", value: "block" },
              },
            ],
          },
        },
      ],
      [
        "@webstudio/radix:ListItem",
        {
          type: "container",
          icon: "",
          presetStyle: {
            div: [
              {
                property: "display",
                value: { type: "keyword", value: "flex" },
              },
            ],
          },
        },
      ],
      [
        "@webstudio/aria:ListItem",
        {
          type: "container",
          icon: "",
          presetStyle: {
            div: [
              {
                property: "display",
                value: { type: "keyword", value: "grid" },
              },
            ],
          },
        },
      ],
    ]),
    assetBaseUrl: "",
  });
  expect(cssText).toMatchInlineSnapshot(`
"@layer presets {
  div.w-list-item {
    display: block
  }
  div.w-list-item-1 {
    display: flex
  }
  div.w-list-item-2 {
    display: grid
  }
}
"
`);
  expect(cssText).toEqual(atomicCssText);
  expect(classes).toMatchInlineSnapshot(`Map {}`);
  expect(classes).toEqual(atomicClasses);
});

test("expose preset classes to instances", () => {
  const { atomicCssText, classes, atomicClasses } = generateAllCss({
    ...renderData(
      <$.Body
        ws:id="body"
        ws:style={css`
          color: blue;
        `}
      >
        <$.Box
          ws:id="box"
          ws:style={css`
            color: red;
          `}
        ></$.Box>
      </$.Body>
    ),
    componentMetas: new Map([
      [
        "Body",
        {
          type: "container",
          icon: "",
          presetStyle: {
            div: [
              {
                property: "display",
                value: { type: "keyword", value: "block" },
              },
            ],
          },
        },
      ],
      [
        "Box",
        {
          type: "container",
          icon: "",
          presetStyle: {
            div: [
              {
                property: "display",
                value: { type: "keyword", value: "flex" },
              },
            ],
          },
        },
      ],
    ]),
    assetBaseUrl: "",
  });
  expect(atomicCssText).toMatchInlineSnapshot(`
"@layer presets {
  div.w-body {
    display: block
  }
  div.w-box {
    display: flex
  }
}
@media all {
  .c17hlgoh {
    color: blue
  }
  .cawkhls {
    color: red
  }
}"
`);
  expect(classes).toMatchInlineSnapshot(`
Map {
  "body" => [
    "w-body",
    "w-body-1",
  ],
  "box" => [
    "w-box",
    "w-box-1",
  ],
}
`);
  expect(atomicClasses).toMatchInlineSnapshot(`
Map {
  "body" => [
    "w-body",
    "c17hlgoh",
  ],
  "box" => [
    "w-box",
    "cawkhls",
  ],
}
`);
});

test("generate classes with instance and meta label", () => {
  const { cssText, classes } = generateAllCss({
    ...renderData(
      <$.Body
        ws:id="body"
        ws:style={css`
          color: blue;
        `}
      >
        <$.Box
          ws:id="box"
          ws:label="box%instance#label"
          ws:style={css`
            color: red;
          `}
        ></$.Box>
      </$.Body>
    ),
    componentMetas: new Map([
      [
        "Body",
        {
          type: "container",
          icon: "",
          label: "body meta label",
          presetStyle: {
            div: [
              {
                property: "display",
                value: { type: "keyword", value: "block" },
              },
            ],
          },
        },
      ],
      [
        "Box",
        {
          type: "container",
          icon: "",
          label: "box meta label",
          presetStyle: {
            div: [
              {
                property: "display",
                value: { type: "keyword", value: "flex" },
              },
            ],
          },
        },
      ],
    ]),
    assetBaseUrl: "",
  });
  expect(cssText).toMatchInlineSnapshot(`
"@layer presets {
  div.w-body-meta-label {
    display: block
  }
  div.w-box-meta-label {
    display: flex
  }
}
@media all {
  .w-body-meta-label-1 {
    color: blue
  }
  .w-box-instance-label {
    color: red
  }
}"
`);
  expect(classes).toMatchInlineSnapshot(`
Map {
  "body" => [
    "w-body-meta-label",
    "w-body-meta-label-1",
  ],
  "box" => [
    "w-box-meta-label",
    "w-box-instance-label",
  ],
}
`);
});

test("generate :root preset and user styles", () => {
  const { cssText, atomicCssText, classes, atomicClasses } = generateAllCss({
    ...renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="box"></$.Box>
      </$.Body>
    ),
    breakpoints: toMap([{ id: "base", label: "" }]),
    styleSourceSelections: new Map([
      [":root", { instanceId: ":root", values: ["local"] }],
    ]),
    styles: new Map([
      [
        "local:base:color",
        {
          styleSourceId: "local",
          breakpointId: "base",
          property: "color",
          value: { type: "keyword", value: "blue" },
        },
      ],
      [
        "local:base:fontSize",
        {
          styleSourceId: "local",
          breakpointId: "base",
          property: "fontSize",
          value: { type: "keyword", value: "medium" },
        },
      ],
    ]),
    componentMetas: new Map([
      [
        rootComponent,
        {
          type: "container",
          icon: "",
          label: "Global Root",
          presetStyle: {
            html: [
              {
                property: "display",
                value: { type: "keyword", value: "grid" },
              },
            ],
          },
        },
      ],
    ]),
    assetBaseUrl: "",
  });
  expect(cssText).toMatchInlineSnapshot(`
"@layer presets {
  :root {
    display: grid
  }
}
@media all {
  :root {
    color: blue;
    font-size: medium
  }
}"
`);
  expect(classes).toEqual(new Map());
  expect(atomicCssText).toMatchInlineSnapshot(`
"@layer presets {
  :root {
    display: grid
  }
}
@media all {
  :root {
    color: blue;
    font-size: medium
  }
}"
`);
  expect(atomicClasses).toEqual(new Map());
});
