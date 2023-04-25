import { parseCss } from "@webstudio-is/css-data";
import fg from "fast-glob";
import fs from "fs-extra";
import * as path from "path";
import postcss from "postcss";
import postcssCustomProperties from "postcss-custom-properties";

const GENERATED_FILES_DIR = "__generated__";

const baseDir = path.join("src", "templates", "jsx", "tw-styles");

// let css = fs.readFileSync(path.join(baseDir, "tw.css"), "utf-8");

const css = await postcss([
  postcssCustomProperties({
    preserve: false,
  }),
])
  .process(fs.readFileSync(path.join(baseDir, "tw.css")) /*, processOptions */)
  .then((result) => result.css.replace(/,\s*var\(--tw-[^)]+\)/g, ""));

// postcssCustomProperties.process(
//   fs.readFileSync(path.join(baseDir, "tw.css")),
//   {
//     preserve: false,
//   }
// );

const styles = parseCss(css);

const generatedDir = path.join(baseDir, GENERATED_FILES_DIR);

if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir, { recursive: true });
}

const generatedPath = path.join(generatedDir, "tw-styles.ts");
fs.ensureFileSync(generatedPath);

fs.writeFileSync(
  generatedPath,
  `export const twStyles = ${JSON.stringify(styles)};`
);
