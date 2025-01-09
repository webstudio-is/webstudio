import * as csstree from "css-tree";
import { cssTryParseValue } from "../parse-css-value";
import { colord, extend } from "colord";
import {
  type UnitValue,
  type Unit,
  toValue,
  KeywordValue,
  type RgbValue,
} from "@webstudio-is/css-engine";
import namesPlugin from "colord/plugins/names";

extend([namesPlugin]);

interface GradientStop {
  color?: RgbValue;
  position?: UnitValue;
  hint?: UnitValue;
}

interface ParsedGradient {
  angle?: UnitValue;
  sideOrCorner?: KeywordValue;
  stops: GradientStop[];
}

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
  const ast = cssTryParseValue(gradient);
  if (ast === undefined) {
    return;
  }

  const match = csstree.lexer.match(
    "linear-gradient( [ <angle> | to <side-or-corner> ]? , <color-stop-list> )",
    ast
  );
  if (match.matched === null) {
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
          // If the gradientParts lenght is 1, then we need to check if it is angle or not.
          // If it's angle, then the value is related to <angle> or else it is a <color-hint>.
          if (gradientParts.length === 1) {
            if (isAngle(gradientParts[0]) === true) {
              angle = mapPercenTageOrDimentionToUnit(gradientParts[0]);
            }

            if (
              gradientParts[0].type === "Percentage" ||
              (gradientParts[0].type === "Dimension" &&
                ["deg", "grad", "rad", "turn"].includes(
                  gradientParts[0].unit
                ) === false)
            ) {
              stops.push({
                hint: mapPercenTageOrDimentionToUnit(gradientParts[0]),
              });
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
              position: mapPercenTageOrDimentionToUnit(position),
              hint: mapPercenTageOrDimentionToUnit(hint),
            };

            stops.push(stop);
          }

          gradientParts = [];
        }
      }
    }
  });

  return { angle, sideOrCorner, stops };
};

const mapPercenTageOrDimentionToUnit = (
  node?: csstree.CssNode
): UnitValue | undefined => {
  if (node === undefined) {
    return;
  }

  if (node.type !== "Percentage" && node.type !== "Dimension") {
    return;
  }

  return {
    type: "unit",
    value: Number.parseFloat(node.value),
    unit: node.type === "Percentage" ? "%" : (node.unit as Unit),
  };
};

const isAngle = (node: csstree.CssNode): node is csstree.Dimension =>
  node.type === "Dimension" &&
  ["deg", "grad", "rad", "turn"].includes(node.unit);

const isSideOrCorner = (node: csstree.CssNode): node is csstree.Identifier =>
  node.type === "Identifier" && sideOrCorderIdentifiers.includes(node.name);

const isColorStop = (
  node: csstree.CssNode
): node is csstree.Identifier | csstree.FunctionNode | csstree.Hash => {
  return (
    (node.type === "Function" ||
      (node.type === "Identifier" &&
        sideOrCorderIdentifiers.includes(node.name)) === false ||
      node.type === "Hash") &&
    colord(csstree.generate(node)).isValid() === true
  );
};

const getColor = (
  node: csstree.FunctionNode | csstree.Identifier | csstree.Hash
): RgbValue | undefined => {
  let color: string;
  if (node.type === "Function") {
    color = csstree.generate(node);
  } else if (node.type === "Identifier") {
    color = node.name;
  } else {
    color = csstree.generate(node);
  }

  const result = colord(color);
  if (result.isValid()) {
    const value = result.toRgb();

    return {
      type: "rgb",
      r: value.r,
      g: value.g,
      b: value.b,
      alpha: value.a,
    };
  }
};

export const reconstructLinearGradient = (parsed: ParsedGradient): string => {
  const direction = parsed.angle || parsed.sideOrCorner;
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

  return `linear-gradient(${direction ? toValue(direction) + ", " : ""}${stops})`;
};
