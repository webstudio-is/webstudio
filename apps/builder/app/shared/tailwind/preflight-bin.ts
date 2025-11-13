import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseCss } from "@webstudio-is/css-data";
import type { CssProperty, StyleValue } from "@webstudio-is/css-engine";
import { tags } from "@webstudio-is/sdk";

const cssFile = new URL("./preflight.css", import.meta.url);
const css = await readFile(cssFile, "utf8");
const parsed = parseCss(css);
const result: Record<string, { property: CssProperty; value: StyleValue }[]> =
  {};
for (const { selector, breakpoint, ...styleDecl } of parsed) {
  if (tags.includes(selector) && styleDecl.state === undefined) {
    result[selector] ??= [];
    result[selector].push(styleDecl);
  }
}
let code = "";
code += `import type { CssProperty, StyleValue } from "@webstudio-is/css-engine";\n\n`;
const type =
  "Record<string, undefined | { property: CssProperty, value: StyleValue }[]>";
code += `export const preflight: ${type} = ${JSON.stringify(result)}`;

const generatedFile = new URL("./__generated__/preflight.ts", import.meta.url);
await mkdir(new URL(".", generatedFile), { recursive: true });
await writeFile(generatedFile, code);
