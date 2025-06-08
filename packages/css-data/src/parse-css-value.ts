import { colord, extend } from "colord";
import namesPlugin from "colord/plugins/names";
import {
  type CssNode,
  type FunctionNode,
  generate,
  lexer,
  List,
  parse,
} from "css-tree";
import warnOnce from "warn-once";
import {
  cssWideKeywords,
  type ImageValue,
  type KeywordValue,
  type LayersValue,
  type TupleValue,
  type UnitValue,
  type LayerValueItem,
  type RgbValue,
  type StyleValue,
  type Unit,
  type VarValue,
  type FunctionValue,
  type TupleValueItem,
  type CssProperty,
  type ShadowValue,
  type UnparsedValue,
} from "@webstudio-is/css-engine";
import { keywordValues } from "./__generated__/keyword-values";
import { units } from "./__generated__/units";

// To support color names
extend([namesPlugin]);

export const cssTryParseValue = (input: string): undefined | CssNode => {
  try {
    const ast = parse(input, { context: "value" });
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
  property: CssProperty,
  value: string
): boolean => {
  if (property.startsWith("--") || value.includes("var(")) {
    return true;
  }

  // these properties have poor support natively and in csstree
  // though rendered styles are merged as shorthand
  // so validate artifically
  if (
    property === "white-space-collapse" ||
    property === "text-wrap-mode" ||
    property === "text-wrap-style"
  ) {
    return keywordValues[property].includes(value);
  }

  if (property === "transition-behavior") {
    return true;
  }

  // @todo remove after csstree fixes
  // - https://github.com/csstree/csstree/issues/246
  // - https://github.com/csstree/csstree/issues/164
  if (typeof CSSStyleValue !== "undefined") {
    try {
      CSSStyleValue.parse(property, value);
      return true;
    } catch {
      return false;
    }
  }

  const ast = cssTryParseValue(value);

  if (ast == null) {
    return false;
  }
  // scale css-proeprty accepts both number and percentage.
  // The syntax from MDN is incorrect and should be updated.
  // Here is a PR that fixes the same, but it is not merged yet.
  // https://github.com/mdn/data/pull/746
  if (property === "scale") {
    const syntax = "none | [ <number> | <percentage> ]{1,3}";
    return lexer.match(syntax, ast).matched !== null;
  }

  if (
    property === "transition-timing-function" ||
    property === "animation-timing-function"
  ) {
    if (
      lexer.match("linear( [ <number> && <percentage>{0,2} ]# )", ast).matched
    ) {
      return true;
    }
  }

  const matchResult = lexer.matchProperty(property, ast);

  // allow to parse unknown properties as unparsed
  if (matchResult.error?.message.includes("Unknown property")) {
    return true;
  }

  return matchResult.matched != null;
};

const repeatedProps = new Set<CssProperty>([
  "background-attachment",
  "background-clip",
  "background-blend-mode",
  "background-origin",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "background-size",
  "background-image",
  "transition-property",
  "transition-duration",
  "transition-delay",
  "transition-timing-function",
  "transition-behavior",
  "box-shadow",
  "text-shadow",
]);

const tupleProps = new Set<CssProperty>([
  "scale",
  "translate",
  "rotate",
  "transform",
  "filter",
  "backdrop-filter",
  "transform-origin",
  "perspective-origin",
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

const parseShadow = (
  nodes: CssNode[],
  input: string
): ShadowValue | UnparsedValue => {
  // https://drafts.csswg.org/css-borders-4/#box-shadow-position
  let position: "inset" | "outset" = "outset";
  let color: undefined | RgbValue | KeywordValue;
  const units: UnitValue[] = [];
  for (const node of nodes) {
    const item = parseLiteral(node, ["inset"]);
    if (item?.type === "keyword" && item.value === "inset") {
      position = item.value;
    } else if (item?.type === "keyword" && parseColor(item.value)) {
      color = item;
    } else if (item?.type === "rgb") {
      color = item;
    } else if (item?.type === "unit") {
      units.push(item);
    } else {
      return { type: "unparsed", value: input };
    }
  }
  if (units.length < 2) {
    return { type: "unparsed", value: input };
  }
  const shadowValue: ShadowValue = {
    type: "shadow",
    position,
    offsetX: units[0],
    offsetY: units[1],
  };
  if (units.length > 2) {
    shadowValue.blur = units[2];
  }
  if (units.length > 3) {
    shadowValue.spread = units[3];
  }
  if (color) {
    shadowValue.color = color;
  }
  return shadowValue;
};

export const parseCssVar = (node: FunctionNode): undefined | VarValue => {
  const [name, _comma, ...fallback] = node.children;
  const fallbackString = generate({
    type: "Value",
    children: new List<CssNode>().fromArray(fallback),
  }).trim();
  if (name.type === "Identifier") {
    const value: VarValue = {
      type: "var",
      value: name.name.slice("--".length),
    };
    if (fallback.length > 0) {
      value.fallback = { type: "unparsed", value: fallbackString };
    }
    return value;
  }
};

const parseLiteral = (
  node: undefined | null | CssNode,
  keywords?: readonly string[]
):
  | undefined
  | UnitValue
  | KeywordValue
  | ImageValue
  | RgbValue
  | VarValue
  | FunctionValue => {
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
    if (
      keywords?.map((keyword) => keyword.toLowerCase()).includes(name) ||
      parseColor(name)
    ) {
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
    // <color-function>
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
    if (node.name === "var") {
      return parseCssVar(node);
    }

    // functions with comma-separated arguments
    if (
      // <transform-function>
      // 2d
      node.name === "matrix" ||
      node.name === "translate" ||
      node.name === "translateX" ||
      node.name === "translateY" ||
      node.name === "scale" ||
      node.name === "scaleX" ||
      node.name === "scaleY" ||
      node.name === "rotate" ||
      node.name === "skew" ||
      node.name === "skewX" ||
      node.name === "skewY" ||
      // 3d
      node.name === "matrix3d" ||
      node.name === "translate3d" ||
      node.name === "translateZ" ||
      node.name === "scale3d" ||
      node.name === "scaleZ" ||
      node.name === "rotate3d" ||
      node.name === "rotateX" ||
      node.name === "rotateY" ||
      node.name === "rotateZ" ||
      node.name === "perspective" ||
      // <easing-function>
      node.name === "cubic-bezier" ||
      node.name === "steps"
      // treat linear function as unparsed
    ) {
      const args: LayersValue = { type: "layers", value: [] };
      for (const arg of node.children) {
        const matchedValue = parseLiteral(arg);
        if (matchedValue) {
          args.value.push(matchedValue as LayerValueItem);
        }
        if (arg.type === "Identifier") {
          args.value.push({ type: "keyword", value: arg.name });
        }
      }
      return { type: "function", args, name: node.name };
    }

    // functions with space separated arguments
    if (
      // <filter-function>
      node.name === "blur" ||
      node.name === "brightness" ||
      node.name === "contrast" ||
      node.name === "grayscale" ||
      node.name === "hue-rotate" ||
      node.name === "invert" ||
      node.name === "opacity" ||
      node.name === "sepia" ||
      node.name === "saturate"
    ) {
      const args: TupleValue = { type: "tuple", value: [] };
      for (const arg of node.children) {
        const matchedValue = parseLiteral(arg);
        if (matchedValue) {
          args.value.push(matchedValue as TupleValueItem);
        }
      }
      return { type: "function", args, name: node.name };
    }
    if (node.name === "drop-shadow") {
      return {
        type: "function",
        args: parseShadow(
          node.children.toArray(),
          generate({ type: "Value", children: node.children })
        ),
        name: node.name,
      };
    }
  }
};

export const parseCssValue = (
  property: CssProperty, // Handles only long-hand values.
  input: string,
  topLevel = true
): StyleValue => {
  const potentialKeyword = input.toLowerCase().trim();
  if (cssWideKeywords.has(potentialKeyword)) {
    return { type: "keyword", value: potentialKeyword };
  }

  if (property === "transition-property" && potentialKeyword === "none") {
    if (topLevel) {
      return { type: "keyword", value: potentialKeyword };
    } else {
      // none is not valid layer keyword
      return { type: "unparsed", value: potentialKeyword };
    }
  }

  const invalidValue = {
    type: "invalid",
    value: input,
  } as const;

  if (input.length === 0) {
    // custom properties can be empty
    // in case interpolated value need to be avoided
    if (property.startsWith("--")) {
      return { type: "unparsed", value: "" };
    }
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
  const nodes = "children" in ast ? (ast.children?.toArray() ?? []) : [ast];

  // support only following types in custom properties
  if (property.startsWith("--")) {
    if (nodes.length === 1) {
      const parsedValue = parseLiteral(nodes[0]);
      if (
        parsedValue?.type === "var" ||
        parsedValue?.type === "unit" ||
        parsedValue?.type === "rgb"
      ) {
        return parsedValue;
      }
    }
    return { type: "unparsed", value: input };
  }

  // parse single var() without wrapping with layers or tuples
  // which can possibly get nested when variables are computed
  if (
    nodes.length === 1 &&
    nodes[0].type === "Function" &&
    nodes[0].name === "var"
  ) {
    return parseLiteral(nodes[0]) ?? invalidValue;
  }

  // prevent infinite splitting into layers for items
  if (repeatedProps.has(property) && topLevel) {
    let invalid = false;
    const layersValue: StyleValue = {
      type: "layers",
      value: splitRepeated(nodes).map((nodes) => {
        const value = generate({
          type: "Value",
          children: new List<CssNode>().fromArray(nodes),
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
  if (property === "transition-behavior") {
    const node = ast.type === "Value" ? ast.children.first : ast;
    const keyword = parseLiteral(node, keywordValues[property]);
    if (keyword?.type === "keyword") {
      return keyword;
    }
    return invalidValue;
  }

  if (property === "font-family") {
    return {
      type: "fontFamily",
      value: splitRepeated(nodes).map((nodes) => {
        // unquote values
        if (nodes.length === 1 && nodes[0].type === "String") {
          return nodes[0].value;
        }
        return generate({
          type: "Value",
          children: new List<CssNode>().fromArray(nodes),
        });
      }),
    };
  }

  if (property === "box-shadow" || property === "text-shadow") {
    return parseShadow(nodes, input);
  }

  // Probably a tuple like background-size or box-shadow
  if (
    ast.type === "Value" &&
    (ast.children.size === 2 || tupleProps.has(property))
  ) {
    const tuple: TupleValue = {
      type: "tuple",
      value: [],
    };
    for (const node of ast.children) {
      // output any values with unhandled operators like slash or comma as unparsed
      if (node.type === "Operator") {
        return { type: "unparsed", value: input };
      }
      const matchedValue = parseLiteral(node, keywordValues[property]);
      if (matchedValue) {
        tuple.value.push(matchedValue as never);
      } else {
        tuple.value.push({ type: "unparsed", value: generate(node) });
      }
    }
    return tuple;
  }

  if (ast.type === "Value" && ast.children.size === 1) {
    // Try extract units from 1st children
    const first = ast.children.first;
    const matchedValue = parseLiteral(first, keywordValues[property]);
    if (matchedValue) {
      return matchedValue;
    }
  }

  return {
    type: "unparsed",
    value: input,
  };
};
