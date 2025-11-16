import { describe, expect, test } from "vitest";
import type {
  KeywordValue,
  RgbValue,
  StyleValue,
  UnitValue,
  VarValue,
} from "@webstudio-is/css-engine";
import type { GradientStop, ParsedGradient } from "@webstudio-is/css-data";
import { __testing__ } from "./background-linear-gradient";

const {
  normalizeLinearGradientInput,
  getAnglePlaceholder,
  sideOrCornerToAngle,
  fillMissingStopPositions,
  ensureGradientHasStops,
  clampStopIndex,
  styleValueToColor,
  resolveStopHintUpdate,
  resolveGradientForPicker,
  removeHintOverride,
  setHintOverride,
  pruneHintOverrides,
  resolveStopPositionUpdate,
  resolveReverseStops,
  resolveAngleValue,
} = __testing__;

type PercentUnitValue = UnitValue & { unit: "%" };

describe("normalizeLinearGradientInput", () => {
  test("returns string unchanged when not repeating", () => {
    const input = "linear-gradient(red, blue)";
    expect(normalizeLinearGradientInput(input)).toEqual({
      normalizedGradientString: input,
      initialIsRepeating: false,
    });
  });

  test("normalizes repeating gradients", () => {
    const input = "  repeating-linear-gradient(red, blue)";
    expect(normalizeLinearGradientInput(input)).toEqual({
      normalizedGradientString: "  linear-gradient(red, blue)",
      initialIsRepeating: true,
    });
  });

  test("handles uppercase repeating gradients while preserving leading whitespace", () => {
    const input = "\tRePeAtInG-Linear-GrAdIeNt(red, blue)";
    expect(normalizeLinearGradientInput(input)).toEqual({
      normalizedGradientString: "\tlinear-gradient(red, blue)",
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

describe("getAnglePlaceholder", () => {
  test("returns undefined when angle is provided", () => {
    const gradient: ParsedGradient = {
      stops: [],
      angle: { type: "unit", unit: "deg", value: 45 } satisfies UnitValue,
    };
    expect(getAnglePlaceholder(gradient)).toBeUndefined();
  });

  test("derives angle from side or corner", () => {
    const gradient: ParsedGradient = {
      stops: [],
      sideOrCorner: {
        type: "keyword",
        value: "to left",
      } satisfies KeywordValue,
    };
    expect(getAnglePlaceholder(gradient)).toBe("270deg");
  });

  test("falls back to 180deg", () => {
    const gradient: ParsedGradient = { stops: [] };
    expect(getAnglePlaceholder(gradient)).toBe("180deg");
  });

  test("falls back to 180deg when side or corner is not directional", () => {
    const gradient: ParsedGradient = {
      stops: [],
      sideOrCorner: {
        type: "keyword",
        value: "center",
      } satisfies KeywordValue,
    };
    expect(getAnglePlaceholder(gradient)).toBe("180deg");
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
    const gradient: ParsedGradient = { stops: [] };
    expect(fillMissingStopPositions(gradient)).toBe(gradient);
  });

  test("returns original gradient when positions use non-percent units", () => {
    const gradient: ParsedGradient = {
      stops: [
        { color: undefined, position: { type: "unit", unit: "px", value: 10 } },
        { color: undefined },
      ],
    };

    expect(fillMissingStopPositions(gradient)).toBe(gradient);
  });

  test("assigns zero to a single stop without position", () => {
    const gradient: ParsedGradient = {
      stops: [{ color: undefined }],
    };

    const result = fillMissingStopPositions(gradient);
    expect(result).not.toBe(gradient);
    expect(result.stops[0]?.position).toEqual({
      type: "unit",
      unit: "%",
      value: 0,
    });
  });

  test("distributes positions evenly when all positions missing", () => {
    const gradient: ParsedGradient = {
      stops: [{ color: undefined }, { color: undefined }, { color: undefined }],
    };

    const result = fillMissingStopPositions(gradient);
    expect(result.stops.map((stop) => stop.position?.value)).toEqual([
      0, 50, 100,
    ]);
  });

  test("fills missing positions proportionally", () => {
    const gradient: ParsedGradient = {
      stops: [
        { color: undefined, position: { type: "unit", unit: "%", value: 0 } },
        { color: undefined },
        { color: undefined, position: { type: "unit", unit: "%", value: 100 } },
      ],
    };

    const result = fillMissingStopPositions(gradient);
    expect(result.stops[1]?.position).toEqual({
      type: "unit",
      unit: "%",
      value: 50,
    });
  });

  test("returns original gradient when positions use css variables", () => {
    const gradient: ParsedGradient = {
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
    };

    expect(fillMissingStopPositions(gradient)).toBe(gradient);
  });

  test("fills missing start and end positions when interior stops defined", () => {
    const gradient: ParsedGradient = {
      stops: [
        { color: undefined },
        { color: undefined, position: { type: "unit", unit: "%", value: 20 } },
        { color: undefined },
        { color: undefined, position: { type: "unit", unit: "%", value: 80 } },
        { color: undefined },
      ],
    };

    const result = fillMissingStopPositions(gradient);
    expect(result.stops.map((stop) => stop.position?.value)).toEqual([
      0, 20, 50, 80, 100,
    ]);
  });

  test("leaves gradients unchanged when positions are defined", () => {
    const gradient: ParsedGradient = {
      stops: [
        { color: undefined, position: { type: "unit", unit: "%", value: 0 } },
        { color: undefined, position: { type: "unit", unit: "%", value: 100 } },
      ],
    };

    expect(fillMissingStopPositions(gradient)).toBe(gradient);
  });
});

describe("ensureGradientHasStops", () => {
  test("provides default stops when gradient is empty", () => {
    const gradient: ParsedGradient = { stops: [] };
    const result = ensureGradientHasStops(gradient);
    expect(result.stops).toHaveLength(2);
    expect(result.stops[0]?.color).toEqual({
      type: "rgb",
      r: 0,
      g: 0,
      b: 0,
      alpha: 1,
    });
    expect(result.stops[1]?.color).toEqual({
      type: "rgb",
      r: 255,
      g: 255,
      b: 255,
      alpha: 1,
    });
  });

  test("fills missing colors with fallback", () => {
    const gradient: ParsedGradient = {
      stops: [
        {
          color: undefined,
          position: { type: "unit", unit: "%", value: 0 },
        },
      ],
    };

    const result = ensureGradientHasStops(gradient);
    expect(result.stops[0]?.color).toEqual({
      type: "rgb",
      r: 0,
      g: 0,
      b: 0,
      alpha: 1,
    });
  });

  test("preserves existing stop colors", () => {
    const stop: GradientStop = {
      color: { type: "rgb", r: 10, g: 20, b: 30, alpha: 0.5 },
      position: { type: "unit", unit: "%", value: 10 },
    };
    const gradient: ParsedGradient = {
      stops: [stop],
    };

    const result = ensureGradientHasStops(gradient);
    expect(result).not.toBe(gradient);
    expect(result.stops[0]).toBe(stop);
  });
});

describe("clampStopIndex", () => {
  const gradient: ParsedGradient = {
    stops: [
      { color: undefined, position: undefined },
      { color: undefined, position: undefined },
    ],
  };

  test("clamps to valid range", () => {
    expect(clampStopIndex(-1, gradient)).toBe(0);
    expect(clampStopIndex(1, gradient)).toBe(1);
    expect(clampStopIndex(5, gradient)).toBe(1);
  });

  test("returns zero when gradient has no stops", () => {
    const emptyGradient: ParsedGradient = { stops: [] };
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
      type: "rgb",
      r: 0,
      g: 0,
      b: 255,
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
      type: "rgb",
      r: 10,
      g: 20,
      b: 30,
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
      type: "rgb",
      r: 0,
      g: 255,
      b: 255,
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

    const result = resolveStopHintUpdate(styleValue, {
      getPercentUnit: () => undefined,
      clampPercentUnit: (value) => value,
    });

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
    const normalized: PercentUnitValue = {
      type: "unit",
      unit: "%",
      value: 50,
    };

    const result = resolveStopHintUpdate(styleValue, {
      getPercentUnit: () => ({ type: "unit", unit: "%", value: 45 }),
      clampPercentUnit: () => normalized,
    });

    expect(result.type).toBe("apply");
    if (result.type !== "apply") {
      throw new Error("Expected apply result");
    }
    expect(result).toEqual({
      type: "apply",
      hint: normalized,
      override: normalized,
      clearOverride: false,
    });
  });

  test("returns none when value unsupported", () => {
    const styleValue: StyleValue = { type: "keyword", value: "auto" };

    const result = resolveStopHintUpdate(styleValue, {
      getPercentUnit: () => undefined,
      clampPercentUnit: (value) => value,
    });

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

    const result = resolveStopPositionUpdate(styleValue, {
      getPercentUnit: () => undefined,
      clampPercentUnit: (value) => value,
    });

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
      value: 55,
    };

    const result = resolveStopPositionUpdate(
      { type: "unit", unit: "%", value: 120 },
      {
        getPercentUnit: () => ({ type: "unit", unit: "%", value: 120 }),
        clampPercentUnit: () => normalized,
      }
    );

    expect(result.type).toBe("apply");
    if (result.type !== "apply") {
      throw new Error("Expected apply result");
    }
    expect(result.position).toBe(normalized);
    expect(result.clearHintOverrides).toBe(true);
  });

  test("returns none when value unsupported", () => {
    const result = resolveStopPositionUpdate(
      { type: "keyword", value: "auto" },
      {
        getPercentUnit: () => undefined,
        clampPercentUnit: (value) => value,
      }
    );

    expect(result).toEqual({ type: "none" });
  });
});

describe("resolveReverseStops", () => {
  test("returns none when gradient has single stop", () => {
    const gradient: ParsedGradient = {
      stops: [
        {
          color: { type: "rgb", r: 0, g: 0, b: 0, alpha: 1 },
          position: { type: "unit", unit: "%", value: 0 },
        },
      ],
    };

    const result = resolveReverseStops(gradient, 0);
    expect(result).toEqual({ type: "none" });
  });

  test("reverses stops and mirrors percent positions", () => {
    const gradient: ParsedGradient = {
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
    };

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
    const gradient: ParsedGradient = {
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
    };

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
    const gradient: ParsedGradient = {
      stops: [{ color: undefined }, { color: undefined }, { color: undefined }],
    };

    const result = resolveGradientForPicker(gradient, new Map());

    expect(result.stops.map((stop) => stop.position?.value)).toEqual([
      0, 50, 100,
    ]);
  });

  test("applies overrides when hints missing", () => {
    const gradient: ParsedGradient = {
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
    };

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
    const gradient: ParsedGradient = {
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
    };

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
