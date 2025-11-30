import { clamp } from "@react-aria/utils";
import {
  ColorValue,
  toValue,
  type CssProperty,
  type KeywordValue,
  type StyleValue,
  type Unit,
  type UnitValue,
  type VarValue,
} from "@webstudio-is/css-engine";
import {
  parseCssValue,
  parseLinearGradient,
  parseConicGradient,
  parseRadialGradient,
  formatLinearGradient,
  formatConicGradient,
  formatRadialGradient,
  expandShorthands,
  type GradientStop,
  type ParsedGradient,
  type ParsedLinearGradient,
  type ParsedConicGradient,
  type ParsedRadialGradient,
} from "@webstudio-is/css-data";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { getRepeatedStyleItem } from "../../shared/repeated-style";
import type { UnitOption } from "../../shared/css-value-input/unit-select";

const backgroundPositionXLonghand: CssProperty = "background-position-x";
const backgroundPositionYLonghand: CssProperty = "background-position-y";

export type GradientType = "linear" | "conic" | "radial";
export type PercentUnitValue = UnitValue & { unit: "%" };
export type NormalizedGradient = {
  normalizedGradientString: string;
  initialIsRepeating: boolean;
};
export type IntermediateColorValue = {
  type: "intermediate";
  value: string;
};

const gradientFunctionNames: Record<
  GradientType,
  { base: string; repeating: string }
> = {
  linear: {
    base: "linear-gradient",
    repeating: "repeating-linear-gradient",
  },
  conic: {
    base: "conic-gradient",
    repeating: "repeating-conic-gradient",
  },
  radial: {
    base: "radial-gradient",
    repeating: "repeating-radial-gradient",
  },
};

/**
 * Checks if a CSS value string starts with a gradient function of the specified type.
 * Handles both base and repeating gradient functions (e.g., "linear-gradient" and "repeating-linear-gradient").
 */
const startsWithGradientFunction = (value: string, type: GradientType) => {
  const normalized = value.trim().toLowerCase();
  const { base, repeating } = gradientFunctionNames[type];
  return (
    normalized.startsWith(`${base}(`) || normalized.startsWith(`${repeating}(`)
  );
};

const angleUnitTokens = ["deg", "grad", "rad", "turn"] as const;
type AngleUnit = (typeof angleUnitTokens)[number];
const angleUnitSet = new Set<AngleUnit>(angleUnitTokens);
const fullCircleDegrees = 360;

export const angleUnitOptions = angleUnitTokens.map((unit) => ({
  id: unit,
  label: unit,
  type: "unit" as const,
}));

export const percentUnitOptions: UnitOption[] = [
  {
    id: "%" as Unit,
    label: "%",
    type: "unit",
  },
];

export const gradientPositionXOptions: KeywordValue[] = [
  { type: "keyword", value: "center" },
  { type: "keyword", value: "left" },
  { type: "keyword", value: "right" },
];

export const gradientPositionYOptions: KeywordValue[] = [
  { type: "keyword", value: "center" },
  { type: "keyword", value: "top" },
  { type: "keyword", value: "bottom" },
];

const getAxisPositionValue = (
  property: CssProperty,
  value: string | undefined
): StyleValue | undefined => {
  if (value === undefined) {
    return;
  }
  const parsed = parseCssValue(property, value);
  if (parsed.type === "invalid") {
    return;
  }
  return parsed;
};

/**
 * Parses a gradient position string into separate x and y StyleValues.
 * Defaults to "center center" if position is undefined or parsing fails.
 */
export const parseGradientPositionValues = (position?: string) => {
  if (position === undefined) {
    return {
      xValue: { type: "keyword" as const, value: "center" },
      yValue: { type: "keyword" as const, value: "center" },
    } as const;
  }
  try {
    const longhands = expandShorthands([["background-position", position]]);
    const [xLonghand, yLonghand] = longhands;
    return {
      // Use the real background-position longhand when parsing so we can reuse
      // its CSS syntax rules, but assign the result to the gradient-specific
      // custom property downstream.
      xValue: getAxisPositionValue(
        backgroundPositionXLonghand,
        xLonghand?.[1]
      ) ?? { type: "keyword" as const, value: "center" },
      yValue: getAxisPositionValue(
        backgroundPositionYLonghand,
        yLonghand?.[1]
      ) ?? { type: "keyword" as const, value: "center" },
    } as const;
  } catch {
    return {
      xValue: { type: "keyword" as const, value: "center" },
      yValue: { type: "keyword" as const, value: "center" },
    } as const;
  }
};

/**
 * Formats x and y position values into a CSS position string.
 * Omits "center center" as it's the default. Returns just x if y is center.
 */
export const formatGradientPositionValues = (
  xValue?: StyleValue,
  yValue?: StyleValue
) => {
  const x = toValue(xValue ?? { type: "keyword" as const, value: "center" });
  const y = toValue(yValue ?? { type: "keyword" as const, value: "center" });
  if (x === "center" && y === "center") {
    return;
  }
  if (y === "center") {
    return x;
  }
  return `${x} ${y}`;
};

export const createPercentUnitValue = (value: number): PercentUnitValue => ({
  type: "unit",
  unit: "%" as const,
  value: clampPercentValue(value),
});

const isAngleUnit = (unit: string): unit is AngleUnit =>
  angleUnitSet.has(unit as AngleUnit);

const clampPercentValue = (value: number) => clamp(value, 0, 100);

const angleUnitToDegrees = (value: UnitValue): number | undefined => {
  switch (value.unit) {
    case "deg":
      return value.value;
    case "grad":
      return (value.value * 360) / 400;
    case "rad":
      return (value.value * 180) / Math.PI;
    case "turn":
      return value.value * 360;
    default:
      return;
  }
};

/**
 * Converts a UnitValue to a PercentUnitValue.
 * For percent units, clamps to 0-100. For angle units, converts to percent (0-100 representing 0-360deg).
 * Returns undefined for unsupported unit types.
 */
const toPercentUnitValue = (value: UnitValue): PercentUnitValue | undefined => {
  if (value.unit === "%") {
    return {
      type: "unit" as const,
      unit: "%" as const,
      value: clampPercentValue(value.value),
    } satisfies PercentUnitValue;
  }

  if (isAngleUnit(value.unit) === false) {
    return;
  }

  const degrees = angleUnitToDegrees(value);
  if (degrees === undefined || Number.isFinite(degrees) === false) {
    return;
  }

  const normalizedDegrees =
    ((degrees % fullCircleDegrees) + fullCircleDegrees) % fullCircleDegrees;
  const percentValue = clampPercentValue(
    (normalizedDegrees / fullCircleDegrees) * 100
  );

  return {
    type: "unit" as const,
    unit: "%" as const,
    value: percentValue,
  } satisfies PercentUnitValue;
};

export const fallbackStopColor: ColorValue = {
  type: "color",
  colorSpace: "srgb",
  components: [0, 0, 0],
  alpha: 1,
};

const transparentColor: ColorValue = {
  type: "color",
  colorSpace: "srgb",
  components: [0, 0, 0],
  alpha: 0,
};

export const createDefaultStops = (): GradientStop[] => [
  {
    color: fallbackStopColor,
    position: { type: "unit", unit: "%", value: 0 },
  },
  {
    color: transparentColor,
    position: { type: "unit", unit: "%", value: 100 },
  },
];

const createDefaultLinearGradient = (): ParsedLinearGradient => ({
  type: "linear",
  stops: createDefaultStops(),
});

const createDefaultConicGradient = (): ParsedConicGradient => ({
  type: "conic",
  stops: createDefaultStops(),
});

const createDefaultRadialGradient = (): ParsedRadialGradient => ({
  type: "radial",
  stops: createDefaultStops(),
});

type CreateDefaultGradient = {
  (type: "linear"): ParsedLinearGradient;
  (type: "conic"): ParsedConicGradient;
  (type: "radial"): ParsedRadialGradient;
  (type: GradientType): ParsedGradient;
};

export const createDefaultGradient = ((type: GradientType) => {
  switch (type) {
    case "linear":
      return createDefaultLinearGradient();
    case "conic":
      return createDefaultConicGradient();
    case "radial":
      return createDefaultRadialGradient();
  }
}) as CreateDefaultGradient;

export const isLinearGradient = (
  gradient: ParsedGradient
): gradient is ParsedLinearGradient => gradient.type === "linear";

export const isConicGradient = (
  gradient: ParsedGradient
): gradient is ParsedConicGradient => gradient.type === "conic";

export const isRadialGradient = (
  gradient: ParsedGradient
): gradient is ParsedRadialGradient => gradient.type === "radial";

/**
 * Returns the CSS spec default angle for each gradient type:
 * - linear-gradient: 180deg (to bottom)
 * - conic-gradient: 0deg (from top)
 * - radial-gradient: undefined (no angle)
 */
export const getDefaultAngle = (
  gradient: ParsedGradient
): UnitValue | undefined => {
  if (isLinearGradient(gradient)) {
    return { type: "unit", unit: "deg", value: 180 };
  }
  if (isConicGradient(gradient)) {
    return { type: "unit", unit: "deg", value: 0 };
  }
  return;
};

export const getPercentUnit = (
  styleValue: StyleValue | undefined
): PercentUnitValue | undefined => {
  if (styleValue === undefined) {
    return;
  }

  if (styleValue.type === "unit" && styleValue.unit === "%") {
    return {
      type: "unit" as const,
      unit: "%" as const,
      value: styleValue.value,
    } satisfies PercentUnitValue;
  }

  if (styleValue.type === "layers") {
    const firstLayer = styleValue.value[0];
    if (firstLayer?.type === "unit" && firstLayer.unit === "%") {
      return {
        type: "unit" as const,
        unit: "%" as const,
        value: firstLayer.value,
      } satisfies PercentUnitValue;
    }
  }
};

/**
 * Converts repeating-*-gradient to *-gradient while preserving leading whitespace.
 * Returns both the normalized string and whether it was originally repeating.
 */
export const normalizeGradientInput = (
  gradientString: string,
  gradientType: GradientType
): NormalizedGradient => {
  const leadingWhitespaceMatch = gradientString.match(/^\s*/);
  const leadingWhitespace = leadingWhitespaceMatch?.[0] ?? "";
  const withoutLeading = gradientString.slice(leadingWhitespace.length);
  const lowerCase = withoutLeading.toLowerCase();
  const { base, repeating } = gradientFunctionNames[gradientType];

  if (lowerCase.startsWith(repeating)) {
    const suffix = withoutLeading.slice(repeating.length);
    return {
      normalizedGradientString: `${leadingWhitespace}${base}${suffix}`,
      initialIsRepeating: true,
    } satisfies NormalizedGradient;
  }

  return {
    normalizedGradientString: gradientString,
    initialIsRepeating: false,
  } satisfies NormalizedGradient;
};

export const sideOrCornerToAngle = (
  sideOrCorner: KeywordValue | undefined
): number | undefined => {
  if (sideOrCorner === undefined) {
    return;
  }
  const normalized = sideOrCorner.value.trim().toLowerCase();
  if (normalized.startsWith("to ") === false) {
    return;
  }
  const tokens = normalized.slice(3).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return;
  }
  const tokenSet = new Set(tokens);
  const has = (token: string) => tokenSet.has(token);
  if (tokenSet.size === 1) {
    if (has("top")) {
      return 0;
    }
    if (has("right")) {
      return 90;
    }
    if (has("bottom")) {
      return 180;
    }
    if (has("left")) {
      return 270;
    }
    return;
  }
  if (tokenSet.size === 2) {
    if (has("top") && has("right")) {
      return 45;
    }
    if (has("bottom") && has("right")) {
      return 135;
    }
    if (has("bottom") && has("left")) {
      return 225;
    }
    if (has("top") && has("left")) {
      return 315;
    }
  }
};

/**
 * Interpolates missing stop positions proportionally between defined positions.
 * Only works with percent units - returns original gradient for non-percent units.
 */
export const fillMissingStopPositions = <T extends ParsedGradient>(
  gradient: T
): T => {
  const stops = gradient.stops;
  if (stops.length === 0) {
    return gradient;
  }

  const hasMissingPositions = stops.some((stop) => stop.position === undefined);
  if (hasMissingPositions === false) {
    return gradient;
  }

  const hasUnsupportedPosition = stops.some(
    (stop) =>
      stop.position !== undefined &&
      (stop.position.type !== "unit" || stop.position.unit !== "%")
  );
  if (hasUnsupportedPosition) {
    return gradient;
  }

  const totalStops = stops.length;
  const values = stops.map((stop) =>
    stop.position?.type === "unit" ? stop.position.value : undefined
  );
  const nextValues = [...values];
  const definedCount = nextValues.filter(
    (value): value is number => value !== undefined
  ).length;

  if (definedCount === 0) {
    if (totalStops === 1) {
      nextValues[0] = 0;
    } else {
      for (let index = 0; index < totalStops; index += 1) {
        const value = (index / (totalStops - 1)) * 100;
        nextValues[index] = clamp(value, 0, 100);
      }
    }
  } else {
    if (nextValues[0] === undefined) {
      nextValues[0] = 0;
    }
    if (nextValues[totalStops - 1] === undefined) {
      nextValues[totalStops - 1] = 100;
    }

    let start = 0;
    while (start < totalStops) {
      const startValue = nextValues[start];
      if (startValue === undefined) {
        start += 1;
        continue;
      }
      let end = start + 1;
      while (end < totalStops && nextValues[end] === undefined) {
        end += 1;
      }
      if (end >= totalStops) {
        break;
      }
      const endValue = nextValues[end];
      if (endValue === undefined) {
        break;
      }
      const span = end - start;
      for (let offset = 1; offset < span; offset += 1) {
        const interpolated =
          startValue + ((endValue - startValue) * offset) / span;
        nextValues[start + offset] = clamp(interpolated, 0, 100);
      }
      start = end;
    }
  }

  const nextStops = stops.map((stop, index) => {
    if (stop.position !== undefined) {
      return stop;
    }
    const value = nextValues[index];
    if (value === undefined) {
      return stop;
    }
    return {
      ...stop,
      position: {
        type: "unit" as const,
        unit: "%" as const,
        value,
      },
    };
  });

  return {
    ...gradient,
    stops: nextStops,
  } as T;
};

/**
 * Clones stop values, deep cloning var fallbacks to avoid shared references.
 */
const cloneGradientStopValue = <
  Value extends GradientStop["position"] | GradientStop["hint"],
>(
  value: Value
): Value => {
  if (value === undefined) {
    return value;
  }

  if (value.type === "var") {
    return {
      ...value,
      fallback: value.fallback && { ...value.fallback },
    };
  }

  return { ...value };
};

/**
 * Clones colors, deep cloning var fallbacks to avoid shared references.
 */
const cloneGradientStopColor = (
  color: GradientStop["color"] | undefined
): GradientStop["color"] => {
  if (color === undefined) {
    return { ...fallbackStopColor };
  }
  if (color.type === "var") {
    return {
      ...color,
      fallback: color.fallback && { ...color.fallback },
    };
  }
  return { ...color };
};

/**
 * Creates a solid color gradient (two identical stops at 0% and 100%).
 */
export const createSolidLinearGradient = (
  color: GradientStop["color"],
  base?: ParsedLinearGradient
): ParsedLinearGradient => {
  const firstColor = cloneGradientStopColor(color);
  const secondColor = cloneGradientStopColor(color);
  return {
    type: "linear",
    angle: base?.angle,
    sideOrCorner: base?.sideOrCorner,
    stops: [
      {
        color: firstColor,
        position: { type: "unit", unit: "%", value: 0 },
      },
      {
        color: secondColor,
        position: { type: "unit", unit: "%", value: 100 },
      },
    ],
  };
};

type AngleUnitValue = UnitValue & { unit: AngleUnit };
type AngleValue = AngleUnitValue | VarValue;

const resolveAnglePrimitive = (
  value: VarValue | UnitValue | undefined
): AngleValue | undefined => {
  if (value === undefined) {
    return;
  }

  if (value.type === "var") {
    return {
      ...value,
      fallback: value.fallback && { ...value.fallback },
    };
  }

  if (value.type === "unit" && isAngleUnit(value.unit)) {
    return {
      ...value,
      unit: value.unit,
    };
  }

  return;
};

export const resolveAngleValue = (
  styleValue: StyleValue | undefined
): AngleValue | undefined => {
  if (styleValue === undefined) {
    return;
  }

  if (styleValue.type === "tuple") {
    const first = styleValue.value[0];
    if (first?.type === "var" || first?.type === "unit") {
      return resolveAnglePrimitive(first);
    }
    return;
  }

  if (styleValue.type === "layers") {
    const firstLayer = styleValue.value[0];
    if (firstLayer?.type === "var" || firstLayer?.type === "unit") {
      return resolveAnglePrimitive(firstLayer);
    }
    return;
  }

  if (styleValue.type === "var" || styleValue.type === "unit") {
    return resolveAnglePrimitive(styleValue);
  }

  return;
};

export const formatGradientValue = (gradient: ParsedGradient) => {
  if (isLinearGradient(gradient)) {
    return formatLinearGradient(gradient);
  }
  if (isConicGradient(gradient)) {
    return formatConicGradient(gradient);
  }
  return formatRadialGradient(gradient);
};

const resolveVarPercentUnit = (
  value: GradientStop["position"] | GradientStop["hint"]
): PercentUnitValue | undefined => {
  if (value?.type !== "var") {
    return;
  }
  const fallback = value.fallback;
  if (fallback?.type === "unit") {
    const percentFallback = toPercentUnitValue(fallback);
    if (percentFallback !== undefined) {
      return percentFallback;
    }
  }
};

const normalizeStopsForPicker = <T extends ParsedGradient>(gradient: T): T => {
  let changed = false;
  const stops = gradient.stops.map((stop) => {
    let nextPosition = stop.position;
    let nextHint = stop.hint;
    let stopChanged = false;

    if (stop.position?.type === "var") {
      nextPosition = resolveVarPercentUnit(stop.position);
      stopChanged = true;
    }

    if (stop.hint?.type === "var") {
      nextHint = resolveVarPercentUnit(stop.hint);
      stopChanged = true;
    }

    if (stopChanged) {
      changed = true;
      return {
        ...stop,
        position: nextPosition,
        hint: nextHint,
      } satisfies GradientStop;
    }

    return stop;
  });

  if (changed === false) {
    return gradient;
  }

  return {
    ...gradient,
    stops,
  } as T;
};

/**
 * Converts conic angle units (deg, turn, etc.) to percent units for picker UI.
 */
const convertConicStopsToPercent = <T extends ParsedGradient>(
  gradient: T
): T => {
  if (isConicGradient(gradient) === false) {
    return gradient;
  }

  let changed = false;
  const stops = gradient.stops.map((stop) => {
    let nextPosition = stop.position;
    let nextHint = stop.hint;
    let stopChanged = false;

    if (stop.position?.type === "unit") {
      const percentPosition = toPercentUnitValue(stop.position);
      if (
        percentPosition !== undefined &&
        (stop.position.unit !== percentPosition.unit ||
          stop.position.value !== percentPosition.value)
      ) {
        nextPosition = percentPosition;
        stopChanged = true;
      }
    }

    if (stop.hint?.type === "unit") {
      const percentHint = toPercentUnitValue(stop.hint);
      if (
        percentHint !== undefined &&
        (stop.hint.unit !== percentHint.unit ||
          stop.hint.value !== percentHint.value)
      ) {
        nextHint = percentHint;
        stopChanged = true;
      }
    }

    if (stopChanged) {
      changed = true;
      return {
        ...stop,
        position: nextPosition,
        hint: nextHint,
      } satisfies GradientStop;
    }

    return stop;
  });

  if (changed === false) {
    return gradient;
  }

  return {
    ...gradient,
    stops,
  } as T;
};

/**
 * Prepares gradient for picker UI: converts angles to percent, resolves vars, fills positions, applies hint overrides.
 */
export const resolveGradientForPicker = <T extends ParsedGradient>(
  gradient: T,
  hintOverrides: ReadonlyMap<number, PercentUnitValue>
): T => {
  const withPercentualStops = convertConicStopsToPercent(gradient);
  const normalized = normalizeStopsForPicker(withPercentualStops);
  const filled = fillMissingStopPositions(normalized);
  if (hintOverrides.size === 0) {
    return filled;
  }
  let changed = false;
  const stopsWithHints = filled.stops.map((stop, index) => {
    if (stop.hint !== undefined) {
      return stop;
    }
    const override = hintOverrides.get(index);
    if (override === undefined) {
      return stop;
    }
    changed = true;
    return {
      ...stop,
      hint: override,
    };
  });
  if (changed === false) {
    return filled;
  }
  return {
    ...filled,
    stops: stopsWithHints,
  } as T;
};

/**
 * Returns same map reference if unchanged for referential equality.
 */
export const removeHintOverride = (
  overrides: Map<number, PercentUnitValue>,
  stopIndex: number
): Map<number, PercentUnitValue> => {
  if (overrides.has(stopIndex) === false) {
    return overrides;
  }
  const next = new Map(overrides);
  next.delete(stopIndex);
  return next;
};

/**
 * Returns same map reference if unchanged for referential equality.
 */
export const setHintOverride = (
  overrides: Map<number, PercentUnitValue>,
  stopIndex: number,
  override: PercentUnitValue
): Map<number, PercentUnitValue> => {
  const existing = overrides.get(stopIndex);
  if (existing !== undefined) {
    if (existing === override) {
      return overrides;
    }
    if (
      existing.type === override.type &&
      existing.unit === override.unit &&
      existing.value === override.value
    ) {
      return overrides;
    }
  }
  const next = new Map(overrides);
  next.set(stopIndex, override);
  return next;
};

/**
 * Returns same map reference if unchanged for referential equality.
 */
export const pruneHintOverrides = (
  overrides: Map<number, PercentUnitValue>,
  stopCount: number
): Map<number, PercentUnitValue> => {
  if (overrides.size === 0) {
    return overrides;
  }
  let changed = false;
  const next = new Map(overrides);
  for (const [index] of overrides) {
    if (index >= stopCount) {
      next.delete(index);
      changed = true;
    }
  }
  return changed ? next : overrides;
};

export const getStopPosition = (stop: GradientStop): number =>
  stop.position?.type === "unit" && stop.position.unit === "%"
    ? stop.position.value
    : 0;

export const reindexHintOverrides = (
  overrides: Map<number, PercentUnitValue>,
  deletedIndex: number
): Map<number, PercentUnitValue> => {
  const reindexed = new Map<number, PercentUnitValue>();
  overrides.forEach((value, key) => {
    if (key < deletedIndex) {
      reindexed.set(key, value);
    } else if (key > deletedIndex) {
      reindexed.set(key - 1, value);
    }
  });
  return reindexed;
};

export const sortGradientStops = (
  gradient: ParsedGradient,
  hintOverrides: Map<number, PercentUnitValue>
): {
  sortedGradient: ParsedGradient;
  reindexedHints: Map<number, PercentUnitValue>;
} => {
  // Create array of stops with their original indices and hint overrides
  const stopsWithData = gradient.stops.map((stop, originalIndex) => ({
    stop,
    originalIndex,
    hint: hintOverrides.get(originalIndex),
  }));

  // Sort by position
  stopsWithData.sort((a, b) => {
    const posA = getStopPosition(a.stop);
    const posB = getStopPosition(b.stop);
    return posA - posB;
  });

  // Extract sorted stops and rebuild hint overrides with new indices
  const sortedStops = stopsWithData.map(({ stop }) => stop);
  const reindexedHints = new Map<number, PercentUnitValue>();
  stopsWithData.forEach(({ hint }, newIndex) => {
    if (hint !== undefined) {
      reindexedHints.set(newIndex, hint);
    }
  });

  return {
    sortedGradient: {
      ...gradient,
      stops: sortedStops,
    },
    reindexedHints,
  };
};

export type ReverseStopsResolution<T extends ParsedGradient> =
  | {
      type: "apply";
      gradient: T;
      selectedStopIndex: number;
    }
  | { type: "none" };

/**
 * Reverses stops and mirrors percent positions (0% becomes 100%, etc.).
 */
export const resolveReverseStops = <T extends ParsedGradient>(
  gradient: T,
  selectedStopIndex: number
): ReverseStopsResolution<T> => {
  if (gradient.stops.length <= 1) {
    return { type: "none" } satisfies ReverseStopsResolution<T>;
  }
  const stopIndex = clampStopIndex(selectedStopIndex, gradient);
  const reversedStops = [...gradient.stops].reverse();
  const nextStops = reversedStops.map((stop) => {
    let position = stop.position;
    if (position?.type === "unit" && position.unit === "%") {
      position = {
        ...position,
        value: clamp(100 - position.value, 0, 100),
      } as PercentUnitValue;
    }
    return { ...stop, position } satisfies GradientStop;
  });
  const nextGradient = { ...gradient, stops: nextStops } as T;
  const nextSelectedIndex = gradient.stops.length - 1 - stopIndex;
  return {
    type: "apply",
    gradient: nextGradient,
    selectedStopIndex: nextSelectedIndex,
  } satisfies ReverseStopsResolution<T>;
};

export type StopPositionUpdateResolution =
  | {
      type: "apply";
      position: GradientStop["position"];
      clearHintOverrides: boolean;
    }
  | { type: "none" };

export const resolveStopPositionUpdate = (
  styleValue: StyleValue
): StopPositionUpdateResolution => {
  if (styleValue.type === "var") {
    return {
      type: "apply",
      position: cloneGradientStopValue(styleValue),
      clearHintOverrides: true,
    } satisfies StopPositionUpdateResolution;
  }

  const percentUnit = getPercentUnit(styleValue);
  if (percentUnit === undefined) {
    return { type: "none" } satisfies StopPositionUpdateResolution;
  }

  const normalized: PercentUnitValue = {
    ...percentUnit,
    value: clamp(percentUnit.value, 0, 100),
  } satisfies PercentUnitValue;
  return {
    type: "apply",
    position: normalized,
    clearHintOverrides: true,
  } satisfies StopPositionUpdateResolution;
};

export type StopHintUpdateResolution =
  | {
      type: "apply";
      hint: GradientStop["hint"];
      clearOverride: boolean;
      override?: PercentUnitValue;
    }
  | { type: "none" };

export const resolveStopHintUpdate = (
  styleValue: StyleValue
): StopHintUpdateResolution => {
  if (styleValue.type === "var") {
    return {
      type: "apply",
      hint: cloneGradientStopValue(styleValue),
      clearOverride: true,
    };
  }

  const percentUnit = getPercentUnit(styleValue);
  if (percentUnit === undefined) {
    return { type: "none" };
  }

  // Clamp the value inline
  const normalized: PercentUnitValue = {
    ...percentUnit,
    value: clamp(percentUnit.value, 0, 100),
  };

  return {
    type: "apply",
    hint: normalized,
    override: normalized,
    clearOverride: false,
  };
};

export const ensureGradientHasStops = <T extends ParsedGradient>(
  gradient: T
): T => {
  const stops =
    gradient.stops.length === 0
      ? createDefaultStops()
      : gradient.stops.map((stop) =>
          stop.color === undefined
            ? {
                ...stop,
                color: { ...fallbackStopColor },
              }
            : stop
        );

  return {
    ...gradient,
    stops,
  } as T;
};

export const clampStopIndex = <T extends ParsedGradient>(
  index: number,
  gradient: T
) => clamp(index, 0, Math.max(gradient.stops.length - 1, 0));

/**
 * Updates a gradient stop with automatic hint offset maintenance.
 * When a stop's position changes and it has a hint, the hint is adjusted
 * to maintain the same offset relative to the stop's new position.
 * This matches the behavior of the gradient picker during drag operations.
 */
export const updateGradientStop = <T extends ParsedGradient>(
  gradient: T,
  stopIndex: number,
  updater: (stop: GradientStop) => GradientStop
): T => {
  const currentStop = gradient.stops[stopIndex];
  if (currentStop === undefined) {
    return gradient;
  }

  // Calculate hint offset before updating (like gradient picker does)
  const currentPosition = getStopPosition(currentStop);
  const currentHint =
    currentStop.hint?.type === "unit" && currentStop.hint.unit === "%"
      ? currentStop.hint.value
      : undefined;
  const hintOffset =
    currentHint !== undefined ? currentHint - currentPosition : 0;

  const stops = gradient.stops.map((stop, index) => {
    if (index !== stopIndex) {
      return stop;
    }

    const updatedStop = updater(stop);

    // If position changed and stop has a hint, maintain the hint offset
    if (
      hintOffset !== 0 &&
      stop.hint?.type === "unit" &&
      stop.hint.unit === "%" &&
      updatedStop.position !== stop.position
    ) {
      const newPosition = getStopPosition(updatedStop);
      return {
        ...updatedStop,
        hint: createPercentUnitValue(newPosition + hintOffset),
      };
    }

    return updatedStop;
  });

  return {
    ...gradient,
    stops,
  };
};

const parseColorString = (value: string): GradientStop["color"] | undefined => {
  const parsed = parseCssValue("color", value);
  if (
    parsed.type === "color" ||
    parsed.type === "rgb" ||
    parsed.type === "keyword" ||
    parsed.type === "var"
  ) {
    return parsed;
  }
};

export const styleValueToColor = (
  styleValue: StyleValue | IntermediateColorValue | undefined
): GradientStop["color"] | undefined => {
  if (styleValue === undefined) {
    return;
  }

  if (styleValue.type === "intermediate") {
    return parseColorString(styleValue.value);
  }

  if (styleValue.type === "rgb" || styleValue.type === "color") {
    return styleValue;
  }

  if (styleValue.type === "var") {
    return styleValue;
  }

  if (styleValue.type === "keyword") {
    return parseColorString(styleValue.value);
  }

  if (styleValue.type === "invalid") {
    return parseColorString(styleValue.value);
  }

  return parseColorString(toValue(styleValue));
};

export type BackgroundType =
  | "image"
  | "linearGradient"
  | "conicGradient"
  | "radialGradient"
  | "solid";

export const isSolidLinearGradient = (gradient: ParsedLinearGradient) => {
  // Only consider it a solid gradient if there are exactly 2 stops
  if (gradient.stops.length !== 2) {
    return false;
  }

  // Fill in default positions (0% and 100%) for any missing positions
  const normalized = fillMissingStopPositions(gradient);
  const firstStop = normalized.stops[0];
  const secondStop = normalized.stops[1];

  // Check if both stops have the same color
  const firstColor = firstStop?.color ? toValue(firstStop.color) : undefined;
  const secondColor = secondStop?.color ? toValue(secondStop.color) : undefined;

  if (
    firstColor === undefined ||
    secondColor === undefined ||
    firstColor !== secondColor
  ) {
    return false;
  }

  // Check if first position is 0% and second position is 100%
  const firstPosition = firstStop?.position;
  const secondPosition = secondStop?.position;

  const isFirstAt0 =
    firstPosition?.type === "unit" &&
    firstPosition.unit === "%" &&
    firstPosition.value === 0;

  const isSecondAt100 =
    secondPosition?.type === "unit" &&
    secondPosition.unit === "%" &&
    secondPosition.value === 100;

  return isFirstAt0 && isSecondAt100;
};

const formatSolidColorGradient = (styleValue: StyleValue | undefined) => {
  const cssValue = styleValue === undefined ? "" : toValue(styleValue);
  const gradientString = typeof cssValue === "string" ? cssValue : "";
  const parsed =
    gradientString.length > 0 ? parseAnyGradient(gradientString) : undefined;
  const parsedLinear =
    parsed?.type === "linear" ? parsed : createDefaultLinearGradient();
  const source = parsedLinear;
  const baseColor = source.stops[0]?.color ?? createDefaultStops()[0].color;
  const solidStops: GradientStop[] = [
    {
      color: baseColor,
      position: { type: "unit", unit: "%", value: 0 },
    },
    {
      color: baseColor,
      position: { type: "unit", unit: "%", value: 100 },
    },
  ];
  return formatLinearGradient({
    type: "linear",
    angle: source.angle,
    sideOrCorner: source.sideOrCorner,
    stops: solidStops,
  });
};

type GradientByType<T extends GradientType> = Extract<
  ParsedGradient,
  { type: T }
>;

/**
 * Cached to avoid re-parsing the same string.
 */
const parsedGradientCache = new Map<string, ParsedGradient | undefined>();

export const parseAnyGradient = (value: string): ParsedGradient | undefined => {
  // Check cache first
  if (parsedGradientCache.has(value)) {
    return parsedGradientCache.get(value);
  }

  // Parse gradient
  const parsed =
    parseLinearGradient(value) ??
    parseConicGradient(value) ??
    parseRadialGradient(value);

  // Cache the result
  parsedGradientCache.set(value, parsed);

  return parsed;
};

export const convertGradientToTarget = <Target extends GradientType>(
  styleValue: StyleValue | undefined,
  target: Target
): GradientByType<Target> => {
  const cssValue = styleValue === undefined ? "" : toValue(styleValue);
  const gradientString = typeof cssValue === "string" ? cssValue : "";
  const parsed =
    gradientString.length > 0 ? parseAnyGradient(gradientString) : undefined;
  const source = ensureGradientHasStops(
    parsed ?? createDefaultGradient(target)
  );
  if (source.type === target) {
    return source as GradientByType<Target>;
  }
  const template = createDefaultGradient(target);
  const converted = {
    ...template,
    repeating: source.repeating,
    stops: source.stops,
  } satisfies ParsedGradient;
  return converted as GradientByType<Target>;
};

/**
 * Formats a gradient for a specific background type.
 * Handles solid color conversion and gradient type conversions.
 * Returns the formatted CSS gradient string.
 */
export const formatGradientForType = (
  styleValue: StyleValue | undefined,
  target: Exclude<BackgroundType, "image">
) => {
  if (target === "solid") {
    return formatSolidColorGradient(styleValue);
  }
  if (target === "linearGradient") {
    const parsed = convertGradientToTarget(styleValue, "linear");
    return formatLinearGradient(parsed);
  }

  if (target === "conicGradient") {
    const parsed = convertGradientToTarget(styleValue, "conic");
    return formatConicGradient(parsed);
  }

  const parsed = convertGradientToTarget(styleValue, "radial");
  return formatRadialGradient(parsed);
};

/**
 * Detects the background type from a StyleValue.
 * Returns "solid" for uniform linear gradients, specific gradient types for gradients,
 * and "image" for non-gradient values or unparseable gradients.
 */
export const detectBackgroundType = (
  styleValue?: StyleValue
): BackgroundType => {
  if (styleValue === undefined) {
    return "image";
  }

  if (styleValue.type === "image") {
    return "image";
  }

  if (styleValue.type === "keyword") {
    // The only allowed keyword for backgroundImage is none
    return "image";
  }

  const cssValue = toValue(styleValue);
  if (typeof cssValue === "string") {
    // Use parseAnyGradient (which is cached) for all gradient detection
    const parsed = parseAnyGradient(cssValue);

    if (parsed !== undefined) {
      if (parsed.type === "linear") {
        return isSolidLinearGradient(parsed) ? "solid" : "linearGradient";
      }
      if (parsed.type === "conic") {
        return "conicGradient";
      }
      if (parsed.type === "radial") {
        return "radialGradient";
      }
    }

    // Fallback checks for unparseable gradients
    if (startsWithGradientFunction(cssValue, "conic")) {
      return "conicGradient";
    }

    if (startsWithGradientFunction(cssValue, "radial")) {
      return "radialGradient";
    }

    if (startsWithGradientFunction(cssValue, "linear")) {
      return "linearGradient";
    }
  }

  return "image";
};

/**
 * Gets a specific background layer item from a ComputedStyleDecl.
 * For index 0, returns the first layer or the cascaded value itself.
 * For index > 0, delegates to getRepeatedStyleItem.
 */
export const getBackgroundStyleItem = (
  styleDecl: ComputedStyleDecl,
  index: number
) => {
  const repeatedItem = getRepeatedStyleItem(styleDecl, index);
  if (repeatedItem !== undefined) {
    return repeatedItem;
  }

  if (index > 0) {
    return;
  }

  const cascaded = styleDecl.cascadedValue;
  if (cascaded.type === "layers" || cascaded.type === "tuple") {
    return cascaded.value[0];
  }

  return cascaded;
};
