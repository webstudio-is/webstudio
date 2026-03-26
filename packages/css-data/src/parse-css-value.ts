import {
  type CssNode,
  type FunctionNode,
  generate,
  lexer,
  List,
  parse,
  walk,
} from "css-tree";
import warnOnce from "warn-once";
import {
  color,
  toColorSpace,
  toColorComponent,
  cssWideKeywords,
  type ImageValue,
  type KeywordValue,
  type LayersValue,
  type TupleValue,
  type UnitValue,
  type LayerValueItem,
  type RgbValue,
  type ColorValue,
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
  // Custom properties accept any value.
  if (property.startsWith("--")) {
    return true;
  }

  // Parse once upfront for structural inspection. cssTryParseValue may return
  // null for values that the browser can still handle (csstree has known gaps),
  // so null here does NOT mean the value is invalid — we fall through to other paths.
  const ast = cssTryParseValue(value);

  // Two CSS constructs cannot be validated by any lexer path and must be accepted
  // unconditionally regardless of property:
  //   var()         — the variable's value is unknown at validation time
  //   relative color (rgb(from ...), oklch(from ...), etc.) — csstree lexer
  //                   returns the same "Mismatch" error as genuinely invalid values
  // Detecting these here also ensures var() stays valid for the keyword-only
  // properties below, which don't go through CSSStyleValue.parse.
  if (ast != null) {
    let hasUncheckedSyntax = false;
    walk(ast, (node) => {
      if (node.type === "Function") {
        if (
          node.name === "var" ||
          (node.children.first?.type === "Identifier" &&
            node.children.first.name === "from")
        ) {
          hasUncheckedSyntax = true;
        }
      }
    });
    if (hasUncheckedSyntax) {
      return true;
    }
  }

  // these properties have poor support in browser
  // though rendered styles are merged as shorthand
  // so validate artifically
  if (
    property === "white-space-collapse" ||
    property === "text-wrap-mode" ||
    property === "text-wrap-style"
  ) {
    return keywordValues[property].includes(value);
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

  // Non-browser (test) path — use csstree lexer.
  // Bail out if the AST parse above failed; the lexer can't work without it.
  if (ast == null) {
    return false;
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

  // Reuse the AST parsed above — no second cssTryParseValue call needed.
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

export const parseColor = (colorString: string): undefined | ColorValue => {
  // does not match css variables which are incorrectly treated by colorjs.io
  if (!lexer.match("<color>", colorString).matched) {
    return;
  }
  try {
    // css-tree's generator strips the space before negative values (e.g. "0.1-0.2").
    // Restore it so colorjs can tokenize color function arguments correctly.
    const normalized = colorString.replace(/([\d.])-(\d)/g, "$1 -$2");
    const colorResult = color.parse(normalized);
    return {
      type: "color",
      colorSpace: toColorSpace(color.ColorSpace.get(colorResult.spaceId)),
      components: colorResult.coords.map(
        toColorComponent
      ) as ColorValue["components"],
      alpha: toColorComponent(colorResult.alpha),
    };
  } catch {
    // Invalid colors or relative color syntax are treated as unparsed
  }
};

// Parse a color function node that uses a CSS var() as its alpha channel.
// e.g. rgb(28 25 23 / var(--tw-text-opacity)) or color(display-p3 0.4 0.6 0.3 / var(--tw-bg-opacity))
//
// Neither colorjs nor css-tree's lexer support var() in the alpha slot, so we use
// css-tree's AST to locate the var(), extract the color components by substituting
// "1" for the var node (AST-level, no string replacement), then store the var as alpha.
const parseColorWithVarAlpha = (node: FunctionNode): undefined | ColorValue => {
  // Find the "/" operator followed by a var() function in the css-tree AST
  let foundSlash = false;
  let varNode: FunctionNode | undefined;
  for (const child of node.children) {
    if (child.type === "Operator" && child.value === "/") {
      foundSlash = true;
    } else if (
      foundSlash &&
      child.type === "Function" &&
      child.name === "var"
    ) {
      varNode = child;
      break;
    }
  }

  if (!foundSlash || varNode === undefined) {
    return;
  }

  const alphaVar = parseCssVar(varNode);
  if (alphaVar === undefined) {
    return;
  }

  // Use css-tree to rebuild the function node with "1" substituted for the var()
  // so colorjs can parse the color components. This is AST-based — no fragile
  // string replacement that could match the wrong occurrence.
  const substituteChildren = new List<CssNode>();
  for (const child of node.children) {
    if (child === varNode) {
      substituteChildren.appendData({
        type: "Number",
        loc: null,
        value: "1",
      });
    } else {
      substituteChildren.appendData(child);
    }
  }
  const substituteStr = generate({
    type: "Function",
    loc: null,
    name: node.name,
    children: substituteChildren,
  });

  const color = parseColor(substituteStr);
  if (color === undefined) {
    return;
  }

  // If the var has no CSS-level fallback, use "1" (fully opaque) as the fallback
  // so renderers have a safe value when the variable is unset.
  const alpha: VarValue =
    alphaVar.fallback !== undefined
      ? alphaVar
      : { ...alphaVar, fallback: { type: "unit", unit: "number", value: 1 } };

  return { ...color, alpha };
};

const parseShadow = (
  nodes: CssNode[],
  input: string
): ShadowValue | UnparsedValue => {
  // https://drafts.csswg.org/css-borders-4/#box-shadow-position
  let position: "inset" | "outset" = "outset";
  let color: undefined | ColorValue | RgbValue | KeywordValue;
  const units: UnitValue[] = [];
  for (const node of nodes) {
    const item = parseLiteral(node, ["inset"]);
    if (item?.type === "keyword" && item.value === "inset") {
      position = item.value;
    } else if (item?.type === "keyword" && parseColor(item.value)) {
      color = item;
    } else if (item?.type === "color") {
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
    loc: null,
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
  | ColorValue
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
    const hexString = `#${node.value}`;
    const color = parseColor(hexString);
    if (color) {
      return { ...color, colorSpace: "hex" };
    }
  }
  if (node?.type === "Function") {
    // <color-function>
    if (
      node.name === "hsl" ||
      node.name === "hsla" ||
      node.name === "rgb" ||
      node.name === "rgba" ||
      node.name === "oklch" ||
      node.name === "oklab" ||
      node.name === "lch" ||
      node.name === "lab" ||
      node.name === "hwb" ||
      node.name === "color"
    ) {
      const color = parseColor(generate(node));
      if (color) {
        return color;
      }
      // Try to parse with CSS variable as alpha channel (CSS Color Level 4)
      // e.g. rgb(28 25 23 / var(--tw-text-opacity))
      const colorWithVarAlpha = parseColorWithVarAlpha(node);
      if (colorWithVarAlpha) {
        return colorWithVarAlpha;
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
          generate({ type: "Value", loc: null, children: node.children })
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
        parsedValue?.type === "rgb" ||
        parsedValue?.type === "color"
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
          loc: null,
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
          loc: null,
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
