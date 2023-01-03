import { parse, definitionSyntax, type DSNode } from "css-tree";
import properties from "mdn-data/css/properties.json";
import units from "mdn-data/css/units.json";
import syntaxes from "mdn-data/css/syntaxes.json";
import { popularityIndex } from "../src/popularity-index";
import camelCase from "camelcase";
import * as fs from "fs";
import * as path from "path";
import type { StyleValue, Unit } from "../src";

type Property = keyof typeof properties;
type Value = typeof properties[Property] & { alsoAppliesTo?: Array<string> };

const inheritValue = {
  type: "keyword",
  value: "inherit",
} as const;

const autoValue = {
  type: "keyword",
  value: "auto",
} as const;

// Normalize browser dependant properties.
const normalizedValues = {
  "font-family": inheritValue,
  "font-size": inheritValue,
  "line-height": inheritValue,
  color: inheritValue,
  "column-gap": {
    type: "unit",
    value: 0,
    unit: "px",
  },
  "row-gap": {
    type: "unit",
    value: 0,
    unit: "px",
  },
  "background-size": autoValue,
  "text-size-adjust": autoValue,
} as const;

const parseInitialValue = (property: string, value: string): StyleValue => {
  // Our default values hardcoded because no single standard
  if (property in normalizedValues) {
    return normalizedValues[property as keyof typeof normalizedValues];
  }
  const ast = parse(value, { context: "value" });
  if (ast.type !== "Value") {
    throw Error(`Unknown parsed type ${ast.type}`);
  }

  // more than 2 values consider as keyword
  if (ast.children.first !== ast.children.last) {
    return {
      type: "keyword",
      value: value,
    };
  }

  const node = ast.children.first;
  if (node?.type === "Identifier") {
    return {
      type: "keyword",
      value: node.name,
    };
  }
  if (node?.type === "Number") {
    // @todo distinct unitless and 0px
    const unit: Unit = "px";
    return {
      type: "unit",
      unit,
      value: Number(node.value),
    };
  }
  if (node?.type === "Percentage") {
    return {
      type: "unit",
      unit: "%",
      value: Number(node.value),
    };
  }
  if (node?.type === "Dimension") {
    return {
      type: "unit",
      unit: node.unit as Unit,
      value: Number(node.value),
    };
  }

  throw Error(`Cannot find initial for ${property}`);
};

const walkSyntax = (
  syntax: string,
  enter: (node: DSNode) => void,
  parsedSyntaxes = new Set<string>()
) => {
  // fix cyclic syntaxes
  if (parsedSyntaxes.has(syntax)) {
    return;
  }
  parsedSyntaxes.add(syntax);
  const parsed = definitionSyntax.parse(syntax);

  const walk = (node: DSNode) => {
    if (node.type === "Group") {
      for (const term of node.terms) {
        // skip functions and their content as complex values
        if (term.type === "Function") {
          break;
        }
        walk(term);
      }
      return;
    }
    if (node.type === "Multiplier") {
      walk(node.term);
      return;
    }
    if (node.type === "Type") {
      const nestedSyntax = syntaxes[node.name]?.syntax;
      if (nestedSyntax === undefined) {
        enter(node);
      } else {
        // resolve nested syntaxes
        walkSyntax(nestedSyntax, enter, parsedSyntaxes);
      }
      return;
    }
    if (node.type === "Property") {
      // resolve other properties references
      walkSyntax(properties[node.name].syntax, enter, parsedSyntaxes);
      return;
    }
    enter(node);
  };

  walk(parsed);
};

type FilteredProperties = { [property in Property]: Value };

const filteredProperties: FilteredProperties = (() => {
  // A list of properties we don't want to show
  const ignoreProperties = [
    "all",
    "-webkit-line-clamp",
    "--*",
    "background-position",
  ];
  let property: Property;
  const result = {} as FilteredProperties;
  for (property in properties) {
    const config = properties[property];
    const isSupportedStatus =
      config.status === "standard" || config.status === "experimental";
    if (
      isSupportedStatus === false ||
      // Skipping the complex values, since we want to use the expanded once.
      Array.isArray(config.initial) ||
      ignoreProperties.includes(property) === true
    ) {
      continue;
    }
    result[property as Property] = config;
  }
  return result;
})();

const propertiesData: {
  // It's string because we camel-cased it
  [property: string]: {
    inherited: boolean;
    initial: StyleValue;
    popularity: number;
    appliesTo: string;
  };
} = {};

const patchAppliesTo = (property: Property, config: Value) => {
  // see https://github.com/mdn/data/issues/585 alignItems and justifyItems have appliesTo = "allElements"
  // this specification https://www.w3.org/TR/css-align-3/  - "block containers", "grid containers", "flex containers"
  // chrome devtools check grid or flex here https://github.com/ChromeDevTools/devtools-frontend/blob/354fb0fd3fc0a4af43ef760450e7d644d0e04daf/front_end/panels/elements/CSSRuleValidator.ts#L374
  // our opinion is that it must be "grid containers", "flex containers"
  if (property === "align-items" || property === "justify-items") {
    if (config.appliesto !== "allElements") {
      throw new Error(
        "Specification has changed, please check and update the code"
      );
    }

    // flexContainersGridContainers not exists in mdn-data, it's our custom value
    return "flexContainersGridContainers";
  }

  return config.appliesto;
};

let property: Property;

for (property in filteredProperties) {
  const config = filteredProperties[property];
  propertiesData[camelCase(property)] = {
    inherited: config.inherited,
    initial: parseInitialValue(property, config.initial),
    popularity:
      popularityIndex.find((data) => data.property === property)
        ?.dayPercentage || 0,

    appliesTo: patchAppliesTo(property, config),
  };
}

const targetDir = path.join(process.cwd(), process.argv.pop() as string);

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const writeToFile = (fileName: string, constant: string, data: unknown) => {
  const autogeneratedHint = "// This file was generated by pnpm mdn-data\n";
  const content =
    autogeneratedHint +
    `export const ${constant} = ` +
    JSON.stringify(data, null, 2) +
    " as const;";

  fs.writeFileSync(path.join(targetDir, fileName), content, "utf8");
};

const keywordValues = (() => {
  const result: { [prop: string]: Array<string> } = {};

  for (let property in filteredProperties) {
    const keywords = new Set<string>();
    walkSyntax(filteredProperties[property].syntax, (node) => {
      if (node.type === "Keyword") {
        keywords.add(node.name);
      }
    });
    if (keywords.size !== 0) {
      result[camelCase(property)] = Array.from(keywords);
    }
  }

  return result;
})();

writeToFile("properties.ts", "properties", propertiesData);
// @todo % is somehow not in the units list
// https://github.com/mdn/data/issues/553
writeToFile("units.ts", "units", [...Object.keys(units), "%"]);
writeToFile("keyword-values.ts", "keywordValues", keywordValues);
