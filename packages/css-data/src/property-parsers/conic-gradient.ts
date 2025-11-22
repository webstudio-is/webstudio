import * as csstree from "css-tree";
import { cssTryParseValue } from "../parse-css-value";
import {
  type UnitValue,
  toValue,
  type VarValue,
} from "@webstudio-is/css-engine";
import {
  getColor,
  isAngleUnit,
  isColorStop,
  mapLengthPercentageOrVar,
  formatGradientStops,
  normalizeRepeatingGradient,
  forEachGradientParts,
} from "./gradient-utils";
import type { GradientStop, ParsedConicGradient } from "./types";

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
      ((mapped.type === "unit" && isAngleUnit(mapped.unit)) ||
        mapped.type === "var")
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
  const { normalized: normalizedGradient, isRepeating } =
    normalizeRepeatingGradient(
      gradient,
      "repeating-conic-gradient",
      "conic-gradient"
    );

  const ast = cssTryParseValue(normalizedGradient);
  if (ast === undefined) {
    return;
  }

  // css-tree grammar doesn't allow angles in color stops, so we fall back to
  // manual parsing even when the built-in matcher rejects the value.
  csstree.lexer.match(
    "conic-gradient( [ from <angle> ]? [ at <position> ]? , <color-stop-list> )",
    ast
  );

  let angle: UnitValue | VarValue | undefined;
  let position: string | undefined;
  const stops: GradientStop[] = [];

  forEachGradientParts(ast, "conic-gradient", (gradientParts) => {
    const filteredParts = gradientParts.filter(
      (node) => node.type !== "WhiteSpace"
    );
    const containsStop = filteredParts.some(isColorStop);

    let handledDirective = false;
    const fromIndex = filteredParts.findIndex((node) =>
      isIdentifier(node, "from")
    );
    if (fromIndex !== -1) {
      const angleNode = filteredParts[fromIndex + 1];
      const mapped = mapLengthPercentageOrVar(angleNode);
      if (
        mapped !== undefined &&
        ((mapped.type === "unit" && isAngleUnit(mapped.unit)) ||
          mapped.type === "var")
      ) {
        angle = mapped;
        handledDirective = true;
      }
    }

    const atIndex = filteredParts.findIndex((node) => isIdentifier(node, "at"));
    if (atIndex !== -1) {
      const css = filteredParts
        .slice(atIndex + 1)
        .map((item) => csstree.generate(item))
        .join(" ")
        .trim();
      if (css.length > 0) {
        position = css;
        handledDirective = true;
      }
    }

    if (handledDirective && containsStop === false) {
      return;
    }

    const parsedPart = parseGradientPart(filteredParts);
    if (parsedPart === undefined) {
      return;
    }
    if (parsedPart.type === "angle") {
      angle = parsedPart.value;
    } else if (parsedPart.type === "position") {
      position = parsedPart.value;
    } else if (parsedPart.type === "stop") {
      stops.push(parsedPart.value);
    } else if (parsedPart.type === "hint") {
      stops.push({ hint: parsedPart.value });
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

  const stops = formatGradientStops(parsed.stops);

  const functionName =
    parsed.repeating === true ? "repeating-conic-gradient" : "conic-gradient";
  const prefix = segments.length > 0 ? `${segments.join(" ")}, ` : "";

  return `${functionName}(${prefix}${stops})`;
};
