import { describe, expect, test } from "vitest";
import {
  toValue,
  type KeywordValue,
  type RgbValue,
  type StyleValue,
  type UnitValue,
  type VarValue,
} from "@webstudio-is/css-engine";
import type {
  GradientStop,
  ParsedLinearGradient,
  ParsedConicGradient,
  ParsedRadialGradient,
} from "@webstudio-is/css-data";
import {
  clampStopIndex,
  createSolidLinearGradient,
  detectBackgroundType,
  ensureGradientHasStops,
  fillMissingStopPositions,
  isSolidLinearGradient,
  normalizeGradientInput,
  type PercentUnitValue,
  pruneHintOverrides,
  reindexHintOverrides,
  removeHintOverride,
  resolveAngleValue,
  resolveGradientForPicker,
  resolveReverseStops,
  resolveStopHintUpdate,
  resolveStopPositionUpdate,
  setHintOverride,
  sideOrCornerToAngle,
  sortGradientStops,
  styleValueToColor,
  formatGradientForType,
  formatGradientValue,
  convertGradientToTarget,
  updateGradientStop,
  type GradientType,
} from "./gradient-utils";

const createLinearGradient = (
  overrides: Partial<ParsedLinearGradient> = {}
): ParsedLinearGradient => ({
  type: "linear",
  stops: [],
  ...overrides,
});

const createConicGradient = (
  overrides: Partial<ParsedConicGradient> = {}
): ParsedConicGradient => ({
  type: "conic",
  stops: [],
  ...overrides,
});

const createRadialGradient = (
  overrides: Partial<ParsedRadialGradient> = {}
): ParsedRadialGradient => ({
  type: "radial",
  stops: [],
  ...overrides,
});

describe("formatGradientValue", () => {
  test("formats linear gradient", () => {
    const gradient = createLinearGradient({
      stops: [
        { color: { type: "rgb", r: 0, g: 0, b: 0, alpha: 1 } },
        { color: { type: "rgb", r: 255, g: 255, b: 255, alpha: 1 } },
      ],
    });
    expect(formatGradientValue(gradient)).toBe(
      "linear-gradient(rgb(0 0 0 / 1), rgb(255 255 255 / 1))"
    );
  });

  test("formats repeating linear gradient", () => {
    const gradient = createLinearGradient({
      repeating: true,
      stops: [
        { color: { type: "rgb", r: 0, g: 0, b: 0, alpha: 1 } },
        { color: { type: "rgb", r: 255, g: 255, b: 255, alpha: 1 } },
      ],
    });
    expect(formatGradientValue(gradient)).toBe(
      "repeating-linear-gradient(rgb(0 0 0 / 1), rgb(255 255 255 / 1))"
    );
  });

  test("formats conic gradient", () => {
    const gradient = createConicGradient({
      stops: [
        { color: { type: "rgb", r: 0, g: 0, b: 0, alpha: 1 } },
        { color: { type: "rgb", r: 255, g: 255, b: 255, alpha: 1 } },
      ],
    });
    expect(formatGradientValue(gradient)).toBe(
      "conic-gradient(rgb(0 0 0 / 1), rgb(255 255 255 / 1))"
    );
  });

  test("formats repeating conic gradient", () => {
    const gradient = createConicGradient({
      repeating: true,
      stops: [
        { color: { type: "rgb", r: 0, g: 0, b: 0, alpha: 1 } },
        { color: { type: "rgb", r: 255, g: 255, b: 255, alpha: 1 } },
      ],
    });
    expect(formatGradientValue(gradient)).toBe(
      "repeating-conic-gradient(rgb(0 0 0 / 1), rgb(255 255 255 / 1))"
    );
  });

  test("formats radial gradient", () => {
    const gradient = createRadialGradient({
      shape: { type: "keyword", value: "circle" },
      size: "closest-side",
      position: "center",
      stops: [
        { color: { type: "rgb", r: 0, g: 0, b: 0, alpha: 1 } },
        { color: { type: "rgb", r: 255, g: 255, b: 255, alpha: 1 } },
      ],
    });
    expect(formatGradientValue(gradient)).toBe(
      "radial-gradient(circle closest-side at center, rgb(0 0 0 / 1), rgb(255 255 255 / 1))"
    );
  });

  test("formats repeating radial gradient", () => {
    const gradient = createRadialGradient({
      repeating: true,
      shape: { type: "keyword", value: "circle" },
      position: "center",
      stops: [
        { color: { type: "rgb", r: 0, g: 0, b: 0, alpha: 1 } },
        { color: { type: "rgb", r: 255, g: 255, b: 255, alpha: 1 } },
      ],
    });
    expect(formatGradientValue(gradient)).toBe(
      "repeating-radial-gradient(circle at center, rgb(0 0 0 / 1), rgb(255 255 255 / 1))"
    );
  });
});

describe("formatGradientForType", () => {
  const solidStyle: StyleValue = {
    type: "unparsed",
    value: "linear-gradient(red, red)",
  };

  test("formats solid color target", () => {
    expect(formatGradientForType(solidStyle, "solid")).toBe(
      "linear-gradient(rgb(255 0 0 / 1) 0%, rgb(255 0 0 / 1) 100%)"
    );
  });

  test("formats linear target", () => {
    expect(formatGradientForType(solidStyle, "linearGradient")).toBe(
      "linear-gradient(rgb(255 0 0 / 1), rgb(255 0 0 / 1))"
    );
  });

  test("formats conic target", () => {
    expect(formatGradientForType(undefined, "conicGradient")).toBe(
      "conic-gradient(rgb(0 0 0 / 1) 0%, rgb(0 0 0 / 0) 100%)"
    );
  });

  test("formats radial target", () => {
    const radialStyle: StyleValue = {
      type: "unparsed",
      value: "radial-gradient(circle at center, red, blue)",
    };
    expect(formatGradientForType(radialStyle, "radialGradient")).toBe(
      "radial-gradient(circle at center, rgb(255 0 0 / 1), rgb(0 0 255 / 1))"
    );
  });

  test("preserves repeating linear gradients", () => {
    const value: StyleValue = {
      type: "unparsed",
      value: "repeating-linear-gradient(red, blue)",
    };
    expect(formatGradientForType(value, "linearGradient")).toBe(
      "repeating-linear-gradient(rgb(255 0 0 / 1), rgb(0 0 255 / 1))"
    );
  });

  test("preserves repeating conic gradients", () => {
    const value: StyleValue = {
      type: "unparsed",
      value: "repeating-conic-gradient(red, blue)",
    };
    expect(formatGradientForType(value, "conicGradient")).toBe(
      "repeating-conic-gradient(rgb(255 0 0 / 1), rgb(0 0 255 / 1))"
    );
  });

  test("preserves repeating radial gradients", () => {
    const value: StyleValue = {
      type: "unparsed",
      value: "repeating-radial-gradient(circle, red, blue)",
    };
    expect(formatGradientForType(value, "radialGradient")).toBe(
      "repeating-radial-gradient(circle, rgb(255 0 0 / 1), rgb(0 0 255 / 1))"
    );
  });

  test("converts conic gradient to radial target", () => {
    const conicStyle: StyleValue = {
      type: "unparsed",
      value: "conic-gradient(red, blue)",
    };
    expect(formatGradientForType(conicStyle, "radialGradient")).toBe(
      "radial-gradient(rgb(255 0 0 / 1), rgb(0 0 255 / 1))"
    );
  });
});

describe("convertGradientToTarget", () => {
  const gradientStrings: Record<GradientType, string> = {
    linear: "linear-gradient(red 0%, blue 100%)",
    conic: "conic-gradient(red 0%, blue 100%)",
    radial: "radial-gradient(circle, red 0%, blue 100%)",
  };
  const gradientTypes: GradientType[] = ["linear", "conic", "radial"];

  const getStopColors = (stops: GradientStop[]) =>
    stops
      .map((stop) => stop.color)
      .filter(
        (color): color is NonNullable<typeof color> => color !== undefined
      )
      .map((color) => toValue(color));

  const expectedColorValues = ["rgb(255 0 0 / 1)", "rgb(0 0 255 / 1)"];

  gradientTypes.forEach((sourceType) => {
    gradientTypes.forEach((targetType) => {
      test(`converts ${sourceType} gradient to ${targetType}`, () => {
        const styleValue: StyleValue = {
          type: "unparsed",
          value: gradientStrings[sourceType],
        };
        const converted = convertGradientToTarget(styleValue, targetType);
        expect(converted.type).toBe(targetType);
        expect(converted.stops).toHaveLength(expectedColorValues.length);
        expect(getStopColors(converted.stops)).toEqual(expectedColorValues);
      });
    });
  });

  test.each(gradientTypes)(
    "creates default gradient when value missing for %s target",
    (target) => {
      const converted = convertGradientToTarget(undefined, target);
      expect(converted.type).toBe(target);
      expect(converted.stops.length).toBeGreaterThan(0);
    }
  );

  test.each(gradientTypes)(
    "preserves repeating flag when converting to %s",
    (target) => {
      const styleValue: StyleValue = {
        type: "unparsed",
        value: "repeating-linear-gradient(red 0%, blue 100%)",
      };
      const converted = convertGradientToTarget(styleValue, target);
      expect(converted.repeating).toBe(true);
    }
  );

  test.each(gradientTypes)(
    "omits repeating flag when source is not repeating for %s target",
    (target) => {
      const styleValue: StyleValue = {
        type: "unparsed",
        value: "linear-gradient(red 0%, blue 100%)",
      };
      const converted = convertGradientToTarget(styleValue, target);
      expect(converted.repeating).toBeUndefined();
    }
  );
});
describe("normalizeGradientInput", () => {
  test("returns string unchanged when not repeating", () => {
    const input = "linear-gradient(red, blue)";
    expect(normalizeGradientInput(input, "linear")).toEqual({
      normalizedGradientString: input,
      initialIsRepeating: false,
    });
  });

  test("normalizes repeating gradients", () => {
    const input = "  repeating-linear-gradient(red, blue)";
    expect(normalizeGradientInput(input, "linear")).toEqual({
      normalizedGradientString: "  linear-gradient(red, blue)",
      initialIsRepeating: true,
    });
  });

  test("handles uppercase repeating gradients while preserving leading whitespace", () => {
    const input = "\tRePeAtInG-Linear-GrAdIeNt(red, blue)";
    expect(normalizeGradientInput(input, "linear")).toEqual({
      normalizedGradientString: "\tlinear-gradient(red, blue)",
      initialIsRepeating: true,
    });
  });

  test("normalizes repeating conic gradients", () => {
    const input = "repeating-conic-gradient(red, blue)";
    expect(normalizeGradientInput(input, "conic")).toEqual({
      normalizedGradientString: "conic-gradient(red, blue)",
      initialIsRepeating: true,
    });
  });

  test("normalizes repeating radial gradients", () => {
    const input = " repeating-radial-gradient(red, blue)";
    expect(normalizeGradientInput(input, "radial")).toEqual({
      normalizedGradientString: " radial-gradient(red, blue)",
      initialIsRepeating: true,
    });
  });
});

describe("sideOrCornerToAngle", () => {
  test("returns angle for single direction", () => {
    const keyword: KeywordValue = { type: "keyword", value: "to top" };
    expect(sideOrCornerToAngle(keyword)).toBe(0);
  });

  test("returns angle for right side", () => {
    const keyword: KeywordValue = { type: "keyword", value: "to right" };
    expect(sideOrCornerToAngle(keyword)).toBe(90);
  });

  test("returns angle for bottom side", () => {
    const keyword: KeywordValue = { type: "keyword", value: "to bottom" };
    expect(sideOrCornerToAngle(keyword)).toBe(180);
  });

  test("returns angle for left side", () => {
    const keyword: KeywordValue = { type: "keyword", value: "to left" };
    expect(sideOrCornerToAngle(keyword)).toBe(270);
  });

  test("returns angle for corner", () => {
    const keyword: KeywordValue = { type: "keyword", value: "to bottom right" };
    expect(sideOrCornerToAngle(keyword)).toBe(135);
  });

  test("returns angle for top right corner", () => {
    const keyword: KeywordValue = { type: "keyword", value: "to top right" };
    expect(sideOrCornerToAngle(keyword)).toBe(45);
  });

  test("returns angle for top left corner", () => {
    const keyword: KeywordValue = { type: "keyword", value: "to top left" };
    expect(sideOrCornerToAngle(keyword)).toBe(315);
  });

  test("returns angle for bottom left corner", () => {
    const keyword: KeywordValue = { type: "keyword", value: "to bottom left" };
    expect(sideOrCornerToAngle(keyword)).toBe(225);
  });

  test("returns undefined for invalid input", () => {
    const keyword: KeywordValue = { type: "keyword", value: "center" };
    expect(sideOrCornerToAngle(keyword)).toBeUndefined();
  });

  test("returns undefined when side or corner missing", () => {
    expect(sideOrCornerToAngle(undefined)).toBeUndefined();
  });

  test("returns undefined when no direction tokens provided", () => {
    const keyword: KeywordValue = { type: "keyword", value: "to    " };
    expect(sideOrCornerToAngle(keyword)).toBeUndefined();
  });

  test("returns undefined for unrecognized corner combination", () => {
    const keyword: KeywordValue = { type: "keyword", value: "to top bottom" };
    expect(sideOrCornerToAngle(keyword)).toBeUndefined();
  });
});

describe("resolveAngleValue", () => {
  test("returns unit angles", () => {
    const styleValue: StyleValue = { type: "unit", unit: "deg", value: 120 };
    const result = resolveAngleValue(styleValue);
    expect(result).toEqual({ type: "unit", unit: "deg", value: 120 });
    expect(result).not.toBe(styleValue);
  });

  test("returns cloned var angles", () => {
    const fallback: VarValue["fallback"] = {
      type: "unit",
      unit: "deg",
      value: 45,
    };
    const styleValue: StyleValue = {
      type: "var",
      value: "angle",
      fallback,
    };
    const result = resolveAngleValue(styleValue);
    expect(result?.type).toBe("var");
    if (result?.type !== "var") {
      throw new Error("Expected var angle");
    }
    expect(result).not.toBe(styleValue);
    expect(result.value).toBe("angle");
    expect(result.fallback).toEqual(fallback);
    expect(result.fallback).not.toBe(styleValue.fallback);
  });

  test("returns undefined for non-angle values", () => {
    const styleValue: StyleValue = { type: "keyword", value: "auto" };
    expect(resolveAngleValue(styleValue)).toBeUndefined();
  });
});

describe("fillMissingStopPositions", () => {
  test("returns original gradient when no stops present", () => {
    const gradient = createLinearGradient();
    expect(fillMissingStopPositions(gradient)).toBe(gradient);
  });

  test("returns original gradient when positions use non-percent units", () => {
    const gradient = createLinearGradient({
      stops: [
        { color: undefined, position: { type: "unit", unit: "px", value: 10 } },
        { color: undefined },
      ],
    });

    expect(fillMissingStopPositions(gradient)).toBe(gradient);
  });

  test("assigns zero to a single stop without position", () => {
    const gradient = createLinearGradient({
      stops: [{ color: undefined }],
    });

    const result = fillMissingStopPositions(gradient);
    expect(result).not.toBe(gradient);
    expect(result.stops[0]?.position).toEqual({
      type: "unit",
      unit: "%",
      value: 0,
    });
  });

  test("distributes positions evenly when all positions missing", () => {
    const gradient = createLinearGradient({
      stops: [{ color: undefined }, { color: undefined }, { color: undefined }],
    });

    const result = fillMissingStopPositions(gradient);
    expect(result.stops.map((stop) => stop.position?.value)).toEqual([
      0, 50, 100,
    ]);
  });

  test("fills missing positions proportionally", () => {
    const gradient = createLinearGradient({
      stops: [
        { color: undefined, position: { type: "unit", unit: "%", value: 0 } },
        { color: undefined },
        { color: undefined, position: { type: "unit", unit: "%", value: 100 } },
      ],
    });

    const result = fillMissingStopPositions(gradient);
    expect(result.stops[1]?.position).toEqual({
      type: "unit",
      unit: "%",
      value: 50,
    });
  });

  test("returns original gradient when positions use css variables", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: undefined,
          position: {
            type: "var",
            value: "start",
            fallback: { type: "unparsed", value: "10%" },
          },
        },
        {
          color: undefined,
          position: { type: "unit", unit: "%", value: 100 },
        },
      ],
    });

    expect(fillMissingStopPositions(gradient)).toBe(gradient);
  });

  test("fills missing start and end positions when interior stops defined", () => {
    const gradient = createLinearGradient({
      stops: [
        { color: undefined },
        { color: undefined, position: { type: "unit", unit: "%", value: 20 } },
        { color: undefined },
        { color: undefined, position: { type: "unit", unit: "%", value: 80 } },
        { color: undefined },
      ],
    });

    const result = fillMissingStopPositions(gradient);
    expect(result.stops.map((stop) => stop.position?.value)).toEqual([
      0, 20, 50, 80, 100,
    ]);
  });

  test("leaves gradients unchanged when positions are defined", () => {
    const gradient = createLinearGradient({
      stops: [
        { color: undefined, position: { type: "unit", unit: "%", value: 0 } },
        { color: undefined, position: { type: "unit", unit: "%", value: 100 } },
      ],
    });

    expect(fillMissingStopPositions(gradient)).toBe(gradient);
  });
});

describe("ensureGradientHasStops", () => {
  test("provides default stops when gradient is empty", () => {
    const gradient = createLinearGradient();
    const result = ensureGradientHasStops(gradient);
    expect(result.stops).toHaveLength(2);
    expect(result.stops[0]?.color).toEqual({
      type: "color",
      colorSpace: "srgb",
      components: [0, 0, 0],
      alpha: 1,
    });
    expect(result.stops[1]?.color).toEqual({
      type: "color",
      colorSpace: "srgb",
      components: [0, 0, 0],
      alpha: 0,
    });
  });

  test("fills missing colors with fallback", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: undefined,
          position: { type: "unit", unit: "%", value: 0 },
        },
      ],
    });

    const result = ensureGradientHasStops(gradient);
    expect(result.stops[0]?.color).toEqual({
      type: "color",
      colorSpace: "srgb",
      components: [0, 0, 0],
      alpha: 1,
    });
  });

  test("preserves existing stop colors", () => {
    const stop: GradientStop = {
      color: { type: "rgb", r: 10, g: 20, b: 30, alpha: 0.5 },
      position: { type: "unit", unit: "%", value: 10 },
    };
    const gradient = createLinearGradient({
      stops: [stop],
    });

    const result = ensureGradientHasStops(gradient);
    expect(result).not.toBe(gradient);
    expect(result.stops[0]).toBe(stop);
  });
});

describe("clampStopIndex", () => {
  const gradient = createLinearGradient({
    stops: [
      { color: undefined, position: undefined },
      { color: undefined, position: undefined },
    ],
  });

  test("clamps to valid range", () => {
    expect(clampStopIndex(-1, gradient)).toBe(0);
    expect(clampStopIndex(1, gradient)).toBe(1);
    expect(clampStopIndex(5, gradient)).toBe(1);
  });

  test("returns zero when gradient has no stops", () => {
    const emptyGradient = createLinearGradient();
    expect(clampStopIndex(3, emptyGradient)).toBe(0);
  });
});

describe("styleValueToColor", () => {
  type IntermediateColorValue = { type: "intermediate"; value: string };

  test("returns undefined when style value missing", () => {
    expect(styleValueToColor(undefined)).toBeUndefined();
  });

  test("returns rgb value when style already rgb", () => {
    const style: RgbValue = { type: "rgb", r: 1, g: 2, b: 3, alpha: 0.5 };
    expect(styleValueToColor(style)).toBe(style);
  });

  test("parses keyword colors", () => {
    const style: StyleValue = { type: "keyword", value: "red" };
    expect(styleValueToColor(style)).toEqual({ type: "keyword", value: "red" });
  });

  test("returns undefined when keyword is not recognized", () => {
    const style: StyleValue = { type: "keyword", value: "not-a-color" };
    expect(styleValueToColor(style)).toBeUndefined();
  });

  test("parses intermediate string colors", () => {
    const style: IntermediateColorValue = {
      type: "intermediate",
      value: "#0000ff",
    };
    expect(styleValueToColor(style)).toEqual({
      type: "color",
      colorSpace: "srgb",
      components: [0, 0, 1],
      alpha: 1,
    });
  });

  test("returns undefined when intermediate string is invalid", () => {
    const style: IntermediateColorValue = {
      type: "intermediate",
      value: "#ggg",
    };
    expect(styleValueToColor(style)).toBeUndefined();
  });

  test("parses invalid style when value is valid color string", () => {
    const style: StyleValue = { type: "invalid", value: "rgb(10 20 30)" };
    expect(styleValueToColor(style)).toEqual({
      type: "color",
      colorSpace: "srgb",
      components: [0.0392, 0.0784, 0.1176],
      alpha: 1,
    });
  });

  test("returns undefined for invalid style when value is not a color", () => {
    const style: StyleValue = { type: "invalid", value: "oops" };
    expect(styleValueToColor(style)).toBeUndefined();
  });

  test("parses unparsed color strings", () => {
    const style: StyleValue = {
      type: "unparsed",
      value: "hsl(180 100% 50%)",
    };
    expect(styleValueToColor(style)).toEqual({
      type: "color",
      colorSpace: "hsl",
      components: [180, 100, 50],
      alpha: 1,
    });
  });

  test("returns var values", () => {
    const variable: StyleValue = { type: "var", value: "--color" };
    expect(styleValueToColor(variable)).toEqual(variable);
  });

  test("parses intermediate string var values", () => {
    const style: IntermediateColorValue = {
      type: "intermediate",
      value: "var(--accent-color)",
    };
    expect(styleValueToColor(style)).toEqual({
      type: "var",
      value: "accent-color",
    });
  });

  test("returns undefined for unsupported values", () => {
    const style: StyleValue = { type: "unit", unit: "%", value: 25 };
    expect(styleValueToColor(style)).toBeUndefined();
  });
});

describe("resolveStopHintUpdate", () => {
  test("returns cloned var hint and requests override clear", () => {
    const fallback: StyleValue = { type: "unparsed", value: "20%" };
    const styleValue: StyleValue = {
      type: "var",
      value: "hint",
      fallback,
    };

    const result = resolveStopHintUpdate(styleValue);

    expect(result.type).toBe("apply");
    if (result.type !== "apply") {
      throw new Error("Expected apply result");
    }
    expect(result).toEqual({
      type: "apply",
      hint: {
        type: "var",
        value: "hint",
        fallback: { type: "unparsed", value: "20%" },
      },
      clearOverride: true,
    });
    expect(result.override).toBeUndefined();
    if (result.hint?.type === "var") {
      expect(result.hint).not.toBe(styleValue);
      expect(result.hint.fallback).not.toBe(styleValue.fallback);
    }
  });

  test("normalizes percent units and returns override", () => {
    const styleValue: StyleValue = { type: "unit", unit: "%", value: 45 };

    const result = resolveStopHintUpdate(styleValue);

    expect(result.type).toBe("apply");
    if (result.type !== "apply") {
      throw new Error("Expected apply result");
    }
    // Value is clamped between 0-100
    expect(result).toEqual({
      type: "apply",
      hint: { type: "unit", unit: "%", value: 45 },
      override: { type: "unit", unit: "%", value: 45 },
      clearOverride: false,
    });
  });

  test("returns none when value unsupported", () => {
    const styleValue: StyleValue = { type: "keyword", value: "auto" };

    const result = resolveStopHintUpdate(styleValue);

    expect(result).toEqual({ type: "none" });
  });
});

describe("resolveStopPositionUpdate", () => {
  test("returns cloned var position and requests override clear", () => {
    const fallback: StyleValue = { type: "unparsed", value: "30%" };
    const styleValue: StyleValue = {
      type: "var",
      value: "pos",
      fallback,
    };

    const result = resolveStopPositionUpdate(styleValue);

    expect(result.type).toBe("apply");
    if (result.type !== "apply") {
      throw new Error("Expected apply result");
    }
    expect(result.clearHintOverrides).toBe(true);
    expect(result.position).toEqual({
      type: "var",
      value: "pos",
      fallback: { type: "unparsed", value: "30%" },
    });
    if (result.position?.type === "var") {
      expect(result.position).not.toBe(styleValue);
      expect(result.position.fallback).not.toBe(styleValue.fallback);
    }
  });

  test("normalizes percent unit and requests override clear", () => {
    const normalized: PercentUnitValue = {
      type: "unit",
      unit: "%",
      value: 100,
    };

    const result = resolveStopPositionUpdate({
      type: "unit",
      unit: "%",
      value: 120,
    });

    expect(result.type).toBe("apply");
    if (result.type !== "apply") {
      throw new Error("Expected apply result");
    }
    expect(result.position).toEqual(normalized);
    expect(result.clearHintOverrides).toBe(true);
  });

  test("returns none when value unsupported", () => {
    const result = resolveStopPositionUpdate({
      type: "keyword",
      value: "auto",
    });

    expect(result).toEqual({ type: "none" });
  });
});

describe("resolveReverseStops", () => {
  test("returns none when gradient has single stop", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: { type: "rgb", r: 0, g: 0, b: 0, alpha: 1 },
          position: { type: "unit", unit: "%", value: 0 },
        },
      ],
    });

    const result = resolveReverseStops(gradient, 0);
    expect(result).toEqual({ type: "none" });
  });

  test("reverses stops and mirrors percent positions", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: { type: "rgb", r: 0, g: 0, b: 0, alpha: 1 },
          position: { type: "unit", unit: "%", value: 0 },
        },
        {
          color: { type: "rgb", r: 255, g: 255, b: 255, alpha: 1 },
          position: { type: "unit", unit: "%", value: 40 },
        },
        {
          color: { type: "rgb", r: 100, g: 100, b: 100, alpha: 1 },
          position: { type: "unit", unit: "%", value: 90 },
        },
      ],
    });

    const result = resolveReverseStops(gradient, 1);
    expect(result.type).toBe("apply");
    if (result.type !== "apply") {
      throw new Error("Expected apply result");
    }
    expect(result.selectedStopIndex).toBe(1);
    const positions = result.gradient.stops.map((stop) => stop.position);
    expect(positions).toEqual([
      { type: "unit", unit: "%", value: 10 },
      { type: "unit", unit: "%", value: 60 },
      { type: "unit", unit: "%", value: 100 },
    ]);
  });

  test("preserves non-percent positions when reversing", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: undefined,
          position: { type: "unit", unit: "px", value: 10 },
        },
        {
          color: undefined,
          position: { type: "var", value: "progress" },
        },
      ],
    });

    const result = resolveReverseStops(gradient, 0);
    expect(result.type).toBe("apply");
    if (result.type !== "apply") {
      throw new Error("Expected apply result");
    }
    const [first, second] = result.gradient.stops;
    expect(first.position).toEqual({ type: "var", value: "progress" });
    expect(second.position).toEqual({ type: "unit", unit: "px", value: 10 });
  });
});

describe("resolveGradientForPicker", () => {
  test("fills missing stop positions without overrides", () => {
    const gradient = createLinearGradient({
      stops: [{ color: undefined }, { color: undefined }, { color: undefined }],
    });

    const result = resolveGradientForPicker(gradient, new Map());

    expect(result.stops.map((stop) => stop.position?.value)).toEqual([
      0, 50, 100,
    ]);
  });

  test("applies overrides when hints missing", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: undefined,
          position: { type: "unit", unit: "%", value: 0 },
        },
        {
          color: undefined,
          position: { type: "unit", unit: "%", value: 50 },
        },
      ],
    });

    const overrides = new Map<number, PercentUnitValue>([
      [1, { type: "unit", unit: "%", value: 25 }],
    ]);

    const result = resolveGradientForPicker(gradient, overrides);

    expect(result.stops[1]?.hint).toEqual({
      type: "unit",
      unit: "%",
      value: 25,
    });
  });

  test("leaves existing hints untouched", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: undefined,
          position: { type: "unit", unit: "%", value: 0 },
        },
        {
          color: undefined,
          position: { type: "unit", unit: "%", value: 100 },
          hint: { type: "unit", unit: "%", value: 60 },
        },
      ],
    });

    const overrides = new Map<number, PercentUnitValue>([
      [1, { type: "unit", unit: "%", value: 80 }],
    ]);

    const result = resolveGradientForPicker(gradient, overrides);

    expect(result.stops[1]?.hint).toEqual({
      type: "unit",
      unit: "%",
      value: 60,
    });
  });

  test("resolves variable stop positions using fallback", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: undefined,
          position: {
            type: "var",
            value: "--progress",
            fallback: { type: "unit", unit: "%", value: 30 },
          },
        },
        {
          color: undefined,
          position: { type: "unit", unit: "%", value: 100 },
        },
      ],
    });

    const result = resolveGradientForPicker(gradient, new Map());

    expect(result.stops[0]?.position).toEqual({
      type: "unit",
      unit: "%",
      value: 30,
    });
  });

  test("falls back to inferred positions when variable has no fallback", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: undefined,
          position: { type: "var", value: "--start" },
        },
        {
          color: undefined,
        },
      ],
    });

    const result = resolveGradientForPicker(gradient, new Map());

    expect(result.stops.map((stop) => stop.position?.value)).toEqual([0, 100]);
  });

  test("converts conic stop angles to percents", () => {
    const gradient = createConicGradient({
      stops: [
        {
          color: undefined,
          position: { type: "unit", unit: "deg", value: 0 },
        },
        {
          color: undefined,
          position: { type: "unit", unit: "deg", value: 120 },
        },
        {
          color: undefined,
          position: { type: "unit", unit: "deg", value: 240 },
        },
      ],
    });

    const result = resolveGradientForPicker(gradient, new Map());

    const stopPositions = result.stops.map((stop) => stop.position);
    expect(stopPositions[0]).toEqual({
      type: "unit",
      unit: "%",
      value: 0,
    });
    expect(stopPositions[1]).toEqual({
      type: "unit",
      unit: "%",
      value: (120 / 360) * 100,
    });
    expect(stopPositions[2]).toEqual({
      type: "unit",
      unit: "%",
      value: (240 / 360) * 100,
    });
  });

  test("converts conic hints expressed in angles", () => {
    const gradient = createConicGradient({
      stops: [
        {
          color: undefined,
          position: { type: "unit", unit: "%", value: 0 },
          hint: { type: "unit", unit: "turn", value: 0.25 },
        },
        {
          color: undefined,
          position: { type: "unit", unit: "%", value: 100 },
        },
      ],
    });

    const result = resolveGradientForPicker(gradient, new Map());
    const firstHint = result.stops[0]?.hint;
    expect(firstHint).toEqual({
      type: "unit",
      unit: "%",
      value: 25,
    });
  });
});

describe("hint override helpers", () => {
  const makeOverride = (value: number): PercentUnitValue => ({
    type: "unit",
    unit: "%",
    value,
  });

  test("removeHintOverride returns same map when index missing", () => {
    const overrides = new Map<number, PercentUnitValue>();
    const result = removeHintOverride(overrides, 1);
    expect(result).toBe(overrides);
  });

  test("removeHintOverride removes matching index", () => {
    const overrides = new Map<number, PercentUnitValue>([
      [1, makeOverride(10)],
    ]);
    const result = removeHintOverride(overrides, 1);
    expect(result).not.toBe(overrides);
    expect(result.size).toBe(0);
  });

  test("setHintOverride adds new override without mutating original map", () => {
    const overrides = new Map<number, PercentUnitValue>();
    const override = makeOverride(40);
    const result = setHintOverride(overrides, 2, override);
    expect(result).not.toBe(overrides);
    expect(result.get(2)).toBe(override);
    expect(overrides.size).toBe(0);
  });

  test("setHintOverride returns same map when override unchanged", () => {
    const override = makeOverride(60);
    const overrides = new Map<number, PercentUnitValue>([[3, override]]);
    const result = setHintOverride(overrides, 3, { ...override });
    expect(result).toBe(overrides);
  });

  test("pruneHintOverrides removes indexes beyond stop count", () => {
    const overrides = new Map<number, PercentUnitValue>([
      [0, makeOverride(10)],
      [5, makeOverride(90)],
    ]);
    const result = pruneHintOverrides(overrides, 2);
    expect(result).not.toBe(overrides);
    expect([...result.keys()]).toEqual([0]);
  });

  test("pruneHintOverrides returns same map when nothing pruned", () => {
    const overrides = new Map<number, PercentUnitValue>([
      [0, makeOverride(10)],
      [1, makeOverride(20)],
    ]);
    const result = pruneHintOverrides(overrides, 3);
    expect(result).toBe(overrides);
  });
});

describe("createSolidLinearGradient", () => {
  test("duplicates color stops at 0% and 100% while preserving base geometry", () => {
    const color: GradientStop["color"] = {
      type: "rgb",
      r: 120,
      g: 80,
      b: 200,
      alpha: 0.7,
    } satisfies RgbValue;
    const baseAngle = {
      type: "unit",
      unit: "deg",
      value: 45,
    } satisfies UnitValue;
    const baseSide: KeywordValue = { type: "keyword", value: "to bottom" };
    const baseGradient = createLinearGradient({
      angle: baseAngle,
      sideOrCorner: baseSide,
    });

    const result = createSolidLinearGradient(color, baseGradient);

    expect(result.type).toBe("linear");
    expect(result.angle).toBe(baseAngle);
    expect(result.sideOrCorner).toBe(baseSide);
    expect(result.stops).toHaveLength(2);

    const [firstStop, secondStop] = result.stops;
    expect(firstStop?.position).toEqual({
      type: "unit",
      unit: "%",
      value: 0,
    });
    expect(secondStop?.position).toEqual({
      type: "unit",
      unit: "%",
      value: 100,
    });
    expect(firstStop?.color).toEqual(color);
    expect(secondStop?.color).toEqual(color);
    expect(firstStop?.color).not.toBe(color);
    expect(secondStop?.color).not.toBe(color);
  });

  test("clones var color fallbacks for each stop", () => {
    const fallback: RgbValue = {
      type: "rgb",
      r: 10,
      g: 40,
      b: 90,
      alpha: 1,
    };
    const color: VarValue = {
      type: "var",
      value: "--accent",
      fallback,
    };

    const result = createSolidLinearGradient(color as GradientStop["color"]);
    const [firstStop, secondStop] = result.stops;
    const firstColor = firstStop?.color;
    const secondColor = secondStop?.color;

    expect(firstColor).toEqual(color);
    expect(secondColor).toEqual(color);
    expect(firstColor).not.toBe(color);
    expect(secondColor).not.toBe(color);

    if (firstColor?.type !== "var" || secondColor?.type !== "var") {
      throw new Error("Expected var colors to be cloned");
    }

    expect(firstColor.fallback).toEqual(fallback);
    expect(secondColor.fallback).toEqual(fallback);
    expect(firstColor.fallback).not.toBe(fallback);
    expect(secondColor.fallback).not.toBe(fallback);
    expect(firstColor.fallback).not.toBe(secondColor.fallback);
  });
});

describe("isSolidLinearGradient", () => {
  test("returns true for valid solid gradient (2 stops, same color, 0% and 100%)", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
          position: { type: "unit", unit: "%", value: 0 },
        },
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
          position: { type: "unit", unit: "%", value: 100 },
        },
      ],
    });

    expect(isSolidLinearGradient(gradient)).toBe(true);
  });

  test("returns false when gradient has only 1 stop", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
          position: { type: "unit", unit: "%", value: 0 },
        },
      ],
    });

    expect(isSolidLinearGradient(gradient)).toBe(false);
  });

  test("returns false when gradient has 3 stops", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
          position: { type: "unit", unit: "%", value: 0 },
        },
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
          position: { type: "unit", unit: "%", value: 50 },
        },
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
          position: { type: "unit", unit: "%", value: 100 },
        },
      ],
    });

    expect(isSolidLinearGradient(gradient)).toBe(false);
  });

  test("returns false when stops have different colors", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
          position: { type: "unit", unit: "%", value: 0 },
        },
        {
          color: { type: "rgb", r: 0, g: 0, b: 255, alpha: 1 },
          position: { type: "unit", unit: "%", value: 100 },
        },
      ],
    });

    expect(isSolidLinearGradient(gradient)).toBe(false);
  });

  test("returns false when first stop position is not 0%", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
          position: { type: "unit", unit: "%", value: 10 },
        },
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
          position: { type: "unit", unit: "%", value: 100 },
        },
      ],
    });

    expect(isSolidLinearGradient(gradient)).toBe(false);
  });

  test("returns false when second stop position is not 100%", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
          position: { type: "unit", unit: "%", value: 0 },
        },
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
          position: { type: "unit", unit: "%", value: 90 },
        },
      ],
    });

    expect(isSolidLinearGradient(gradient)).toBe(false);
  });

  test("returns true when first stop has no position (defaults to 0%)", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
        },
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
          position: { type: "unit", unit: "%", value: 100 },
        },
      ],
    });

    expect(isSolidLinearGradient(gradient)).toBe(true);
  });

  test("returns true when second stop has no position (defaults to 100%)", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
          position: { type: "unit", unit: "%", value: 0 },
        },
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
        },
      ],
    });

    expect(isSolidLinearGradient(gradient)).toBe(true);
  });

  test("returns false when positions use px unit instead of %", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
          position: { type: "unit", unit: "px", value: 0 },
        },
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
          position: { type: "unit", unit: "px", value: 100 },
        },
      ],
    });

    expect(isSolidLinearGradient(gradient)).toBe(false);
  });

  test("returns false when first stop color is undefined", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          position: { type: "unit", unit: "%", value: 0 },
        },
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
          position: { type: "unit", unit: "%", value: 100 },
        },
      ],
    });

    expect(isSolidLinearGradient(gradient)).toBe(false);
  });

  test("returns false when second stop color is undefined", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
          position: { type: "unit", unit: "%", value: 0 },
        },
        {
          position: { type: "unit", unit: "%", value: 100 },
        },
      ],
    });

    expect(isSolidLinearGradient(gradient)).toBe(false);
  });

  test("returns true when colors match with different alpha values", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: { type: "rgb", r: 100, g: 150, b: 200, alpha: 0.5 },
          position: { type: "unit", unit: "%", value: 0 },
        },
        {
          color: { type: "rgb", r: 100, g: 150, b: 200, alpha: 0.5 },
          position: { type: "unit", unit: "%", value: 100 },
        },
      ],
    });

    expect(isSolidLinearGradient(gradient)).toBe(true);
  });

  test("returns false when colors have same RGB but different alpha", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: { type: "rgb", r: 100, g: 150, b: 200, alpha: 0.5 },
          position: { type: "unit", unit: "%", value: 0 },
        },
        {
          color: { type: "rgb", r: 100, g: 150, b: 200, alpha: 1 },
          position: { type: "unit", unit: "%", value: 100 },
        },
      ],
    });

    expect(isSolidLinearGradient(gradient)).toBe(false);
  });

  test("returns true for keyword colors that match", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: { type: "keyword", value: "red" },
          position: { type: "unit", unit: "%", value: 0 },
        },
        {
          color: { type: "keyword", value: "red" },
          position: { type: "unit", unit: "%", value: 100 },
        },
      ],
    });

    expect(isSolidLinearGradient(gradient)).toBe(true);
  });

  test("returns false when positions use var values", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
          position: {
            type: "var",
            value: "--start",
            fallback: { type: "unit", unit: "%", value: 0 },
          },
        },
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
          position: { type: "unit", unit: "%", value: 100 },
        },
      ],
    });

    expect(isSolidLinearGradient(gradient)).toBe(false);
  });

  test("returns true when both positions are undefined (auto-assigned 0% and 100%)", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
        },
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
        },
      ],
    });

    expect(isSolidLinearGradient(gradient)).toBe(true);
  });

  test("returns true when first position is undefined and second is 100%", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
        },
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
          position: { type: "unit", unit: "%", value: 100 },
        },
      ],
    });

    expect(isSolidLinearGradient(gradient)).toBe(true);
  });

  test("returns true when first position is 0% and second is undefined", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
          position: { type: "unit", unit: "%", value: 0 },
        },
        {
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
        },
      ],
    });

    expect(isSolidLinearGradient(gradient)).toBe(true);
  });
});

describe("detectBackgroundType", () => {
  test("returns image when style value undefined", () => {
    expect(detectBackgroundType(undefined)).toBe("image");
  });

  test("returns image for keyword none", () => {
    const value: StyleValue = { type: "keyword", value: "none" };
    expect(detectBackgroundType(value)).toBe("image");
  });

  test("returns image for url image value", () => {
    const value: StyleValue = {
      type: "image",
      value: { type: "url", url: "https://example.com/image.png" },
    };
    expect(detectBackgroundType(value)).toBe("image");
  });

  test("returns linearGradient for linear gradient", () => {
    const value: StyleValue = {
      type: "unparsed",
      value: "linear-gradient(red, blue)",
    };
    expect(detectBackgroundType(value)).toBe("linearGradient");
  });

  test("returns solid for uniform linear gradient with explicit positions", () => {
    const value: StyleValue = {
      type: "unparsed",
      value: "linear-gradient(red 0%, red 100%)",
    };
    expect(detectBackgroundType(value)).toBe("solid");
  });

  test("returns solid for uniform gradient without explicit positions", () => {
    const value: StyleValue = {
      type: "unparsed",
      value: "linear-gradient(red, red)",
    };
    expect(detectBackgroundType(value)).toBe("solid");
  });

  test("returns conicGradient for conic gradient", () => {
    const value: StyleValue = {
      type: "unparsed",
      value: "conic-gradient(red, blue)",
    };
    expect(detectBackgroundType(value)).toBe("conicGradient");
  });

  test("returns conicGradient for conic gradients with from/at syntax", () => {
    const value: StyleValue = {
      type: "unparsed",
      value:
        "conic-gradient(from 0deg at 50% 50%, rgba(255,126,95,1) 0deg, rgba(254,180,123,1) 120deg, rgba(134,168,231,1) 240deg, rgba(255,126,95,1) 360deg)",
    };
    expect(detectBackgroundType(value)).toBe("conicGradient");
  });

  test("returns radialGradient for radial gradients", () => {
    const value: StyleValue = {
      type: "unparsed",
      value: "radial-gradient(circle, red, blue)",
    };
    expect(detectBackgroundType(value)).toBe("radialGradient");
  });

  test("returns radialGradient for repeating radial gradients", () => {
    const value: StyleValue = {
      type: "unparsed",
      value: "repeating-radial-gradient(circle, red, blue)",
    };
    expect(detectBackgroundType(value)).toBe("radialGradient");
  });

  test("returns image for unsupported gradient types", () => {
    const value: StyleValue = {
      type: "unparsed",
      value: "unsupported-gradient(circle, red, blue)",
    };
    expect(detectBackgroundType(value)).toBe("image");
  });
});

describe("reindexHintOverrides", () => {
  test("reindexes hints after deleting a stop before them", () => {
    const overrides = new Map<number, PercentUnitValue>([
      [1, { type: "unit", unit: "%", value: 25 }],
      [3, { type: "unit", unit: "%", value: 75 }],
    ]);
    const result = reindexHintOverrides(overrides, 0);
    expect(result.get(0)).toEqual({ type: "unit", unit: "%", value: 25 });
    expect(result.get(2)).toEqual({ type: "unit", unit: "%", value: 75 });
    expect(result.size).toBe(2);
  });

  test("removes hint for deleted stop", () => {
    const overrides = new Map<number, PercentUnitValue>([
      [1, { type: "unit", unit: "%", value: 25 }],
      [2, { type: "unit", unit: "%", value: 50 }],
      [3, { type: "unit", unit: "%", value: 75 }],
    ]);
    const result = reindexHintOverrides(overrides, 2);
    expect(result.get(1)).toEqual({ type: "unit", unit: "%", value: 25 });
    expect(result.get(2)).toEqual({ type: "unit", unit: "%", value: 75 });
    expect(result.has(3)).toBe(false);
    expect(result.size).toBe(2);
  });

  test("keeps hints before deleted index unchanged", () => {
    const overrides = new Map<number, PercentUnitValue>([
      [0, { type: "unit", unit: "%", value: 10 }],
      [1, { type: "unit", unit: "%", value: 25 }],
    ]);
    const result = reindexHintOverrides(overrides, 3);
    expect(result.get(0)).toEqual({ type: "unit", unit: "%", value: 10 });
    expect(result.get(1)).toEqual({ type: "unit", unit: "%", value: 25 });
    expect(result.size).toBe(2);
  });

  test("handles empty overrides map", () => {
    const overrides = new Map<number, PercentUnitValue>();
    const result = reindexHintOverrides(overrides, 1);
    expect(result.size).toBe(0);
  });
});

describe("sortGradientStops", () => {
  const red: RgbValue = { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 };
  const blue: RgbValue = { type: "rgb", r: 0, g: 0, b: 255, alpha: 1 };
  const green: RgbValue = { type: "rgb", r: 0, g: 255, b: 0, alpha: 1 };

  test("sorts stops by position ascending", () => {
    const gradient = createLinearGradient({
      stops: [
        { color: red, position: { type: "unit", unit: "%", value: 100 } },
        { color: blue, position: { type: "unit", unit: "%", value: 0 } },
        { color: green, position: { type: "unit", unit: "%", value: 50 } },
      ],
    });
    const { sortedGradient } = sortGradientStops(gradient, new Map());

    expect(sortedGradient.stops[0].position).toEqual({
      type: "unit",
      unit: "%",
      value: 0,
    });
    expect(sortedGradient.stops[1].position).toEqual({
      type: "unit",
      unit: "%",
      value: 50,
    });
    expect(sortedGradient.stops[2].position).toEqual({
      type: "unit",
      unit: "%",
      value: 100,
    });
  });

  test("reindexes hint overrides to match sorted positions", () => {
    const gradient = createLinearGradient({
      stops: [
        { color: red, position: { type: "unit", unit: "%", value: 100 } }, // originalIndex: 0
        { color: blue, position: { type: "unit", unit: "%", value: 0 } }, // originalIndex: 1
        { color: green, position: { type: "unit", unit: "%", value: 50 } }, // originalIndex: 2
      ],
    });
    const hintOverrides = new Map<number, PercentUnitValue>([
      [0, { type: "unit", unit: "%", value: 90 }], // hint for stop at 100%
      [2, { type: "unit", unit: "%", value: 40 }], // hint for stop at 50%
    ]);
    const { reindexedHints } = sortGradientStops(gradient, hintOverrides);

    // After sorting: [0%, 50%, 100%]
    // Hints should be at new indices: 1 (for 50%) and 2 (for 100%)
    expect(reindexedHints.get(1)).toEqual({
      type: "unit",
      unit: "%",
      value: 40,
    });
    expect(reindexedHints.get(2)).toEqual({
      type: "unit",
      unit: "%",
      value: 90,
    });
    expect(reindexedHints.size).toBe(2);
  });

  test("handles stops without positions (defaults to 0)", () => {
    const gradient = createLinearGradient({
      stops: [
        { color: red, position: { type: "unit", unit: "%", value: 50 } },
        { color: blue }, // No position, should default to 0
        { color: green, position: { type: "unit", unit: "%", value: 100 } },
      ],
    });
    const { sortedGradient } = sortGradientStops(gradient, new Map());

    expect(sortedGradient.stops[0].color).toEqual(blue); // No position = 0
    expect(sortedGradient.stops[1].position).toEqual({
      type: "unit",
      unit: "%",
      value: 50,
    });
    expect(sortedGradient.stops[2].position).toEqual({
      type: "unit",
      unit: "%",
      value: 100,
    });
  });

  test("preserves gradient properties other than stops", () => {
    const gradient = createLinearGradient({
      angle: { type: "unit", unit: "deg", value: 45 },
      repeating: true,
      stops: [
        { color: red, position: { type: "unit", unit: "%", value: 100 } },
        { color: blue, position: { type: "unit", unit: "%", value: 0 } },
      ],
    });
    const { sortedGradient } = sortGradientStops(gradient, new Map());

    expect(sortedGradient.type).toBe("linear");
    if (sortedGradient.type === "linear") {
      expect(sortedGradient.angle).toEqual({
        type: "unit",
        unit: "deg",
        value: 45,
      });
    }
    expect(sortedGradient.repeating).toBe(true);
  });

  test("handles empty hint overrides", () => {
    const gradient = createLinearGradient({
      stops: [
        { color: red, position: { type: "unit", unit: "%", value: 50 } },
        { color: blue, position: { type: "unit", unit: "%", value: 0 } },
      ],
    });
    const { reindexedHints } = sortGradientStops(gradient, new Map());

    expect(reindexedHints.size).toBe(0);
  });

  test("maintains stable sort for stops at same position", () => {
    const gradient = createLinearGradient({
      stops: [
        { color: red, position: { type: "unit", unit: "%", value: 50 } },
        { color: blue, position: { type: "unit", unit: "%", value: 50 } },
        { color: green, position: { type: "unit", unit: "%", value: 50 } },
      ],
    });
    const { sortedGradient } = sortGradientStops(gradient, new Map());

    // Original order should be preserved for stops at the same position
    expect(sortedGradient.stops[0].color).toEqual(red);
    expect(sortedGradient.stops[1].color).toEqual(blue);
    expect(sortedGradient.stops[2].color).toEqual(green);
  });
});

describe("updateGradientStop", () => {
  const red: RgbValue = { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 };
  const blue: RgbValue = { type: "rgb", r: 0, g: 0, b: 255, alpha: 1 };

  test("returns same gradient when stop index is invalid", () => {
    const gradient = createLinearGradient({
      stops: [{ color: red, position: { type: "unit", unit: "%", value: 0 } }],
    });

    const result = updateGradientStop(gradient, -1, (stop) => stop);
    expect(result).toBe(gradient);

    const result2 = updateGradientStop(gradient, 5, (stop) => stop);
    expect(result2).toBe(gradient);
  });

  test("updates stop without hint", () => {
    const gradient = createLinearGradient({
      stops: [
        { color: red, position: { type: "unit", unit: "%", value: 0 } },
        { color: blue, position: { type: "unit", unit: "%", value: 100 } },
      ],
    });

    const result = updateGradientStop(gradient, 0, (stop) => ({
      ...stop,
      position: { type: "unit", unit: "%", value: 25 },
    }));

    expect(result.stops[0].position).toEqual({
      type: "unit",
      unit: "%",
      value: 25,
    });
    expect(result.stops[0].hint).toBeUndefined();
  });

  test("maintains hint offset when position changes", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: red,
          position: { type: "unit", unit: "%", value: 20 },
          hint: { type: "unit", unit: "%", value: 30 }, // offset = 10
        },
        { color: blue, position: { type: "unit", unit: "%", value: 100 } },
      ],
    });

    const result = updateGradientStop(gradient, 0, (stop) => ({
      ...stop,
      position: { type: "unit", unit: "%", value: 50 },
    }));

    expect(result.stops[0].position).toEqual({
      type: "unit",
      unit: "%",
      value: 50,
    });
    // Hint should maintain offset of 10: 50 + 10 = 60
    expect(result.stops[0].hint).toEqual({
      type: "unit",
      unit: "%",
      value: 60,
    });
  });

  test("clamps hint to 0-100 range when maintaining offset", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: red,
          position: { type: "unit", unit: "%", value: 80 },
          hint: { type: "unit", unit: "%", value: 95 }, // offset = 15
        },
        { color: blue, position: { type: "unit", unit: "%", value: 100 } },
      ],
    });

    const result = updateGradientStop(gradient, 0, (stop) => ({
      ...stop,
      position: { type: "unit", unit: "%", value: 90 },
    }));

    // Hint should be clamped: 90 + 15 = 105 -> 100
    expect(result.stops[0].hint).toEqual({
      type: "unit",
      unit: "%",
      value: 100,
    });
  });

  test("clamps hint to minimum 0 when offset is negative", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: red,
          position: { type: "unit", unit: "%", value: 50 },
          hint: { type: "unit", unit: "%", value: 30 }, // offset = -20
        },
        { color: blue, position: { type: "unit", unit: "%", value: 100 } },
      ],
    });

    const result = updateGradientStop(gradient, 0, (stop) => ({
      ...stop,
      position: { type: "unit", unit: "%", value: 10 },
    }));

    // Hint should be clamped: 10 + (-20) = -10 -> 0
    expect(result.stops[0].hint).toEqual({
      type: "unit",
      unit: "%",
      value: 0,
    });
  });

  test("does not modify hint when position does not change", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: red,
          position: { type: "unit", unit: "%", value: 20 },
          hint: { type: "unit", unit: "%", value: 30 },
        },
        { color: blue, position: { type: "unit", unit: "%", value: 100 } },
      ],
    });

    const result = updateGradientStop(gradient, 0, (stop) => ({
      ...stop,
      color: blue, // Only change color, not position
    }));

    expect(result.stops[0].color).toEqual(blue);
    expect(result.stops[0].position).toEqual({
      type: "unit",
      unit: "%",
      value: 20,
    });
    // Hint should remain unchanged
    expect(result.stops[0].hint).toEqual({
      type: "unit",
      unit: "%",
      value: 30,
    });
  });

  test("does not modify other stops", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: red,
          position: { type: "unit", unit: "%", value: 0 },
          hint: { type: "unit", unit: "%", value: 10 },
        },
        {
          color: blue,
          position: { type: "unit", unit: "%", value: 100 },
          hint: { type: "unit", unit: "%", value: 90 },
        },
      ],
    });

    const result = updateGradientStop(gradient, 0, (stop) => ({
      ...stop,
      position: { type: "unit", unit: "%", value: 20 },
    }));

    // Second stop should be unchanged
    expect(result.stops[1]).toEqual(gradient.stops[1]);
  });

  test("handles stop without hint gracefully", () => {
    const gradient = createLinearGradient({
      stops: [
        { color: red, position: { type: "unit", unit: "%", value: 0 } },
        { color: blue, position: { type: "unit", unit: "%", value: 100 } },
      ],
    });

    const result = updateGradientStop(gradient, 0, (stop) => ({
      ...stop,
      position: { type: "unit", unit: "%", value: 50 },
    }));

    expect(result.stops[0].position).toEqual({
      type: "unit",
      unit: "%",
      value: 50,
    });
    expect(result.stops[0].hint).toBeUndefined();
  });

  test("handles non-percent hint units gracefully", () => {
    const gradient = createLinearGradient({
      stops: [
        {
          color: red,
          position: { type: "unit", unit: "%", value: 20 },
          hint: { type: "unit", unit: "px", value: 50 } as UnitValue,
        },
        { color: blue, position: { type: "unit", unit: "%", value: 100 } },
      ],
    });

    const result = updateGradientStop(gradient, 0, (stop) => ({
      ...stop,
      position: { type: "unit", unit: "%", value: 50 },
    }));

    // Hint should not be modified for non-percent units
    expect(result.stops[0].hint).toEqual({
      type: "unit",
      unit: "px",
      value: 50,
    });
  });

  test("preserves gradient properties other than stops", () => {
    const gradient = createLinearGradient({
      angle: { type: "unit", unit: "deg", value: 45 },
      repeating: true,
      stops: [
        { color: red, position: { type: "unit", unit: "%", value: 0 } },
        { color: blue, position: { type: "unit", unit: "%", value: 100 } },
      ],
    });

    const result = updateGradientStop(gradient, 0, (stop) => ({
      ...stop,
      position: { type: "unit", unit: "%", value: 25 },
    }));

    expect(result.type).toBe("linear");
    if (result.type === "linear") {
      expect(result.angle).toEqual({ type: "unit", unit: "deg", value: 45 });
    }
    expect(result.repeating).toBe(true);
  });
});
