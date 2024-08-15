import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { StyleValue } from "@webstudio-is/css-engine";
import { parseCss } from "../src/parse-css";

const css = readFileSync("./src/html.css", "utf8");
const parsed = parseCss(css);
const result: Record<
  string,
  Array<{ property: string; value: StyleValue }>
> = {};
for (const styleDecl of parsed) {
  result[styleDecl.selector] ??= [];
  result[styleDecl.selector].push({
    property: styleDecl.property,
    value: styleDecl.value,
  });
}

mkdirSync("./src/__generated__", { recursive: true });
writeFileSync(
  "./src/__generated__/html.ts",
  `export const html = ${JSON.stringify(result)}`
);
