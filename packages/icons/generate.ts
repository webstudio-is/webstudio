import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { createHash } from "node:crypto";
import { type Config, optimize } from "svgo";
import { convertSvgToJsx } from "@svgo/jsx";
import { pascalCase } from "change-case";

const prefixCache = new Map<string, string>();
const getHashedPrefix = (path?: string) => {
  if (path === undefined) {
    return "svg";
  }
  const cached = prefixCache.get(path);
  if (cached !== undefined) {
    return cached;
  }
  const hash = createHash("sha256").update(path).digest("hex").slice(0, 8);
  prefixCache.set(path, hash);
  return hash;
};

const sharedPlugins: Config["plugins"] = [
  {
    name: "preset-default",
    params: {
      overrides: {
        // preserve viewBox
        removeViewBox: false,
        convertTransform: false,
        inlineStyles: false,
        cleanupIds: false,
      },
    },
  },
  // convert width/height to viewBox if missing
  { name: "removeDimensions" },
  {
    name: "prefixIds",
    params: {
      prefix: (_node: unknown, info: { path?: string }) =>
        `c${getHashedPrefix(info.path)}`,
      prefixClassNames: false,
    },
  },
];

type GenerateOptions = {
  exportName: string;
  file: string;
  content: string;
};

export const generateStringExport = (options: GenerateOptions) => {
  const { data: optimized } = optimize(options.content, {
    path: options.file,
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

const generateComponentExport = (options: GenerateOptions) => {
  const { jsx } = convertSvgToJsx({
    target: "react-dom",
    file: options.file,
    svg: options.content,
    svgProps: {
      width: "{size}",
      height: "{size}",
      fill: "{fill}",
      "{...props}": null,
      ref: "{forwardedRef}",
    },
    plugins: sharedPlugins,
  });
  return `
export const ${options.exportName}: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
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
import type { IconComponent } from "../types";

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
