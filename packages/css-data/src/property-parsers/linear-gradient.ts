import * as csstree from "css-tree";
import { cssTryParseValue } from "../parse-css-value";
import { colord } from "colord";
import {
  type InvalidValue,
  type UnitValue,
  type Unit,
  toValue,
  KeywordValue,
} from "@webstudio-is/css-engine";

interface GradientStop {
  color: string;
  position?: UnitValue;
  hint?: UnitValue;
}

interface ParsedGradient {
  angle?: UnitValue;
  sideOrCorner?: KeywordValue;
  stops: GradientStop[];
}

const sideOrCorderIdentifiers = ["to", "top", "bottom", "left", "right"];

const isColorStop = (
  node: csstree.CssNode
): node is csstree.Identifier | csstree.FunctionNode | csstree.Hash => {
  if (node.type === "Function" && colord(node.name).isValid() === true) {
    return true;
  }

  if (
    node.type === "Identifier" &&
    sideOrCorderIdentifiers.includes(node.name) === false
  ) {
    return true;
  }

  if (node.type === "Hash") {
    return true;
  }

  return false;
};

const isAngle = (node: csstree.CssNode): node is csstree.Dimension =>
  node.type === "Dimension";

const isSideOrCorner = (node: csstree.CssNode): node is csstree.Identifier =>
  node.type === "Identifier" &&
  sideOrCorderIdentifiers.includes(node.name) === true;

const isPositionOrHint = (
  node: csstree.CssNode
): node is csstree.Percentage | csstree.Dimension =>
  node.type === "Percentage" || node.type === "Dimension";

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

  let angle: UnitValue | undefined;
  let sideOrCorner: KeywordValue | undefined;
  const stops: GradientStop[] = [];
  let currentColor: string | undefined;

  csstree.walk(gradientNode, (node: csstree.CssNode) => {
    if (isAngle(node) === true) {
      angle = {
        type: "unit",
        value: Number(node.value),
        unit: node.unit as Unit,
      };
    } else if (isSideOrCorner(node) === true) {
      sideOrCorner = {
        type: "keyword",
        value: sideOrCorner
          ? `${toValue(sideOrCorner)} ${node.name}`
          : node.name,
      };
    } else if (isColorStop(node) === true) {
      currentColor = getColor(node);
      stops.push({ color: currentColor });
    } else if (isPositionOrHint(node) === true) {
      const positionOrHint = formatPositionOrHint(node);
      if (currentColor) {
        if (stops[stops.length - 1].color === currentColor) {
          if (stops[stops.length - 1].position === undefined) {
            stops[stops.length - 1].position = positionOrHint;
          } else if (stops[stops.length - 1].hint === undefined) {
            stops[stops.length - 1].hint = positionOrHint;
          } else {
            stops.push({ color: currentColor, position: positionOrHint });
          }
        } else {
          stops.push({ color: currentColor, position: positionOrHint });
        }
      } else {
        stops.push({
          color: stops[stops.length - 1]?.color || "transparent",
          position: positionOrHint,
        });
      }
    }
  });

  return {
    angle,
    sideOrCorner,
    stops,
  };
};

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

const formatPositionOrHint = (
  node: csstree.Percentage | csstree.Dimension
): UnitValue => {
  if (node.type === "Percentage") {
    return {
      type: "unit",
      value: parseFloat(node.value),
      unit: "%",
    };
  }

  return {
    type: "unit",
    value: parseFloat(node.value),
    unit: node.unit as Unit,
  };
};

export const reconstructLinearGradient = (parsed: ParsedGradient): string => {
  const direction = parsed.angle || parsed.sideOrCorner;
  const stops = parsed.stops
    .map((stop: GradientStop) => {
      let result = stop.color;
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
