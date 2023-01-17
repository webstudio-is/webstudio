/**
 * To run it go to the root:
 *    $ pnpm tsx ./codemod/migrate-css-theme.ts
 *    $ pnpm run format
 *    $ pnpm run checks
 */
/* eslint-disable no-console, @typescript-eslint/no-explicit-any  */
/// <reference lib="es2021" />

import fs from "fs/promises";
import path from "path";

const getRecursiveFileReads = async (dir: string) => {
  const results: any = [];
  const files = await fs.readdir(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);
    if (stat.isDirectory() && file !== "node_modules") {
      results.push(...(await getRecursiveFileReads(filePath)));
      continue;
    }

    if (path.extname(file) !== ".tsx" && path.extname(file) !== ".ts") {
      continue;
    }

    const buffer = await fs.readFile(filePath);

    results.push({
      filePath,
      buffer,
    });
  }
  return results;
};

const readDirectory = async (dir: string) => {
  const results = await getRecursiveFileReads(dir);
  return results;
};

const printProperty = (name: string) => {
  if (/^[0-9a-z]+$/i.test(name) && /^[0-9]/.test(name) === false) {
    return `.${name}`;
  }
  return /^[0-9]+$/.test(name) ? `[${name}]` : `["${name}"]`;
};

const printVariable = (variableName: string, groupName: string) =>
  `theme${printProperty(groupName)}${printProperty(variableName)}`;

const guessGroupName = (variableName: string) => {
  if (
    /^(slate|yellow|orange|blue|sky|green|gray|red|mint|amber|lime|gold|cyan|indigo|grass|crimson|pink|purple|teal|violet|bronze|brown|tomato|plum)A?[0-9]+$/.test(
      variableName
    ) ||
    [
      "panel",
      "loContrast",
      "hiContrast",
      "hint",
      "muted",
      "highContrast",
      "transparentExtreme",
      "background",
    ].includes(variableName)
  ) {
    return "colors";
  }
  if (variableName === "sans" || variableName === "mono") {
    return "fonts";
  }
  return undefined;
};

const migrateVariables = (originalCode: string) => {
  let code = originalCode;

  // "$bar$1" -> theme.bar[1]
  code = code.replaceAll(
    /"\$([a-z0-9]+)(?:\$([a-z0-9]+))?"/gi,
    (orig, match1, match2) => {
      if (match2) {
        return printVariable(match2, match1);
      }
      const groupName = guessGroupName(match1);
      if (groupName) {
        return printVariable(match1, groupName);
      }
      return orig;
    }
  );

  const replaceStringContent = (
    originalString: string,
    originalStringContent: string
  ) => {
    const stringContent = originalStringContent.replaceAll(
      /\$([a-z0-9]+)(?:\$([a-z0-9]+))?/gi,
      (orig, match1, match2) => {
        if (match2) {
          return `\${${printVariable(match2, match1)}}`;
        }
        const groupName = guessGroupName(match1);
        if (groupName) {
          return `\${${printVariable(match1, groupName)}}`;
        }
        return orig;
      }
    );

    if (stringContent === originalStringContent) {
      return originalString;
    }
    return `\`${stringContent}\``;
  };

  // "something $bar$1" -> `something ${theme.bar[1]}`
  code = code.replaceAll(/"([^"]*)"/g, replaceStringContent);

  // `something $bar$1` -> `something ${theme.bar[1]}`
  code = code.replaceAll(/`([^`]*)`/g, replaceStringContent);

  return code;
};

const addImport = (code: string, filePath: string) => {
  let importCode = `import { theme } from "@webstudio-is/design-system";`;

  const pathParts = filePath.split(path.sep);
  const designSystemIndex = pathParts.indexOf("design-system");

  if (designSystemIndex !== -1) {
    importCode = `import { theme } from "${"../".repeat(
      pathParts.length - designSystemIndex - 3
    )}stitches.config";`;
  }

  const lines = code.split("\n");

  // while looking from the bottom up,
  // insert our import code before the first import we find
  const nextLinesReverse: string[] = [];
  let inserted = false;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (
      (line.startsWith("import") || line.startsWith("} from")) &&
      inserted === false
    ) {
      nextLinesReverse.push(importCode);
      inserted = true;
    }
    nextLinesReverse.push(line);
  }

  if (inserted === false) {
    nextLinesReverse.push(importCode);
  }

  return nextLinesReverse.reverse().join("\n");
};

const update = async ({ filePath, buffer }) => {
  if (filePath.endsWith("stitches.config.ts") || filePath.endsWith(".d.ts")) {
    return;
  }

  const originalCode = buffer.toString("utf-8");

  let code = migrateVariables(originalCode);

  if (code === originalCode) {
    return;
  }

  code = addImport(code, filePath);

  await fs.writeFile(filePath, code);
};

const main = async () => {
  const files = [
    ...(await readDirectory(path.resolve(__dirname, "..", "packages"))),
    ...(await readDirectory(path.resolve(__dirname, "..", "apps"))),
  ];
  files.forEach(update);
};

main();
