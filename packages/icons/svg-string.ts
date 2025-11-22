import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { createHash } from "node:crypto"; // Import createHash
import { type Config, optimize } from "svgo";

const pascalcase = (string: string) => {
  return string
    .replace(/[^A-Z0-9]+([A-Z0-9])?/gi, (_invalid, char) =>
      char == null ? "" : char.toUpperCase()
    )
    .replace(/^[a-z]/, (char) => char.toUpperCase());
};

const transformComponentName = (filename: string) => {
  const name = basename(filename, extname(filename));
  // digits cannot start variable name
  return `${pascalcase(name).replace(/^[0-9]/, (char) => `_${char}`)}Icon`;
};

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

const plugins: Config["plugins"] = [
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
        getHashedPrefix(info.path),
      prefixClassNames: false,
    },
  },
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
];

let moduleContent = "";

for (const name of await readdir("./icons")) {
  if (name.endsWith(".svg")) {
    const exportName = transformComponentName(name);
    const content = await readFile(`./icons/${name}`, "utf-8");
    const { data: optimized } = optimize(content, {
      path: `./icons/${name}`,
      plugins,
    });
    moduleContent += `export const ${exportName} = \`${optimized.trim()}\`;\n`;
  }
}

await writeFile("./src/__generated__/svg.ts", moduleContent);
