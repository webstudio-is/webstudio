import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { type Config, optimize } from "svgo";
import { convertSvgToJsx } from "@svgo/jsx";
import { pascalCase } from "change-case";

const sharedPlugins: Config["plugins"] = [
  {
    name: "preset-default",
    params: {
      overrides: {
        // preserve viewBox
        removeViewBox: false,
        convertTransform: false,
        inlineStyles: false,
      },
    },
  },
  // convert width/height to viewBox if missing
  { name: "removeDimensions" },
];

type GenerateOptions = {
  exportName: string;
  file: string;
  content: string;
};

export const generateStringExport = (options: GenerateOptions) => {
  const { data: optimized } = optimize(options.content, {
    plugins: [
      ...sharedPlugins,
      {
        name: "addAttributesToSVGElement",
        params: {
          attributes: [
            {
              fill: "currentColor",
              width: "100%",
              height: "100%",
              style: "display: block;",
            },
          ],
        },
      },
    ],
  });
  return `export const ${options.exportName} = \`${optimized.trim()}\`;`;
};

export const generateComponentExport = (options: GenerateOptions) => {
  const { jsx } = convertSvgToJsx({
    target: "react-dom",
    file: options.file,
    svg: options.content,
    svgProps: {
      width: "{size}",
      height: "{size}",
      fill: "{color}",
      "{...props}": null,
      ref: "{forwardedRef}",
    },
    plugins: sharedPlugins,
  });
  return `
export const ${options.exportName} = forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", size = 16, ...props }, forwardedRef) => {
    return (
      ${jsx}
    );
  }
);
${options.exportName}.displayName = "${options.exportName}";
`.trim();
};

const transformComponentName = (filename: string) => {
  const name = basename(filename, extname(filename));
  // digits cannot start variable name
  return `${pascalCase(name, { mergeAmbiguousCharacters: true }).replace(/^[0-9]/, (char) => `_${char}`)}Icon`;
};

let stringContent = "";
let componentsContent = `
import { forwardRef } from "react";
import type { IconProps } from "../types";

`.trimStart();

const start = process.hrtime.bigint();
let count = 0;

for (const name of await readdir("./icons")) {
  if (name.endsWith(".svg")) {
    count += 1;
    const exportName = transformComponentName(name);
    const file = `./icons/${name}`;
    const content = await readFile(file, "utf-8");
    stringContent +=
      generateStringExport({ exportName, file, content }) + "\n\n";
    componentsContent +=
      generateComponentExport({ exportName, file, content }) + "\n\n";
  }
}

await mkdir("./src/__generated__", { recursive: true });
await writeFile("./src/__generated__/svg.ts", stringContent);
await writeFile("./src/__generated__/components.tsx", componentsContent);

const end = process.hrtime.bigint();

console.info(`Compiled ${count} icons in ${(end - start) / BigInt(1e6)}ms`);
