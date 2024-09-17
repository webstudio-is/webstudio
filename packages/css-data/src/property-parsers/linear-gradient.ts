import * as csstree from "css-tree";
import { cssTryParseValue } from "../parse-css-value";
import { colord } from "colord";
import type { InvalidValue, UnitValue, Unit } from "@webstudio-is/css-engine";

interface GradientStop {
  color: string;
  position?: string;
  hint?: string;
}

interface ParsedGradient {
  angle?: UnitValue;
  sideOrCorner?: string;
  stops: GradientStop[];
}

const sideOrCorderIdentifiers = ["to", "top", "bottom", "left", "right"];

export const parseLinearGradient = (
  gradient: string
): ParsedGradient | InvalidValue => {
  const ast = cssTryParseValue(gradient);
  if (ast === undefined) {
    return {
      type: "invalid",
      value: gradient,
    };
  }

  const match = csstree.lexer.match(
    "linear-gradient( [ <angle> | to <side-or-corner> ]? , <color-stop-list> )",
    ast
  );
  if (match.matched === null) {
    return {
      type: "invalid",
      value: gradient,
    };
  }

  const gradientNode = csstree.find(
    ast,
    (node): node is csstree.FunctionNode =>
      node.type === "Function" && node.name === "linear-gradient"
  );

  if (!gradientNode) {
    return {
      type: "invalid",
      value: gradient,
    };
  }

  const result: ParsedGradient = {
    angle: undefined,
    sideOrCorner: undefined,
    stops: [],
  };

  let currentStop: GradientStop | undefined;

  csstree.walk(gradientNode, {
    enter: (node: csstree.CssNode) => {
      if (isAngle(node)) {
        result.angle = formatAngle(node);
      } else if (isSideOrCorner(node)) {
        result.sideOrCorner = formatSideOrCorner(node, result.sideOrCorner);
      } else if (
        isColorFunction(node) ||
        isColorIdentifier(node) ||
        isHexColor(node)
      ) {
        currentStop = addNewColorStop(
          result.stops,
          currentStop,
          getColor(node)
        );
      } else if (isPositionOrHint(node)) {
        currentStop = handlePositionOrHint(
          result.stops,
          currentStop,
          formatPositionOrHint(node)
        );
      }
    },
  });

  if (currentStop) {
    result.stops.push(currentStop);
  }

  return result;
};

const isAngle = (node: csstree.CssNode): node is csstree.Dimension =>
  node.type === "Dimension";

const formatAngle = (node: csstree.Dimension): UnitValue => {
  return {
    type: "unit",
    value: Number(node.value),
    unit: node.unit as Unit,
  };
};

const isSideOrCorner = (node: csstree.CssNode): node is csstree.Identifier =>
  node.type === "Identifier" &&
  sideOrCorderIdentifiers.includes(node.name) === true;

const formatSideOrCorner = (
  node: csstree.Identifier,
  existing: string | undefined
): string => (existing ? `${existing} ${node.name}` : node.name);

const isColorFunction = (node: csstree.CssNode): node is csstree.FunctionNode =>
  node.type === "Function" && colord(node.name).isValid();

const isColorIdentifier = (node: csstree.CssNode): node is csstree.Identifier =>
  node.type === "Identifier" &&
  sideOrCorderIdentifiers.includes(node.name) === false;

const isHexColor = (node: csstree.CssNode): node is csstree.Hash =>
  node.type === "Hash";

const getColor = (
  node: csstree.FunctionNode | csstree.Identifier | csstree.Hash
): string => {
  if (node.type === "Function") {
    return csstree.generate(node);
  }
  if (node.type === "Identifier") {
    return node.name;
  }
  return colord(`#${node.value}`).toRgbString();
};

const isPositionOrHint = (
  node: csstree.CssNode
): node is csstree.Percentage | csstree.Dimension =>
  node.type === "Percentage" ||
  (node.type === "Dimension" && node.unit === "px");

const formatPositionOrHint = (
  node: csstree.Percentage | csstree.Dimension
): string => `${node.value}${node.type === "Percentage" ? "%" : "px"}`;

const addNewColorStop = (
  stops: GradientStop[],
  currentStop: GradientStop | undefined,
  color: string
): GradientStop => {
  if (currentStop && (currentStop.position || currentStop.hint)) {
    stops.push(currentStop);
  }
  return { color };
};

const handlePositionOrHint = (
  stops: GradientStop[],
  currentStop: GradientStop | undefined,
  value: string
): GradientStop => {
  if (currentStop) {
    if (currentStop.position === undefined) {
      currentStop.position = value;
    } else if (currentStop.hint === undefined) {
      currentStop.hint = value;
      if (currentStop.position) {
        stops.push(currentStop);
        return {
          color: currentStop.color,
        };
      }
    }
  } else {
    const previousColor =
      stops.length > 0 ? stops[stops.length - 1].color : "transparent";
    return { color: previousColor, position: value, hint: undefined };
  }
  return currentStop;
};

export const reconstructLinearGradient = (parsed: ParsedGradient): string => {
  const direction = parsed.angle || parsed.sideOrCorner;
  const stops = parsed.stops.map(formatGradientStop).join(", ");
  return `linear-gradient(${direction ? direction + ", " : ""}${stops})`;
};

const formatGradientStop = (stop: GradientStop): string => {
  let result = stop.color;
  if (stop.position) {
    result += ` ${stop.position}`;
  }
  if (stop.hint) {
    result += ` ${stop.hint}`;
  }
  return result;
};
