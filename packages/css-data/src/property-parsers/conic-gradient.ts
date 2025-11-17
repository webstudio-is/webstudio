import * as csstree from "css-tree";
import { cssTryParseValue } from "../parse-css-value";
import {
  type UnitValue,
  type Unit,
  toValue,
  type VarValue,
} from "@webstudio-is/css-engine";
import { parseCssValue } from "../parse-css-value";
import { colord, extend } from "colord";
import namesPlugin from "colord/plugins/names";
import type {
  GradientStop,
  GradientColorValue,
  ParsedConicGradient,
} from "./types";

extend([namesPlugin]);

const angleUnitIdentifiers = ["deg", "grad", "rad", "turn"] as const;
const angleUnitSet = new Set<string>(angleUnitIdentifiers);

const isAngleUnitValue = (value: UnitValue) => angleUnitSet.has(value.unit);

const isAngleLikeFallback = (fallback: VarValue["fallback"]) => {
  if (fallback === undefined) {
    return false;
  }

  if (fallback.type === "unit") {
    return isAngleUnitValue(fallback);
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

const isVarAngle = (value: VarValue) => {
  if (isAngleLikeFallback(value.fallback)) {
    return true;
  }

  const name = value.value.toLowerCase();
  return (
    name.includes("angle") || name.includes("direction") || name.includes("deg")
  );
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

type GradientPartResult =
  | { type: "angle"; value: UnitValue | VarValue }
  | { type: "position"; value: string }
  | { type: "stop"; value: GradientStop }
  | { type: "hint"; value: GradientStop["hint"] };

const isIdentifier = (node: csstree.CssNode, value: string) =>
  node.type === "Identifier" && node.name.toLowerCase() === value;

const parseGradientPart = (
  nodes: csstree.CssNode[]
): GradientPartResult | undefined => {
  const filtered = nodes.filter((node) => node.type !== "WhiteSpace");
  if (filtered.length === 0) {
    return;
  }

  if (isIdentifier(filtered[0], "from")) {
    const angleNode = filtered[1];
    const mapped = mapLengthPercentageOrVar(angleNode);
    if (
      mapped !== undefined &&
      ((mapped.type === "unit" && isAngleUnitValue(mapped)) ||
        (mapped.type === "var" && isVarAngle(mapped)))
    ) {
      return { type: "angle", value: mapped };
    }
    return;
  }

  if (isIdentifier(filtered[0], "at")) {
    const css = filtered
      .slice(1)
      .map((item) => csstree.generate(item))
      .join(" ")
      .trim();
    if (css.length > 0) {
      return { type: "position", value: css };
    }
    return;
  }

  const colorNode = filtered.find(isColorStop);
  if (colorNode !== undefined) {
    const color = getColor(colorNode);
    const colorIndex = filtered.indexOf(colorNode);
    const positionNode = filtered[colorIndex + 1];
    const hintNode = filtered[colorIndex + 2];

    const stop: GradientStop = {
      color,
      position: mapLengthPercentageOrVar(positionNode),
      hint: mapLengthPercentageOrVar(hintNode),
    };

    return { type: "stop", value: stop };
  }

  const hint = mapLengthPercentageOrVar(filtered[0]);
  if (hint !== undefined) {
    return { type: "hint", value: hint };
  }
};

export const parseConicGradient = (
  gradient: string
): ParsedConicGradient | undefined => {
  const normalizedGradient = gradient.replace(
    /^(\s*)repeating-conic-gradient/i,
    (_match, leadingWhitespace: string) => `${leadingWhitespace}conic-gradient`
  );
  const isRepeating = normalizedGradient !== gradient;

  const ast = cssTryParseValue(normalizedGradient);
  if (ast === undefined) {
    return;
  }

  const match = csstree.lexer.match(
    "conic-gradient( [ from <angle> ]? [ at <position> ]? , <color-stop-list> )",
    ast
  );
  const containsVar = normalizedGradient.includes("var(");
  if (match.matched === null && containsVar === false) {
    return;
  }

  let angle: UnitValue | VarValue | undefined;
  let position: string | undefined;
  const stops: GradientStop[] = [];

  csstree.walk(ast, (node) => {
    if (node.type !== "Function" || node.name !== "conic-gradient") {
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

      const parsedPart = parseGradientPart(gradientParts);
      if (parsedPart !== undefined) {
        if (parsedPart.type === "angle") {
          angle = parsedPart.value;
        } else if (parsedPart.type === "position") {
          position = parsedPart.value;
        } else if (parsedPart.type === "stop") {
          stops.push(parsedPart.value);
        } else if (parsedPart.type === "hint") {
          stops.push({ hint: parsedPart.value });
        }
      }

      gradientParts = [];
    }
  });

  if (stops.length === 0) {
    return;
  }

  const parsed: ParsedConicGradient = {
    type: "conic",
    angle,
    position,
    stops,
  };
  if (isRepeating) {
    parsed.repeating = true;
  }

  return parsed;
};

export const formatConicGradient = (parsed: ParsedConicGradient): string => {
  const segments: string[] = [];
  if (parsed.angle) {
    segments.push(`from ${toValue(parsed.angle)}`);
  }
  if (parsed.position) {
    segments.push(`at ${parsed.position}`);
  }

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

  const functionName =
    parsed.repeating === true ? "repeating-conic-gradient" : "conic-gradient";
  const prefix = segments.length > 0 ? `${segments.join(" ")}, ` : "";

  return `${functionName}(${prefix}${stops})`;
};
