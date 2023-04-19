#!/usr/bin/env tsx
/* eslint-disable no-console */

import fs from "fs-extra";
import toPascalCase from "pascalcase";
import path from "path";
import { printNode, zodToTs } from "zod-to-ts";

import * as zodSchema from "@webstudio-is/project-build";

// import { Instance, InstanceId, Id, Text } from "@webstudio-is/project-build"

// [Instance, InstanceId, ]
// const { node } = zodToTs(zodTypes, `webstudio.${prop}`);
// const tsType = printNode(node, {});

const GENERATED_FILES_DIR = path.join("src", "__generated__");

// const tsSchema = [
//   "breakpoints",
//   "instances",
//   "pages",
//   "props",
//   "StyleSourceSelections",
//   "styleSource",
//   "styles",
// ]

const schemaKeys = [
  ["breakpoint", "breakpoints"],
  ["instance", "instances"],
  ["pages", "pages"],
  ["prop", "props"],
  ["styleSourceSelection", "styleSourceSelections"],
  ["styleSource", "styleSources"],
  ["styleDecl", "styles"],
];

const template = `
type JSONResult = {
\t${schemaKeys
  .map(([value, prop]) => `${prop}: ${toPascalCase(value)}[];`)
  .join("\n\t")}
};

`;
const tsSchema = schemaKeys.reduce((tsSchema, [prop]) => {
  const propCamelCased = toPascalCase(prop);
  const zodTypes = zodSchema[propCamelCased];

  try {
    const { node } = zodToTs(zodTypes, `webstudio.${prop}`);
    const tsType = printNode(node, {});

    return (tsSchema += `type ${propCamelCased} = ${tsType}\n\n`);
  } catch (e) {
    console.error("ERROR: ", prop, toPascalCase(prop), "\n\n");
    throw e;
  }
}, template);

if (!fs.existsSync(GENERATED_FILES_DIR)) {
  fs.mkdirSync(GENERATED_FILES_DIR, { recursive: true });
}

const generatedPath = path.join(GENERATED_FILES_DIR, "schema.ts");

fs.ensureFileSync(generatedPath);
fs.writeFileSync(generatedPath, tsSchema);

console.log(`✨ Done generating schema for ${generatedPath}`);
