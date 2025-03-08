import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore @todo add missing type defitions for definitionSyntax, type DSNode, type CssNode
import { parse, definitionSyntax, type DSNode, type CssNode } from "css-tree";
import properties from "mdn-data/css/properties.json";
import syntaxes from "mdn-data/css/syntaxes.json";
import selectors from "mdn-data/css/selectors.json";
import data from "css-tree/dist/data";
import {
  type KeywordValue,
  type StyleValue,
  type Unit,
  type UnitValue,
  type UnparsedValue,
  type FontFamilyValue,
  hyphenateProperty,
  type CssProperty,
} from "@webstudio-is/css-engine";
import * as customData from "../src/custom-data";
import { camelCaseProperty } from "../src/parse-css";

const units: Record<string, Array<string>> = {
  number: [],
  // consider % as unit
  percentage: ["%"],
  ...data.units,
};

type Property = keyof typeof properties;
type Value = (typeof properties)[Property];

const autoValue = {
  type: "keyword",
  value: "auto",
} as const;

// Normalize browser dependant properties.
const normalizedValues = {
  // dependsOnUserAgent
  "font-family": {
    type: "fontFamily",
    value: ["serif"],
  } satisfies FontFamilyValue,
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
  unitGroups: Set<string>
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
  unitGroups: Set<string>
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

const autogeneratedHint = "// This file was generated by pnpm mdn-data\n";

const writeToFile = (fileName: string, constant: string, data: unknown) => {
  const content =
    autogeneratedHint +
    `export const ${constant} = ` +
    JSON.stringify(data, null, 2) +
    " as const;";

  writeFileSync(join(targetDir, fileName), content, "utf8");
};

const supportedExperimentalProperties = [
  "appearance",
  "aspect-ratio",
  "text-size-adjust",
  "-webkit-line-clamp",
  "background-position-x",
  "background-position-y",
  "-webkit-tap-highlight-color",
  "-webkit-overflow-scrolling",
  "transition-behavior",
  "offset-position",
  // https://github.com/mdn/data/pull/759
  // offset-anchor is standard according to mdn.
  // But the mdn_url is missing from its config which is skipping othe starndard check.
  "offset-anchor",
];

// Properties we don't support in this form.
const unsupportedProperties = [
  "--*",
  // shorthand properties
  "all",
  "font-synthesis",
  "font-variant",
  "overflow",
  "white-space",
  "text-wrap",
  "background-position",
];

type FilteredProperties = { [property: string]: Value };

const filterData = () => {
  let property: Property;
  const allLonghands = {} as FilteredProperties;
  const allShorthands = {} as FilteredProperties;
  const animatableLonghands = {} as FilteredProperties;
  const animatableShorthands = {} as FilteredProperties;

  for (property in properties) {
    if (unsupportedProperties.includes(property)) {
      continue;
    }

    const config = properties[property];

    const isStandardProperty =
      config.status === "standard" && "mdn_url" in config;

    const isSupportedExperimentalProperty =
      supportedExperimentalProperties.includes(property);

    if (
      isStandardProperty === false &&
      isSupportedExperimentalProperty === false
    ) {
      continue;
    }

    const isAnimatableProperty =
      property.startsWith("-") === false &&
      config.animationType !== "discrete" &&
      config.animationType !== "notAnimatable";

    const isShorthandProperty = Array.isArray(config.initial);

    if (isShorthandProperty) {
      allShorthands[property] = config;
      if (isAnimatableProperty) {
        animatableShorthands[property] = config;
      }
      continue;
    }

    allLonghands[property] = config;
    if (isAnimatableProperty) {
      animatableLonghands[property] = config;
    }
  }

  return {
    allLonghands,
    allShorthands,
    animatableLonghands,
    animatableShorthands,
  };
};

const getPropertiesData = (
  customPropertiesData: typeof customData.propertiesData,
  filteredProperties: FilteredProperties
) => {
  const propertiesData = { ...customPropertiesData };

  let property: string;
  for (property in filteredProperties) {
    const config = filteredProperties[property];
    const unitGroups = new Set<string>();
    walkSyntax(config.syntax, (node) => {
      if (node.type === "Type") {
        if (node.name === "integer" || node.name === "number") {
          unitGroups.add("number");
          return;
        }

        // type names match unit groups
        if (node.name in units) {
          unitGroups.add(node.name);
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

    propertiesData[camelCaseProperty(property as CssProperty)] = {
      unitGroups: Array.from(unitGroups),
      inherited: config.inherited,
      initial: parseInitialValue(property, config.initial, unitGroups),
      ...("mdn_url" in config && { mdnUrl: config.mdn_url }),
    };
  }

  return propertiesData;
};

const pseudoElements = Object.keys(selectors)
  .filter((selector) => {
    return selector.startsWith("::");
  })
  .map((selector) => selector.slice(2));

const getKeywordValues = (filteredProperties: FilteredProperties) => {
  const result = { ...customData.keywordValues };
  // Non-standard properties are just missing in mdn data
  const nonStandardValues = {
    "background-clip": ["text"],
  };
  // https://www.w3.org/TR/css-values/#common-keywords
  const commonKeywords = ["initial", "inherit", "unset"];

  for (const property in filteredProperties) {
    const key = camelCaseProperty(property as CssProperty);
    // prevent merging with custom keywords
    if (result[key]) {
      continue;
    }
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
      result[key] = [...(result[key] ?? []), ...keywords];
    }
  }

  return result;
};

const getTypes = (propertiesData: typeof customData.propertiesData) => {
  let types = "";

  const camelCasedProperties = Object.keys(propertiesData).map((property) =>
    JSON.stringify(property)
  );
  types += `export type CamelCasedProperty = ${camelCasedProperties.join(" | ")};\n\n`;
  const hyphenatedProperties = Object.keys(propertiesData).map((property) =>
    JSON.stringify(hyphenateProperty(property))
  );
  types += `export type HyphenatedProperty = ${hyphenatedProperties.join(" | ")};\n\n`;

  const unitLiterals = Object.values(units)
    .flat()
    .map((unit) => JSON.stringify(unit));
  types += `export type Unit = ${unitLiterals.join(" | ")};\n`;

  return types;
};

const filteredData = filterData();

const longhandPropertiesData = getPropertiesData(
  customData.propertiesData,
  filteredData.allLonghands
);

const targetDir = join(process.cwd(), process.argv.slice(2).pop() as string);
mkdirSync(targetDir, { recursive: true });
writeToFile("units.ts", "units", units);

const propertiesData = Object.fromEntries(
  Object.entries(longhandPropertiesData).map(([property, data]) => [
    hyphenateProperty(property),
    data,
  ])
);
const propertiesContent = `${autogeneratedHint}
import type { __HyphenatedProperty, StyleValue } from "@webstudio-is/css-engine"
type UnitGroup = ${Object.keys(units)
  .map((item) => JSON.stringify(item))
  .join(" | ")}
type PropertyData = {
  unitGroups: UnitGroup[],
  inherited: boolean,
  initial: StyleValue,
  mdnUrl?: string
}
type Properties = Record<__HyphenatedProperty, PropertyData> & Record<\`--\${string}\`, undefined>
export const properties: Properties = ${JSON.stringify(propertiesData, null, 2)}
`;
writeFileSync(join(targetDir, "properties.ts"), propertiesContent);

writeToFile(
  "shorthand-properties.ts",
  "shorthandProperties",
  Object.keys(filteredData.allShorthands)
);
writeToFile(
  "keyword-values.ts",
  "keywordValues",
  getKeywordValues(filteredData.allLonghands)
);
writeToFile(
  "animatable-properties.ts",
  "animatableProperties",
  Object.keys(filteredData.animatableLonghands)
);
writeToFile("pseudo-elements.ts", "pseudoElements", pseudoElements);

const typesFile = join(
  process.cwd(),
  "../css-engine/src/__generated__/types.ts"
);
mkdirSync(dirname(typesFile), { recursive: true });
writeFileSync(typesFile, autogeneratedHint + getTypes(longhandPropertiesData));
