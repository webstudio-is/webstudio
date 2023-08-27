#!/usr/bin/env tsx
/* eslint-disable no-console */

import { mkdirSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { withCustomConfig } from "react-docgen-typescript";
import fg from "fast-glob";
import { propsToArgTypes } from "./arg-types";
import { parseArgs, type ParseArgsConfig } from "node:util";
import { addDescriptions } from "./props/add-descriptions";

const GENERATED_FILES_DIR = "__generated__";

const options = {
  shouldExtractLiteralValuesFromEnum: true,
  shouldRemoveUndefinedFromOptional: true,
};

const CLI_ARGS_OPTIONS = {
  allowPositionals: true,
  options: {
    exclude: {
      type: "string",
      multiple: true,
      short: "e",
    },
  },
  strict: true,
} as const satisfies ParseArgsConfig;

const cliArgs = parseArgs({ args: process.argv.slice(2), ...CLI_ARGS_OPTIONS });

const componentsGlobString = cliArgs.positionals.join(" ");

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

type ComponentNameType = string;
type CustomDescriptionsType = {
  [key in ComponentNameType]: {
    [key in string]: string;
  };
};

(async function run() {
  const customDescriptionsByDir: { [key in string]: CustomDescriptionsType } =
    {};
  // For each component file generate argTypes based on the propTypes
  for (const filePath of componentFiles) {
    const fileDir = path.dirname(filePath);
    const generatedDir = path.join(fileDir, GENERATED_FILES_DIR);

    /**
     * Every library can define a src/props-description.ts file which exports `propsDescription`.
     * The type of this object is `CustomDescriptions`.
     * These descriptions override the generic ones from this package which are located in ./props/descriptions.ts
     */
    const customDescriptionsDir = path.join(process.cwd(), fileDir);
    let customDescriptions: CustomDescriptionsType =
      customDescriptionsByDir[customDescriptionsDir];

    if (customDescriptions == null) {
      try {
        const { propsDescriptions } = await import(
          path.join(customDescriptionsDir, "props-descriptions.ts")
        );
        customDescriptionsByDir[customDescriptionsDir] = propsDescriptions;
        customDescriptions = propsDescriptions;
      } catch (error) {
        customDescriptions = {};
      }
    }

    const generatedFile = `${path.basename(filePath, ".tsx")}.props.ts`;
    const generatedPath = path.join(generatedDir, generatedFile);

    const componentDocs = tsConfigParser.parse(filePath);

    if (componentDocs.length === 0) {
      console.error(`No propTypes found for ${filePath}`);
      continue;
    }

    let fileContent = `import type { PropMeta } from "@webstudio-is/generate-arg-types";\n`;

    if (componentDocs.length === 1) {
      const argTypes = propsToArgTypes(
        componentDocs[0].props,
        cliArgs.values.exclude ?? []
      );

      const componentName = componentDocs[0].displayName;

      addDescriptions(
        componentName,
        argTypes,
        customDescriptions[componentName]
      );

      fileContent = `${fileContent}
      export const props: Record<string, PropMeta> = ${JSON.stringify(
        argTypes
      )}`;
    } else {
      for (const componentDoc of componentDocs) {
        const argTypes = propsToArgTypes(
          componentDoc.props,
          cliArgs.values.exclude ?? []
        );

        const componentName = componentDoc.displayName;

        addDescriptions(
          componentName,
          argTypes,
          customDescriptions[componentName]
        );

        fileContent = `${fileContent}
        export const props${componentName}: Record<string, PropMeta> = ${JSON.stringify(
          argTypes
        )}`;
      }
    }

    mkdirSync(generatedDir, { recursive: true });
    writeFileSync(generatedPath, fileContent);

    console.log(`Done generating argTypes for ${generatedPath}`);
  }
})();
