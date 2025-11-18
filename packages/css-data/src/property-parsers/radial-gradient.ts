import * as csstree from "css-tree";
import { cssTryParseValue } from "../parse-css-value";
import { toValue, type KeywordValue } from "@webstudio-is/css-engine";
import {
  getColor,
  isColorStop,
  mapLengthPercentageOrVar,
  formatGradientStops,
  normalizeRepeatingGradient,
  forEachGradientParts,
} from "./gradient-utils";
import type { GradientStop, ParsedRadialGradient } from "./types";

const shapeKeywords = new Set(["circle", "ellipse"]);

const isIdentifier = (node: csstree.CssNode, value: string) =>
  node.type === "Identifier" && node.name.toLowerCase() === value;

const toKeywordValue = (value: string): KeywordValue => ({
  type: "keyword",
  value,
});

const toCssText = (nodes: csstree.CssNode[]): string =>
  nodes
    .map((item) => csstree.generate(item))
    .join(" ")
    .trim();

export const parseRadialGradient = (
  gradient: string
): ParsedRadialGradient | undefined => {
  const { normalized: normalizedGradient, isRepeating } =
    normalizeRepeatingGradient(
      gradient,
      "repeating-radial-gradient",
      "radial-gradient"
    );

  const ast = cssTryParseValue(normalizedGradient);
  if (ast === undefined) {
    return;
  }

  const containsVar = normalizedGradient.includes("var(");
  let matchesGrammar = true;
  try {
    const match = csstree.lexer.match(
      "radial-gradient( [ <ending-shape> || <ending-size> ]? [ at <position> ]? , <color-stop-list> )",
      ast
    );
    matchesGrammar = match.matched !== null;
  } catch {
    // css-tree 2.3.1 does not define <ending-size>, so skip validation
    matchesGrammar = true;
  }
  if (matchesGrammar === false && containsVar === false) {
    return;
  }

  let shape: KeywordValue | undefined;
  let size: string | undefined;
  let position: string | undefined;
  const stops: GradientStop[] = [];

  forEachGradientParts(ast, "radial-gradient", (gradientParts) => {
    const filtered = gradientParts.filter((node) => node.type !== "WhiteSpace");
    if (filtered.length === 0) {
      return;
    }

    const colorStopNode = filtered.find(isColorStop);
    if (colorStopNode !== undefined) {
      const color = getColor(colorStopNode);
      const colorIndex = filtered.indexOf(colorStopNode);
      const positionNode = filtered[colorIndex + 1];
      const hintNode = filtered[colorIndex + 2];
      const stop: GradientStop = {
        color,
        position: mapLengthPercentageOrVar(positionNode),
        hint: mapLengthPercentageOrVar(hintNode),
      };
      stops.push(stop);
      return;
    }

    const directiveTokens = [...filtered];
    const atIndex = directiveTokens.findIndex((node) =>
      isIdentifier(node, "at")
    );
    if (atIndex !== -1) {
      const positionTokens = directiveTokens.slice(atIndex + 1);
      const css = toCssText(positionTokens);
      if (css.length > 0) {
        position = css;
      }
      directiveTokens.length = atIndex;
    }

    if (directiveTokens.length === 0) {
      return;
    }

    const remainderTokens: csstree.CssNode[] = [];
    for (const token of directiveTokens) {
      if (
        token.type === "Identifier" &&
        shapeKeywords.has(token.name.toLowerCase()) &&
        shape === undefined
      ) {
        shape = toKeywordValue(token.name);
        continue;
      }
      remainderTokens.push(token);
    }

    const sizeCss = toCssText(remainderTokens);
    if (sizeCss.length > 0) {
      size = sizeCss;
      return;
    }

    const hint = mapLengthPercentageOrVar(directiveTokens[0]);
    if (hint !== undefined) {
      stops.push({ hint });
    }
  });

  if (stops.length === 0) {
    return;
  }

  const parsed: ParsedRadialGradient = {
    type: "radial",
    shape,
    size,
    position,
    stops,
  };
  if (isRepeating) {
    parsed.repeating = true;
  }

  return parsed;
};

export const formatRadialGradient = (parsed: ParsedRadialGradient): string => {
  const shapeSizeParts: string[] = [];
  if (parsed.shape) {
    shapeSizeParts.push(toValue(parsed.shape));
  }
  if (parsed.size) {
    shapeSizeParts.push(parsed.size);
  }
  const descriptors: string[] = [];
  const shapeSize = shapeSizeParts.join(" ").trim();
  if (shapeSize.length > 0) {
    descriptors.push(shapeSize);
  }
  if (parsed.position) {
    descriptors.push(`at ${parsed.position}`);
  }

  const functionName =
    parsed.repeating === true ? "repeating-radial-gradient" : "radial-gradient";
  const descriptorPrefix =
    descriptors.length > 0 ? `${descriptors.join(" ")}, ` : "";
  const stops = formatGradientStops(parsed.stops);

  return `${functionName}(${descriptorPrefix}${stops})`;
};
