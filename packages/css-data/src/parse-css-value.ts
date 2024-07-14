import { colord } from "colord";
import * as csstree from "css-tree";
import { type CssNode, generate } from "css-tree";
import warnOnce from "warn-once";
import {
  cssWideKeywords,
  hyphenateProperty,
  type ImageValue,
  type KeywordValue,
  type LayersValue,
  type TupleValue,
  type UnitValue,
  type LayerValueItem,
  type RgbValue,
  type StyleProperty,
  type StyleValue,
  type Unit,
} from "@webstudio-is/css-engine";
import { keywordValues } from "./__generated__/keyword-values";
import { units } from "./__generated__/units";
import { parseTranslate } from "./property-parsers/translate";
import { parseTransform } from "./property-parsers/transform";
import { parseScale } from "./property-parsers/scale";
import { parseFilter } from "./property-parsers/filter";
import { parseShadow } from "./property-parsers/shadows";

export const cssTryParseValue = (input: string) => {
  try {
    const ast = csstree.parse(input, { context: "value" });
    return ast;
  } catch {
    return;
  }
};

const splitRepeated = (nodes: CssNode[]) => {
  const lists: Array<CssNode[]> = [[]];
  for (const node of nodes) {
    if (node.type === "Operator" && node.value === ",") {
      lists.push([]);
    } else {
      lists.at(-1)?.push(node);
    }
  }
  return lists;
};

// Because csstree parser has bugs we use CSSStyleValue to validate css properties if available
// and fall back to csstree.
export const isValidDeclaration = (
  property: string,
  value: string
): boolean => {
  const cssPropertyName = hyphenateProperty(property);

  // these properties have poor support natively and in csstree
  // though rendered styles are merged as shorthand
  // so validate artifically
  if (cssPropertyName === "white-space-collapse") {
    return keywordValues.whiteSpaceCollapse.includes(
      value as (typeof keywordValues.whiteSpaceCollapse)[0]
    );
  }
  if (cssPropertyName === "text-wrap-mode") {
    return keywordValues.textWrapMode.includes(
      value as (typeof keywordValues.textWrapMode)[0]
    );
  }
  if (cssPropertyName === "text-wrap-style") {
    return keywordValues.textWrapStyle.includes(
      value as (typeof keywordValues.textWrapStyle)[0]
    );
  }

  if (cssPropertyName === "transition-behavior") {
    return true;
  }

  // @todo remove after csstree fixes
  // - https://github.com/csstree/csstree/issues/246
  // - https://github.com/csstree/csstree/issues/164
  if (typeof CSSStyleValue !== "undefined") {
    try {
      CSSStyleValue.parse(cssPropertyName, value);
      return true;
    } catch {
      return false;
    }
  }

  const ast = cssTryParseValue(value);

  if (ast == null) {
    return false;
  }

  const matchResult = csstree.lexer.matchProperty(cssPropertyName, ast);

  // allow to parse unknown properties as unparsed
  if (matchResult.error?.message.includes("Unknown property")) {
    return true;
  }

  return matchResult.matched != null;
};

const repeatedProps = new Set<StyleProperty>([
  "backgroundAttachment",
  "backgroundClip",
  "backgroundBlendMode",
  "backgroundOrigin",
  "backgroundPositionX",
  "backgroundPositionY",
  "backgroundRepeat",
  "backgroundSize",
  "backgroundImage",
  "transitionProperty",
  "transitionDuration",
  "transitionDelay",
  "transitionTimingFunction",
  "transitionBehavior",
]);

const availableUnits = new Set<string>(Object.values(units).flat());

const parseColor = (colorString: string): undefined | RgbValue => {
  const color = colord(colorString);
  if (color.isValid()) {
    const rgb = color.toRgb();
    return {
      type: "rgb",
      alpha: rgb.a,
      r: rgb.r,
      g: rgb.g,
      b: rgb.b,
    };
  }
};

const parseLiteral = (
  node: undefined | null | CssNode,
  keywords?: readonly string[]
): undefined | UnitValue | KeywordValue | ImageValue | RgbValue => {
  if (node?.type === "Number") {
    return {
      type: "unit",
      unit: "number",
      value: Number(node.value),
    };
  }
  if (node?.type === "Dimension" && availableUnits.has(node.unit)) {
    return {
      type: "unit",
      unit: node.unit as Unit,
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
  if (node?.type === "Identifier") {
    const name = node.name.toLowerCase();
    if (keywords?.map((keyword) => keyword.toLowerCase()).includes(name)) {
      return {
        type: "keyword",
        value: name,
      };
    }
  }
  if (node?.type === "Url") {
    return {
      type: "image",
      value: {
        type: "url",
        url: node.value,
      },
    };
  }
  if (node?.type === "Hash") {
    const color = parseColor(`#${node.value}`);
    if (color) {
      return color;
    }
  }
  if (node?.type === "Function") {
    if (
      node.name === "hsl" ||
      node.name === "hsla" ||
      node.name === "rgb" ||
      node.name === "rgba"
    ) {
      const color = parseColor(generate(node));
      if (color) {
        return color;
      }
    }
  }
};

export const parseCssValue = (
  property: StyleProperty, // Handles only long-hand values.
  input: string,
  topLevel = true
): StyleValue => {
  const potentialKeyword = input.toLowerCase().trim();
  if (cssWideKeywords.has(potentialKeyword)) {
    return { type: "keyword", value: potentialKeyword };
  }

  if (property === "transitionProperty" && potentialKeyword === "none") {
    if (topLevel) {
      return { type: "keyword", value: potentialKeyword };
    } else {
      // none is not valid layer keyword
      return { type: "unparsed", value: potentialKeyword };
    }
  }

  if (property === "scale") {
    return parseScale(input);
  }

  const invalidValue = {
    type: "invalid",
    value: input,
  } as const;

  if (input.length === 0) {
    return invalidValue;
  }

  if (isValidDeclaration(property, input) === false) {
    return invalidValue;
  }

  const ast = cssTryParseValue(input);

  if (ast == null) {
    warnOnce(
      true,
      `Can't parse css property "${property}" with value "${input}"`
    );
    return invalidValue;
  }

  if (property === "translate") {
    return parseTranslate(input);
  }

  if (property === "transform") {
    return parseTransform(input);
  }

  if (property === "filter" || property === "backdropFilter") {
    return parseFilter(property, input);
  }

  if (property === "boxShadow" || property === "textShadow") {
    return parseShadow(property, input);
  }

  // prevent infinite splitting into layers for items
  if (repeatedProps.has(property) && topLevel) {
    const nodes = "children" in ast ? ast.children?.toArray() ?? [] : [ast];
    let invalid = false;
    const layersValue: StyleValue = {
      type: "layers",
      value: splitRepeated(nodes).map((nodes) => {
        const value = csstree.generate({
          type: "Value",
          children: new csstree.List<CssNode>().fromArray(nodes),
        });
        const parsed = parseCssValue(property, value, false) as LayerValueItem;
        if (parsed.type === "invalid") {
          invalid = true;
        }
        return parsed;
      }),
    };
    // at least one layer is invalid then whole value is invalid
    if (invalid) {
      return invalidValue;
    }
    return layersValue;
  }

  // csstree does not support transition-behavior
  // so check keywords manually
  if (property === "transitionBehavior") {
    const node = ast.type === "Value" ? ast.children.first : ast;
    const keyword = parseLiteral(node, keywordValues[property]);
    if (keyword?.type === "keyword") {
      return keyword;
    }
    return invalidValue;
  }

  if (property === "transitionTimingFunction") {
    const node = ast.type === "Value" ? ast.children.first : ast;
    const keyword = parseLiteral(node, keywordValues[property]);
    if (keyword) {
      return keyword;
    }
    if (node?.type === "Function") {
      // transition timing function arguments are comma seperated values
      const args: LayersValue = { type: "layers", value: [] };
      for (const arg of node.children) {
        const matchedValue = parseLiteral(arg);
        if (matchedValue) {
          args.value.push(matchedValue);
        }
        if (arg.type === "Identifier") {
          args.value.push({ type: "keyword", value: arg.name });
        }
      }
      return { type: "function", args, name: node.name };
    }
  }

  if (ast.type === "Value" && ast.children.size === 1) {
    // Try extract units from 1st children
    const first = ast.children.first;

    const matchedValue = parseLiteral(first, keywordValues[property as never]);
    if (matchedValue) {
      return matchedValue;
    }
  }

  // Probably a tuple like background-size
  if (ast.type === "Value" && ast.children.size > 1) {
    const tuple: TupleValue = {
      type: "tuple",
      value: [],
    };
    for (const node of ast.children) {
      const matchedValue = parseLiteral(node, keywordValues[property as never]);
      if (matchedValue) {
        tuple.value.push(matchedValue);
      }
    }
    return tuple;
  }

  return {
    type: "unparsed",
    value: input,
  };
};
