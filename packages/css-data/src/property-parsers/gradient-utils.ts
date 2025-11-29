import * as csstree from "css-tree";
import { parseColor, parseCssValue } from "../parse-css-value";
import {
  type UnitValue,
  type Unit,
  type VarValue,
  toValue,
} from "@webstudio-is/css-engine";
import type { GradientColorValue, GradientStop } from "./types";

export const angleUnitIdentifiers = ["deg", "grad", "rad", "turn"] as const;
const angleUnitSet = new Set<string>(angleUnitIdentifiers);

export const isAngleUnit = (unit: string): boolean => angleUnitSet.has(unit);

export const isAngleDimension = (
  node: csstree.CssNode
): node is csstree.Dimension =>
  node.type === "Dimension" && isAngleUnit(node.unit);

export const isAngleLikeFallback = (
  fallback: VarValue["fallback"]
): boolean => {
  if (fallback === undefined) {
    return false;
  }

  if (fallback.type === "unit") {
    return isAngleUnit(fallback.unit);
  }

  if (fallback.type === "keyword") {
    const normalized = fallback.value.trim().toLowerCase();
    return normalized.startsWith("to ");
  }

  if (fallback.type === "unparsed") {
    const normalized = fallback.value.trim().toLowerCase();
    if (normalized.startsWith("to ")) {
      return true;
    }
    return angleUnitIdentifiers.some((unit) => normalized.endsWith(unit));
  }

  return false;
};

export const isVarAngle = (value: VarValue): boolean => {
  if (isAngleLikeFallback(value.fallback)) {
    return true;
  }

  const name = value.value.toLowerCase();
  return (
    name.includes("angle") || name.includes("direction") || name.includes("deg")
  );
};

export const mapLengthPercentageOrVar = (
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
    } satisfies UnitValue;
  }

  if (node.type === "Number") {
    return {
      type: "unit",
      value: Number.parseFloat(node.value),
      unit: "number",
    } satisfies UnitValue;
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

export const getColor = (
  node: csstree.CssNode
): GradientColorValue | undefined => {
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
  if (
    parsed.type === "color" ||
    parsed.type === "rgb" ||
    parsed.type === "var"
  ) {
    return parsed;
  }
  return parseColor(css);
};

export const isColorStop = (node: csstree.CssNode): boolean =>
  getColor(node) !== undefined;

export const formatGradientStops = (stops: GradientStop[]): string =>
  stops
    .map((stop) => {
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

export const normalizeRepeatingGradient = (
  gradient: string,
  repeatingName: string,
  baseName: string
): {
  normalized: string;
  isRepeating: boolean;
} => {
  const pattern = new RegExp(`^(\\s*)${repeatingName}`, "i");
  const normalized = gradient.replace(
    pattern,
    (_match, leadingWhitespace: string) => `${leadingWhitespace}${baseName}`
  );
  return {
    normalized,
    isRepeating: normalized !== gradient,
  };
};

export const forEachGradientParts = (
  ast: csstree.CssNode,
  functionName: string,
  callback: (parts: csstree.CssNode[]) => void
): void => {
  csstree.walk(ast, (node) => {
    if (node.type !== "Function" || node.name !== functionName) {
      return;
    }

    let gradientParts: csstree.CssNode[] = [];
    for (const item of node.children) {
      if (item.type !== "Operator") {
        gradientParts.push(item);
      }

      const isSeparator =
        (item.type === "Operator" && item.value === ",") ||
        node.children.last === item;

      if (isSeparator === false) {
        continue;
      }

      callback(gradientParts);
      gradientParts = [];
    }
  });
};
