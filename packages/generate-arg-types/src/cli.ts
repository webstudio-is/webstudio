#!/usr/bin/env tsx
/* eslint-disable no-console */

import path from "path";
import { withCustomConfig } from "react-docgen-typescript";
import fg from "fast-glob";

import fs from "fs-extra";
import { propsToArgTypes } from "./arg-types";

const GENERATED_FILES_DIR = "__generated__";

const options = {
  shouldExtractLiteralValuesFromEnum: true,
  shouldRemoveUndefinedFromOptional: true,
};

const componentsGlobString = process.argv.pop();
const tsConfigPath = path.resolve(process.cwd(), "./tsconfig.json");

if (typeof componentsGlobString === "undefined") {
  throw new Error(
    "Please provide glob patterns (space separated) as arguments to match your components"
  );
}

// Search for components
const globs = componentsGlobString.split(" ");
const componentFiles = fg.sync(globs);

console.log(`Resolved tscofig.json at ${tsConfigPath}\n`);
console.log(`Glob patterns used: \n${globs.join("\n")}\n`);
console.log(`Found files to process: \n${componentFiles.join("\n")}\n`);

if (componentFiles.length === 0) {
  throw new Error("No component files found");
}

// Create a parser with using your typescript config
const tsConfigParser = withCustomConfig(tsConfigPath, options);

// For each component file generate argTypes based on the propTypes
componentFiles.forEach((filePath) => {
  const generatedJsonDir = path.join(
    path.dirname(filePath),
    GENERATED_FILES_DIR
  );

  if (!fs.existsSync(generatedJsonDir)) {
    fs.mkdirSync(generatedJsonDir, { recursive: true });
  }

  const generateJsonFile = `${path.basename(filePath, ".tsx")}.props.json`;
  const generateJsonPath = path.join(generatedJsonDir, generateJsonFile);

  const res = tsConfigParser.parse(filePath);
  const argTypes = propsToArgTypes(res[0].props);
  fs.ensureFileSync(generateJsonPath);
  fs.writeJsonSync(generateJsonPath, argTypes, { spaces: 2 });
  console.log(`Done generating argTypes for ${generateJsonPath}`);
});
