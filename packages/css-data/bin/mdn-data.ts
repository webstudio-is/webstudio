import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore @todo add missing type defitions for definitionSyntax, type DSNode, type CssNode
import { parse, definitionSyntax, type DSNode, type CssNode } from "css-tree";
import properties from "mdn-data/css/properties.json";
import syntaxes from "mdn-data/css/syntaxes.json";
import data from "css-tree/dist/data";
import { camelCase } from "change-case";
import type {
  KeywordValue,
  StyleValue,
  Unit,
  UnitValue,
  UnparsedValue,
} from "@webstudio-is/css-engine";
import * as customData from "../src/custom-data";

const units: Record<customData.UnitGroup, Array<string>> = {
  number: [],
  // consider % as unit
  percentage: ["%"],
  ...data.units,
};

type Property = keyof typeof properties;
type Value = (typeof properties)[Property];

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
  // startOrNamelessValueIfLTRRightIfRTL
  "text-align": { type: "keyword", value: "start" },
  // canvastext
  color: { type: "keyword", value: "black" },
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

const beautifyKeyword = (_property: string, keyword: string) => {
  /*
   * The default value is `invert` or `currentcolor` for some css properties.
   * But that isn't supported in all browsers, example outline-color.
   * So, going with currentColor for consistency.
   * https://developer.mozilla.org/en-US/docs/Web/CSS/outline-color#formal_definition
   */
  if (keyword === "currentcolor" || keyword === "invertOrCurrentColor") {
    return "currentColor";
  }
  return keyword;
};

const convertToStyleValue = (
  node: CssNode,
  property: string,
  value: string,
  unitGroups: Set<customData.UnitGroup>
): undefined | UnitValue | KeywordValue | UnparsedValue => {
  if (node?.type === "Identifier") {
    return {
      type: "keyword",
      value: beautifyKeyword(property, node.name),
    };
  }
  if (node?.type === "Number") {
    let unit: Unit = "number";
    // set explicit unit when 0 initial is specified without unit
    if (unitGroups.has("number") === false) {
      if (unitGroups.has("length")) {
        unit = "px";
      } else {
        throw Error(
          `Cannot infer unit for "${value}" initial value of ${property} property`
        );
      }
    }
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
};

const parseInitialValue = (
  property: string,
  value: string,
  unitGroups: Set<customData.UnitGroup>
): StyleValue => {
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
      type: "tuple",
      value: ast.children.toArray().map((node) => {
        const styleValue = convertToStyleValue(
          node,
          property,
          value,
          unitGroups
        );
        if (styleValue !== undefined) {
          return styleValue;
        }
        throw Error(`Cannot find initial for ${property}`);
      }),
    };
  }

  const node = ast.children.first;
  let styleValue: undefined | StyleValue;
  if (node) {
    styleValue = convertToStyleValue(node, property, value, unitGroups);
  }
  if (styleValue !== undefined) {
    return styleValue;
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
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore @todo add missing type defitions for definitionSyntax
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
      if (node.name === "deprecated-system-color") {
        return;
      }
      const nestedSyntax = syntaxes[node.name as keyof typeof syntaxes]?.syntax;
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
      if (node.name in properties) {
        walkSyntax(
          properties[node.name as Property].syntax,
          enter,
          parsedSyntaxes
        );
      }
      return;
    }
    enter(node);
  };

  walk(parsed);
};

type FilteredProperties = { [property in Property]: Value };

const experimentalProperties = [
  "appearance",
  "aspect-ratio",
  // not standard and not implemented without prefix
  // @todo get rid once the issue with types in radix sdk is resolved
  "line-clamp",
  // used in normalize
  "text-size-adjust",
];

const unsupportedProperties = [
  "all",
  "-webkit-line-clamp",
  "--*",
  // @todo for now webstudio supports only white-space
  // need to figure out how to make it future proof
  "white-space-collapse",
  "text-wrap",
  "text-wrap-mode",
  "text-wrap-style",
];

const animatableProperties: string[] = [];
const filteredProperties: FilteredProperties = (() => {
  let property: Property;
  const result = {} as FilteredProperties;

  /*
    A transition is a shorthand property that represents the combination of the other four properties.
    Typically, we exclude shorthand properties when using the expanded ones.
    However, in this case, the transition property in the designs allows users to set all transition values at once.
    Therefore, we need to make this property available from the generated list.

    The initial properties for transition is
    config.initial = [
      'transition-delay',
      'transition-duration',
      'transition-property',
      'transition-timing-function'
    ]

    We replace it with the defaults of the rest of the four properties
    "all 0s ease 0s"
  */

  const supportedComplexProperties: Record<string, string> = {
    // @todo remove support for transition shorthand
    transition: "all 0s ease 0s",
  };

  for (property in properties) {
    const config = properties[property];

    if (property in supportedComplexProperties) {
      config.initial = supportedComplexProperties[property];
    }

    const isSupportedProperty =
      // make sure the property standard and described in mdn
      (config.status === "standard" && "mdn_url" in config) ||
      experimentalProperties.includes(property);
    const isShorthandProperty = Array.isArray(config.initial);
    const isAnimatableProperty =
      property.startsWith("-") === false &&
      config.animationType !== "discrete" &&
      config.animationType !== "notAnimatable";

    if (unsupportedProperties.includes(property) || isShorthandProperty) {
      continue;
    }
    if (isSupportedProperty) {
      if (isAnimatableProperty) {
        animatableProperties.push(property);
      }
      result[property as Property] = config;
    }
  }
  return result;
})();

const propertiesData = { ...customData.propertiesData };

let property: Property;
for (property in filteredProperties) {
  const config = filteredProperties[property];
  // collect node types to improve parsing of css values
  const unitGroups = new Set<customData.UnitGroup>();
  const types = new Set<customData.RawPropertyData["types"][number]>();
  walkSyntax(config.syntax, (node) => {
    if (node.type === "Type") {
      const name = node.name as customData.RawPropertyData["types"][number];
      if (customData.valueTypes.includes(name) === false) {
        throw Error(`Unknown value type "${node.name}"`);
      }
      types.add(name);
      if (node.name === "integer" || node.name === "number") {
        unitGroups.add("number");
        return;
      }

      // type names match unit groups
      if (node.name in units) {
        unitGroups.add(node.name as customData.UnitGroup);
        return;
      }
    }
  });

  if (Array.isArray(config.initial)) {
    throw new Error(
      `Property ${property} contains non string initial value ${config.initial.join(
        ", "
      )}`
    );
  }

  propertiesData[camelCase(property)] = {
    unitGroups: Array.from(unitGroups),
    inherited: config.inherited,
    initial: parseInitialValue(property, config.initial, unitGroups),
    types: Array.from(types),
  };
}

const targetDir = join(process.cwd(), process.argv.slice(2).pop() as string);

mkdirSync(targetDir, { recursive: true });

const writeToFile = (fileName: string, constant: string, data: unknown) => {
  const autogeneratedHint = "// This file was generated by pnpm mdn-data\n";
  const content =
    autogeneratedHint +
    `export const ${constant} = ` +
    JSON.stringify(data, null, 2) +
    " as const;";

  writeFileSync(join(targetDir, fileName), content, "utf8");
};

// Non-standard properties are just missing in mdn data
const nonStandardValues = {
  "background-clip": ["text"],
};

// https://www.w3.org/TR/css-values/#common-keywords
const commonKeywords = ["initial", "inherit", "unset"];

const keywordValues = (() => {
  const result = { ...customData.keywordValues };

  for (const property in filteredProperties) {
    const keywords = new Set<string>();
    walkSyntax(
      filteredProperties[property as keyof typeof filteredProperties].syntax,
      (node) => {
        if (node.type === "Keyword") {
          keywords.add(beautifyKeyword(property, node.name));
        }
      }
    );

    if (property in nonStandardValues) {
      for (const nonStandartKeyword of nonStandardValues[
        property as keyof typeof nonStandardValues
      ]) {
        keywords.add(nonStandartKeyword);
      }
    }
    for (const commonKeyword of commonKeywords) {
      // Delete to add commonKeyword at the end of the set
      keywords.delete(commonKeyword);
      keywords.add(commonKeyword);
    }

    if (keywords.size !== 0) {
      const key = camelCase(property);
      result[key] = [...(result[key] ?? []), ...keywords];
    }
  }

  return result;
})();

writeToFile("units.ts", "units", units);
writeToFile("properties.ts", "properties", propertiesData);
writeToFile("keyword-values.ts", "keywordValues", keywordValues);
writeToFile(
  "animatable-properties.ts",
  "animatableProperties",
  animatableProperties
);

let types = "";

const propertyLiterals = Object.keys(propertiesData).map((property) =>
  JSON.stringify(property)
);
types += `export type Property = ${propertyLiterals.join(" | ")};\n\n`;

const unitLiterals = Object.values(units)
  .flat()
  .map((unit) => JSON.stringify(unit));
types += `export type Unit = ${unitLiterals.join(" | ")};\n`;

const typesFile = join(
  process.cwd(),
  "../css-engine/src/__generated__/types.ts"
);
mkdirSync(dirname(typesFile), { recursive: true });
writeFileSync(typesFile, types);
