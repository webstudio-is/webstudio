import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { StyleValue } from "@webstudio-is/css-engine";
import { parseCss } from "../src/parse-css";

const css = readFileSync("./src/html.css", "utf8");
const parsed = parseCss(css);
const result: [string, StyleValue][] = [];
for (const styleDecl of parsed) {
  result.push([`${styleDecl.selector}:${styleDecl.property}`, styleDecl.value]);
}
let code = "";
code += `import type { htmlTags as HtmlTags } from "html-tags";\n`;
code += `import type { StyleValue } from "@webstudio-is/css-engine";\n\n`;
const map = "new Map<`${HtmlTags}:${string}`, StyleValue>";
code += `export const html = ${map}(${JSON.stringify(result)})`;

mkdirSync("./src/__generated__", { recursive: true });
writeFileSync("./src/__generated__/html.ts", code);