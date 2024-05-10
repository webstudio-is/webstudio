import { expect, test } from "@jest/globals";
import type { Breakpoint } from "@webstudio-is/sdk";
import { generateCss, type CssConfig } from "./css";
import { descendantComponent } from "../core-components";

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map((item) => [item.id, item] as const));

const generateAllCss = (config: Omit<CssConfig, "atomic">) => {
  const { cssText } = generateCss({
    ...config,
    atomic: false,
  });
  const { cssText: atomicCssText, classesMap } = generateCss({
    ...config,
    atomic: true,
  });
  return { cssText, atomicCssText, classesMap };
};

test("generate css for one instance with two tokens", () => {
  const { cssText, atomicCssText, classesMap } = generateAllCss({
    assets: new Map(),
    instances: new Map(),
    props: new Map(),
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
"html {margin: 0; display: grid; min-height: 100%}
@media all {
  [data-ws-id="box"] {
    color: red
  }
}"
`);
  expect(atomicCssText).toMatchInlineSnapshot(`
"html {margin: 0; display: grid; min-height: 100%}
@media all {
  .cawkhls {
    color: red
  }
}"
`);
  expect(classesMap).toMatchInlineSnapshot(`
Map {
  "box" => [
    "cawkhls",
  ],
}
`);
});

test("generate descendant selector", () => {
  const { cssText, atomicCssText, classesMap } = generateAllCss({
    assets: new Map(),
    instances: toMap([
      {
        id: "root",
        type: "instance",
        component: "Body",
        children: [{ type: "id", value: "descendant" }],
      },
      {
        id: "descendant",
        type: "instance",
        component: descendantComponent,
        children: [],
      },
    ]),
    props: toMap([
      {
        id: "1",
        instanceId: "descendant",
        name: "selector",
        type: "string",
        value: " a",
      },
    ]),
    breakpoints: toMap<Breakpoint>([{ id: "base", label: "" }]),
    styleSourceSelections: new Map([
      ["root", { instanceId: "root", values: ["local"] }],
      ["descendant", { instanceId: "descendant", values: ["local"] }],
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
        "local:base:color::hover",
        {
          styleSourceId: "local",
          breakpointId: "base",
          state: ":hover",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
      ],
    ]),
    componentMetas: new Map(),
    assetBaseUrl: "",
  });
  expect(cssText).toMatchInlineSnapshot(`
"html {margin: 0; display: grid; min-height: 100%}
@media all {
  [data-ws-id="root"] {
    color: blue
  }
  [data-ws-id="root"]:hover {
    color: red
  }
  [data-ws-id="root"] a {
    color: blue
  }
  [data-ws-id="root"] a:hover {
    color: red
  }
}"
`);
  expect(atomicCssText).toMatchInlineSnapshot(`
"html {margin: 0; display: grid; min-height: 100%}
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
  expect(classesMap).toMatchInlineSnapshot(`
Map {
  "root" => [
    "c17hlgoh",
    "c92zrdl",
    "chhpmat",
    "c32fhpn",
  ],
}
`);
});
