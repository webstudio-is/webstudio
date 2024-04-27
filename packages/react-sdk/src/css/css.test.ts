import { expect, test } from "@jest/globals";
import type { Breakpoint } from "@webstudio-is/sdk";
import { generateCss, type CssConfig } from "./css";

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
