#!/usr/bin/env tsx
/* eslint-disable no-console */

import fg from "fast-glob";
import fs from "fs-extra";
import toPascalCase from "pascalcase";
import path from "path";
import { printNode, zodToTs } from "zod-to-ts";

import * as zodSchema from "@webstudio-is/project-build";

const GENERATED_FILES_DIR = path.join("src", "__generated__");

// @todo we need to generate type definitions for the normalized schema
// Eg:
//
// type FlatArray<Id, Obj> = Array<[Id, Obj]>
// type Instances<Id> = FlatArray<Id, {
//     type: "instance";
//     id: Id;
//     component: string;
//     label?: string | undefined;
//     children: ({
//         type: "id";
//         value: string;
//     } | {
//         type: "text";
//         value: string;
//     })[]
// }>

const tsSchema = [
  "breakpoints",
  "instances",
  "pages",
  "props",
  "StyleSourceSelections",
  "styleSource",
  "styles",
].reduce((tsSchema, prop) => {
  const propCamelCased = toPascalCase(prop);
  const zodTypes = zodSchema[propCamelCased];

  try {
    const { node } = zodToTs(zodTypes, `webstudio.${prop}`);
    const tsType = printNode(node, {});

    return (tsSchema += `export type ${propCamelCased} = ${tsType}\n\n`);
  } catch (e) {
    console.error("ERROR: ", prop, toPascalCase(prop), "\n\n");
    throw e;
  }
}, "");

if (!fs.existsSync(GENERATED_FILES_DIR)) {
  fs.mkdirSync(GENERATED_FILES_DIR, { recursive: true });
}

const generatedPath = path.join(GENERATED_FILES_DIR, "schema.ts");

fs.ensureFileSync(generatedPath);
fs.writeFileSync(generatedPath, tsSchema);

console.log(`✨ Done generating schema for ${generatedPath}`);
