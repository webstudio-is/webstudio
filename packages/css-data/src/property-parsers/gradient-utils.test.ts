import * as csstree from "css-tree";
import { describe, expect, test } from "vitest";
import {
  forEachGradientParts,
  formatGradientStops,
  getColor,
  isAngleDimension,
  isAngleLikeFallback,
  isAngleUnit,
  isColorStop,
  isVarAngle,
  mapLengthPercentageOrVar,
  normalizeRepeatingGradient,
  parseGradientHintFromParts,
  parseGradientStopFromParts,
  withoutWhitespaceNodes,
} from "./gradient-utils";

const parseValue = (value: string) => {
  return csstree.parse(value, { context: "value" });
};

const firstValueNode = (value: string) => {
  const ast = parseValue(value);
  if (ast.type !== "Value") {
    throw new Error("Expected Value AST");
  }
  const first = ast.children.first;
  if (!first) {
    throw new Error("Expected first child node");
  }
  return first;
};

describe("gradient utils", () => {
  test("detects angle units and dimensions", () => {
    expect(isAngleUnit("deg")).toBe(true);
    expect(isAngleUnit("rad")).toBe(true);
    expect(isAngleUnit("px")).toBe(false);

    const angleNode = firstValueNode("45deg");
    expect(isAngleDimension(angleNode)).toBe(true);

    const lengthNode = firstValueNode("10px");
    expect(isAngleDimension(lengthNode)).toBe(false);
  });

  test("detects angle-like var fallbacks", () => {
    expect(isAngleLikeFallback({ type: "unit", unit: "turn", value: 1 })).toBe(
      true
    );
    expect(isAngleLikeFallback({ type: "keyword", value: "to left" })).toBe(
      true
    );
    expect(isAngleLikeFallback({ type: "unparsed", value: "10grad" })).toBe(
      true
    );
    expect(isAngleLikeFallback(undefined)).toBe(false);
    expect(isAngleLikeFallback({ type: "keyword", value: "auto" })).toBe(false);
  });

  test("detects angle-like vars by fallback or name", () => {
    expect(isVarAngle({ type: "var", value: "angle" })).toBe(true);
    expect(
      isVarAngle({
        type: "var",
        value: "custom-direction",
        fallback: { type: "keyword", value: "to right" },
      })
    ).toBe(true);
    expect(isVarAngle({ type: "var", value: "color" })).toBe(false);
  });

  test("maps units and vars", () => {
    expect(mapLengthPercentageOrVar(firstValueNode("50%"))).toEqual({
      type: "unit",
      unit: "%",
      value: 50,
    });
    expect(mapLengthPercentageOrVar(firstValueNode("12px"))).toEqual({
      type: "unit",
      unit: "px",
      value: 12,
    });
    expect(mapLengthPercentageOrVar(firstValueNode("2"))).toEqual({
      type: "unit",
      unit: "number",
      value: 2,
    });

    const varNode = firstValueNode("var(--stop)");
    expect(mapLengthPercentageOrVar(varNode)).toEqual({
      type: "var",
      value: "stop",
    });
  });

  test("reads color values and color-stop detection", () => {
    const colorNode = firstValueNode("red");
    expect(getColor(colorNode)).toEqual(
      expect.objectContaining({ type: "color" })
    );
    expect(isColorStop(colorNode)).toBe(true);

    const nonColorNode = firstValueNode("20px");
    expect(getColor(nonColorNode)).toBeUndefined();
    expect(isColorStop(nonColorNode)).toBe(false);
  });

  test("filters whitespace nodes", () => {
    let nodes: csstree.CssNode[] = [];
    const gradientAst = parseValue("linear-gradient(red 10% 20%, blue)");
    forEachGradientParts(gradientAst, "linear-gradient", (parts) => {
      if (nodes.length === 0) {
        nodes = parts;
      }
    });

    const filtered = withoutWhitespaceNodes(nodes);

    expect(nodes.length).toBeGreaterThan(0);
    expect(filtered.every((node) => node.type !== "WhiteSpace")).toBe(true);
    expect(filtered.map((node) => node.type)).toEqual(
      expect.arrayContaining(["Identifier", "Percentage", "Percentage"])
    );
  });

  test("parses a gradient stop and a hint from parts", () => {
    const stopAst = parseValue("red 10% 20%");
    if (stopAst.type !== "Value") {
      throw new Error("Expected Value AST");
    }
    const stop = parseGradientStopFromParts(
      withoutWhitespaceNodes(stopAst.children.toArray())
    );
    expect(stop).toEqual({
      color: expect.objectContaining({ type: "color" }),
      position: { type: "unit", unit: "%", value: 10 },
      hint: { type: "unit", unit: "%", value: 20 },
    });

    const hintAst = parseValue("30%");
    if (hintAst.type !== "Value") {
      throw new Error("Expected Value AST");
    }
    const hint = parseGradientHintFromParts(
      withoutWhitespaceNodes(hintAst.children.toArray())
    );
    expect(hint).toEqual({ type: "unit", unit: "%", value: 30 });
  });

  test("formats stops and normalizes repeating gradient name", () => {
    const formatted = formatGradientStops([
      {
        color: { type: "keyword", value: "red" },
        position: { type: "unit", unit: "%", value: 0 },
      },
      {
        color: { type: "keyword", value: "blue" },
        position: { type: "unit", unit: "%", value: 100 },
      },
    ]);
    expect(formatted).toBe("red 0%, blue 100%");

    expect(
      normalizeRepeatingGradient(
        "repeating-linear-gradient(red, blue)",
        "repeating-linear-gradient",
        "linear-gradient"
      )
    ).toEqual({
      normalized: "linear-gradient(red, blue)",
      isRepeating: true,
    });
  });

  test("iterates gradient parts split by commas", () => {
    const ast = parseValue("linear-gradient(45deg, red 0%, blue 100%)");
    const parts: string[] = [];
    forEachGradientParts(ast, "linear-gradient", (nodes) => {
      parts.push(
        nodes
          .map((node) => csstree.generate(node))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim()
      );
    });

    expect(parts).toEqual(["45deg", "red 0%", "blue 100%"]);
  });
});
