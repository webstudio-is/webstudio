import * as csstree from "css-tree";
import { cssTryParseValue } from "../parse-css-value";
import {
  type UnitValue,
  toValue,
  KeywordValue,
  type VarValue,
} from "@webstudio-is/css-engine";
import {
  getColor,
  isAngleDimension,
  isAngleUnit,
  isColorStop,
  isVarAngle,
  mapLengthPercentageOrVar,
  formatGradientStops,
  normalizeRepeatingGradient,
  forEachGradientParts,
} from "./gradient-utils";

export type {
  GradientColorValue,
  GradientStop,
  ParsedGradient,
  ParsedLinearGradient,
  ParsedConicGradient,
} from "./types";

import type { GradientStop, ParsedLinearGradient } from "./types";

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
): ParsedLinearGradient | undefined => {
  const { normalized: normalizedGradient, isRepeating } =
    normalizeRepeatingGradient(
      gradient,
      "repeating-linear-gradient",
      "linear-gradient"
    );

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

  let angle: UnitValue | VarValue | undefined;
  let sideOrCorner: KeywordValue | undefined;
  const stops: GradientStop[] = [];
  forEachGradientParts(ast, "linear-gradient", (gradientParts) => {
    let handledAsAngle = false;

    if (gradientParts.length === 1) {
      const singlePart = gradientParts[0];
      const mappedValue = mapLengthPercentageOrVar(singlePart);
      const isAngleValue =
        (isAngleDimension(singlePart) &&
          mappedValue?.type === "unit" &&
          isAngleUnit(mappedValue.unit)) ||
        (singlePart.type === "Function" &&
          singlePart.name === "var" &&
          mappedValue?.type === "var" &&
          isVarAngle(mappedValue));

      if (isAngleValue && mappedValue !== undefined) {
        angle = mappedValue;
        handledAsAngle = true;
      } else if (isColorStop(singlePart) === false) {
        if (mappedValue !== undefined) {
          stops.push({
            hint: mappedValue,
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

    if (handledAsAngle === false) {
      const colorStop = gradientParts.find(isColorStop);
      if (colorStop !== undefined) {
        const colorIndex = gradientParts.indexOf(colorStop);
        const position = gradientParts[colorIndex + 1];
        const hint = gradientParts[colorIndex + 2];

        const stop: GradientStop = {
          color: getColor(colorStop),
          position: mapLengthPercentageOrVar(position),
          hint: mapLengthPercentageOrVar(hint),
        };

        stops.push(stop);
      }
    }
  });

  if (stops.length === 0) {
    return;
  }

  const parsedGradient: ParsedLinearGradient = {
    type: "linear",
    angle,
    sideOrCorner,
    stops,
  };
  if (isRepeating) {
    parsedGradient.repeating = true;
  }

  return parsedGradient;
};

const isSideOrCorner = (node: csstree.CssNode): node is csstree.Identifier =>
  node.type === "Identifier" && sideOrCorderIdentifiers.includes(node.name);

export const formatLinearGradient = (parsed: ParsedLinearGradient): string => {
  const direction = parsed.angle || parsed.sideOrCorner;
  const stops = formatGradientStops(parsed.stops);

  const functionName =
    parsed.repeating === true ? "repeating-linear-gradient" : "linear-gradient";

  return `${functionName}(${direction ? toValue(direction) + ", " : ""}${stops})`;
};
