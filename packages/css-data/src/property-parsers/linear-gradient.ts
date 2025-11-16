import * as csstree from "css-tree";
import { cssTryParseValue } from "../parse-css-value";
import { colord, extend } from "colord";
import {
  type UnitValue,
  type Unit,
  toValue,
  KeywordValue,
  type RgbValue,
  type VarValue,
} from "@webstudio-is/css-engine";
import { parseCssValue } from "../parse-css-value";
import namesPlugin from "colord/plugins/names";

extend([namesPlugin]);

export type GradientColorValue = RgbValue | KeywordValue | VarValue;

export type GradientStop = {
  color?: GradientColorValue;
  position?: UnitValue | VarValue;
  hint?: UnitValue | VarValue;
};

export type ParsedGradient = {
  angle?: UnitValue;
  sideOrCorner?: KeywordValue;
  stops: GradientStop[];
  repeating?: boolean;
};

const sideOrCorderIdentifiers = ["to", "top", "bottom", "left", "right"];

// We are currently not supporting color-interpolation-method from the linear-gradient syntax.
// There are multiple reasons to not support it:
// - mdn-data does not have any information about it. There is a PR that is opened about it.
//   https://github.com/mdn/data/pull/766 which needs to be released first.
// - we can't use css-tree parser directly and by-pass using css-tree lexer.match.But there are again multiple issues
//   css-tree package don't have information about <color-interpolation-method> for css-tree@2.3.1.
//   They only added it after css-tree@3.0.0 which has breaking changes for us to upgrade directly.
// - patching the css-tree package is a solution. But the issue was, we need to import esm build of the package.
//   But in esm build the patch.json file is merged in build file. So, even if patch the json file for syntaxes it will not help.

export const parseLinearGradient = (
  gradient: string
): ParsedGradient | undefined => {
  const normalizedGradient = gradient.replace(
    /^(\s*)repeating-linear-gradient/i,
    (_match, leadingWhitespace: string) => `${leadingWhitespace}linear-gradient`
  );
  const isRepeating = normalizedGradient !== gradient;

  const ast = cssTryParseValue(normalizedGradient);
  if (ast === undefined) {
    return;
  }

  const match = csstree.lexer.match(
    "linear-gradient( [ <angle> | to <side-or-corner> ]? , <color-stop-list> )",
    ast
  );
  const containsVar = normalizedGradient.includes("var(");
  if (match.matched === null && containsVar === false) {
    return;
  }

  let angle: UnitValue | undefined;
  let sideOrCorner: KeywordValue | undefined;
  const stops: GradientStop[] = [];
  let gradientParts: csstree.CssNode[] = [];

  csstree.walk(ast, (node) => {
    if (node.type === "Function" && node.name === "linear-gradient") {
      for (const item of node.children) {
        if (item.type !== "Operator") {
          gradientParts.push(item);
        }

        if (
          (item.type === "Operator" && item.value === ",") ||
          node.children.last === item
        ) {
          // If the gradientParts length is 1, then we need to check if it is angle or not.
          // If it's angle, then the value is related to <angle> or else it is a <color-hint>.
          if (gradientParts.length === 1) {
            const singlePart = gradientParts[0];
            if (isAngle(singlePart) === true) {
              const mappedAngle = mapLengthPercentageOrVar(singlePart);
              if (mappedAngle?.type === "unit") {
                angle = mappedAngle;
              }
            } else if (isColorStop(singlePart) === false) {
              const hintValue = mapLengthPercentageOrVar(singlePart);
              if (hintValue !== undefined) {
                stops.push({
                  hint: hintValue,
                });
              }
            }
          }

          if (gradientParts.length && isSideOrCorner(gradientParts[0])) {
            const value = gradientParts
              .map((item) => csstree.generate(item))
              .join(" ");
            sideOrCorner = { type: "keyword", value };
          }

          // if there is a color-stop in the gradientParts, then we need to parse it for position and hint.
          const colorStop = gradientParts.find(isColorStop);
          if (colorStop !== undefined) {
            const [_colorStop, position, hint] = gradientParts;

            const stop: GradientStop = {
              color: getColor(colorStop),
              position: mapLengthPercentageOrVar(position),
              hint: mapLengthPercentageOrVar(hint),
            };

            stops.push(stop);
          }

          gradientParts = [];
        }
      }
    }
  });

  if (stops.length === 0) {
    return;
  }

  const parsedGradient: ParsedGradient = { angle, sideOrCorner, stops };
  if (isRepeating) {
    parsedGradient.repeating = true;
  }

  return parsedGradient;
};

const mapLengthPercentageOrVar = (
  node?: csstree.CssNode
): UnitValue | VarValue | undefined => {
  if (node === undefined) {
    return;
  }

  if (node.type === "Percentage" || node.type === "Dimension") {
    return {
      type: "unit",
      value: Number.parseFloat(node.value),
      unit: node.type === "Percentage" ? "%" : (node.unit as Unit),
    };
  }

  if (node.type === "Number") {
    return {
      type: "unit",
      value: Number.parseFloat(node.value),
      unit: "number",
    };
  }

  if (node.type === "Function" && node.name === "var") {
    const css = csstree.generate(node).trim();
    if (css.length === 0) {
      return;
    }
    const parsed = parseCssValue("margin-left", css);
    if (parsed.type === "var") {
      return parsed;
    }
    if (parsed.type === "unit") {
      return parsed;
    }
  }
};

const isAngle = (node: csstree.CssNode): node is csstree.Dimension =>
  node.type === "Dimension" &&
  ["deg", "grad", "rad", "turn"].includes(node.unit);

const isSideOrCorner = (node: csstree.CssNode): node is csstree.Identifier =>
  node.type === "Identifier" && sideOrCorderIdentifiers.includes(node.name);

const getColor = (node: csstree.CssNode): GradientColorValue | undefined => {
  if (
    node.type !== "Function" &&
    node.type !== "Identifier" &&
    node.type !== "Hash"
  ) {
    return;
  }

  const css = csstree.generate(node).trim();
  if (css.length === 0) {
    return;
  }

  const parsed = parseCssValue("color", css);
  if (parsed.type === "rgb" || parsed.type === "var") {
    return parsed;
  }
  if (parsed.type === "keyword") {
    const color = colord(parsed.value);
    if (color.isValid()) {
      const { r, g, b, a } = color.toRgb();
      return {
        type: "rgb",
        r,
        g,
        b,
        alpha: a,
      };
    }
  }
};

const isColorStop = (node: csstree.CssNode) => getColor(node) !== undefined;

export const reconstructLinearGradient = (
  parsed: ParsedGradient,
  options?: { repeating?: boolean }
): string => {
  const direction = parsed?.angle || parsed?.sideOrCorner;
  const stops = parsed.stops
    .map((stop: GradientStop) => {
      let result = toValue(stop.color);
      if (stop.position) {
        result += ` ${toValue(stop.position)}`;
      }
      if (stop.hint) {
        result += ` ${toValue(stop.hint)}`;
      }
      return result;
    })
    .join(", ");

  const isRepeating = options?.repeating ?? parsed.repeating === true;
  const functionName = isRepeating
    ? "repeating-linear-gradient"
    : "linear-gradient";

  return `${functionName}(${direction ? toValue(direction) + ", " : ""}${stops})`;
};
