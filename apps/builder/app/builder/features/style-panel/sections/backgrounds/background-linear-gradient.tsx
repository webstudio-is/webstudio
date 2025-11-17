import {
  toValue,
  type InvalidValue,
  type StyleValue,
  type RgbValue,
  type UnitValue,
  type KeywordValue,
  type VarValue,
  type VarFallback,
} from "@webstudio-is/css-engine";
import {
  parseCssValue,
  parseLinearGradient,
  formatLinearGradient,
  parseConicGradient,
  formatConicGradient,
  type ParsedGradient,
  type ParsedLinearGradient,
  type ParsedConicGradient,
  type GradientStop,
} from "@webstudio-is/css-data";
import {
  Flex,
  Label,
  Text,
  theme,
  Tooltip,
  GradientPicker,
  Grid,
  Box,
  IconButton,
  ToggleGroup,
  ToggleGroupButton,
} from "@webstudio-is/design-system";
import { ColorPicker } from "../../shared/color-picker";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRightLeftIcon,
  InfoCircleIcon,
  RepeatGridIcon,
  XSmallIcon,
} from "@webstudio-is/icons";
import { clamp } from "@react-aria/utils";
import { setProperty } from "../../shared/use-style-data";
import {
  useComputedStyleDecl,
  $availableUnitVariables,
} from "../../shared/model";
import {
  editRepeatedStyleItem,
  setRepeatedStyleItem,
} from "../../shared/repeated-style";
import {
  parseCssFragment,
  CssFragmentEditor,
  CssFragmentEditorContent,
  getCodeEditorCssVars,
} from "../../shared/css-fragment";
import { useLocalValue } from "../../../settings-panel/shared";
import { CssValueInputContainer } from "../../shared/css-value-input";

type GradientType = "linear" | "conic";

const isLinearGradient = (
  gradient: ParsedGradient
): gradient is ParsedLinearGradient => gradient.type === "linear";

const isConicGradient = (
  gradient: ParsedGradient
): gradient is ParsedConicGradient => gradient.type === "conic";

type NormalizedGradient = {
  normalizedGradientString: string;
  initialIsRepeating: boolean;
};

type PercentUnitValue = UnitValue & { unit: "%" };

const createDefaultStops = (): GradientStop[] => [
  {
    color: { type: "rgb", r: 0, g: 0, b: 0, alpha: 1 },
    position: { type: "unit", unit: "%", value: 0 },
  },
  {
    color: { type: "rgb", r: 255, g: 255, b: 255, alpha: 1 },
    position: { type: "unit", unit: "%", value: 100 },
  },
];

function createDefaultGradient(type: "linear"): ParsedLinearGradient;
function createDefaultGradient(type: "conic"): ParsedConicGradient;
function createDefaultGradient(type: GradientType): ParsedGradient {
  const stops = createDefaultStops();
  if (type === "linear") {
    return {
      type: "linear",
      stops,
    } satisfies ParsedLinearGradient;
  }
  return {
    type: "conic",
    stops,
  } satisfies ParsedConicGradient;
}

const getPercentUnit = (
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
};

const normalizeGradientInput = (
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

const getAnglePlaceholder = (gradient: ParsedLinearGradient) => {
  if (gradient.angle !== undefined) {
    return;
  }
  const derived = sideOrCornerToAngle(gradient.sideOrCorner);
  if (derived !== undefined) {
    return `${derived}deg`;
  }
  return "180deg";
};

const angleUnitTokens = ["deg", "grad", "rad", "turn"] as const;
type AngleUnit = (typeof angleUnitTokens)[number];
const angleUnitSet = new Set<AngleUnit>(angleUnitTokens);

const angleUnitOptions = angleUnitTokens.map((unit) => ({
  id: unit,
  label: unit,
  type: "unit" as const,
}));

const percentUnitOptions = [
  {
    id: "%" as const,
    label: "%",
    type: "unit" as const,
  },
];

const isAngleUnit = (unit: string): unit is AngleUnit =>
  angleUnitSet.has(unit as AngleUnit);

const sideOrCornerToAngle = (
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

const fillMissingStopPositions = <T extends ParsedGradient>(gradient: T): T => {
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

const fallbackStopColor: RgbValue = {
  type: "rgb",
  r: 0,
  g: 0,
  b: 0,
  alpha: 1,
};

const cloneVarValue = (value: VarValue): VarValue => ({
  ...value,
  fallback: value.fallback === undefined ? undefined : { ...value.fallback },
});

const cloneVarFallback = (
  fallback: VarFallback | undefined
): VarFallback | undefined => {
  if (fallback === undefined) {
    return;
  }

  if (fallback.type === "rgb") {
    return { ...fallback } satisfies VarFallback;
  }

  return { ...fallback } satisfies VarFallback;
};

const cloneGradientStopValue = <
  Value extends GradientStop["position"] | GradientStop["hint"],
>(
  value: Value
): Value => {
  if (value === undefined) {
    return value;
  }

  if (value.type === "var") {
    const fallback = value.fallback;
    return {
      ...value,
      fallback: fallback === undefined ? undefined : { ...fallback },
    } as Value;
  }

  return { ...value } as Value;
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
    return cloneVarValue(value);
  }

  if (value.type === "unit" && isAngleUnit(value.unit)) {
    return {
      ...value,
      unit: value.unit,
    } satisfies AngleUnitValue;
  }

  return;
};

const resolveAngleValue = (
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

const formatGradientValue = (gradient: ParsedGradient) =>
  gradient.type === "linear"
    ? formatLinearGradient(gradient)
    : formatConicGradient(gradient);

const resolveVarPercentUnit = (
  value: GradientStop["position"] | GradientStop["hint"]
): PercentUnitValue | undefined => {
  if (value?.type !== "var") {
    return;
  }
  const fallback = value.fallback;
  if (fallback?.type === "unit" && fallback.unit === "%") {
    return {
      type: "unit" as const,
      unit: "%" as const,
      value: clamp(fallback.value, 0, 100),
    } satisfies PercentUnitValue;
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

const resolveGradientForPicker = <T extends ParsedGradient>(
  gradient: T,
  hintOverrides: ReadonlyMap<number, PercentUnitValue>
): T => {
  const normalized = normalizeStopsForPicker(gradient);
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

const removeHintOverride = (
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

const setHintOverride = (
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

const pruneHintOverrides = (
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

type ReverseStopsResolution<T extends ParsedGradient> =
  | {
      type: "apply";
      gradient: T;
      selectedStopIndex: number;
    }
  | { type: "none" };

const resolveReverseStops = <T extends ParsedGradient>(
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

type StopPositionUpdateResolution =
  | {
      type: "apply";
      position: GradientStop["position"];
      clearHintOverrides: boolean;
    }
  | { type: "none" };

const resolveStopPositionUpdate = (
  styleValue: StyleValue
): StopPositionUpdateResolution => {
  if (styleValue.type === "var") {
    return {
      type: "apply",
      position: cloneGradientStopValue(styleValue as GradientStop["position"]),
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

type StopHintUpdateResolution =
  | {
      type: "apply";
      hint: GradientStop["hint"];
      clearOverride: boolean;
      override?: PercentUnitValue;
    }
  | { type: "none" };

type StopHintUpdateHelpers = {
  getPercentUnit: (value: StyleValue) => PercentUnitValue | undefined;
  clampPercentUnit: (value: PercentUnitValue) => PercentUnitValue;
};

const resolveStopHintUpdate = (
  styleValue: StyleValue,
  helpers: StopHintUpdateHelpers
): StopHintUpdateResolution => {
  if (styleValue.type === "var") {
    return {
      type: "apply",
      hint: cloneGradientStopValue(styleValue as GradientStop["hint"]),
      clearOverride: true,
    };
  }

  const percentUnit = helpers.getPercentUnit(styleValue);
  if (percentUnit === undefined) {
    return { type: "none" };
  }

  const normalized = helpers.clampPercentUnit(percentUnit);
  return {
    type: "apply",
    hint: normalized,
    override: normalized,
    clearOverride: false,
  };
};

const ensureGradientHasStops = <T extends ParsedGradient>(gradient: T): T => {
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

const clampStopIndex = <T extends ParsedGradient>(index: number, gradient: T) =>
  clamp(index, 0, Math.max(gradient.stops.length - 1, 0));

type IntermediateValue = {
  type: "intermediate";
  value: string;
};

const isTransparent = (color: StyleValue) =>
  color.type === "keyword" && color.value === "transparent";

type IntermediateColorValue = {
  type: "intermediate";
  value: string;
};

const parseColorString = (value: string): GradientStop["color"] | undefined => {
  const parsed = parseCssValue("color", value);
  if (
    parsed.type === "rgb" ||
    parsed.type === "keyword" ||
    parsed.type === "var"
  ) {
    return parsed;
  }
};

const styleValueToColor = (
  styleValue: StyleValue | IntermediateColorValue | undefined
): GradientStop["color"] | undefined => {
  if (styleValue === undefined) {
    return;
  }

  if (styleValue.type === "intermediate") {
    return parseColorString(styleValue.value);
  }

  if (styleValue.type === "rgb") {
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

export const BackgroundLinearGradient = ({
  index,
  type: gradientType = "linear",
}: {
  index: number;
  type?: GradientType;
}) => {
  const styleDecl = useComputedStyleDecl("background-image");
  let styleValue = styleDecl.cascadedValue;
  if (styleValue.type === "layers") {
    styleValue = styleValue.value[index];
  }

  let computedStyleValue = styleDecl.computedValue;
  if (computedStyleValue?.type === "layers") {
    computedStyleValue = computedStyleValue.value[index];
  }

  const gradientString = toValue(styleValue);
  const { normalizedGradientString, initialIsRepeating } =
    normalizeGradientInput(gradientString, gradientType);

  const parsedGradient = useMemo(() => {
    if (gradientType === "linear") {
      const parsed =
        parseLinearGradient(normalizedGradientString) ??
        createDefaultGradient("linear");
      return ensureGradientHasStops(parsed);
    }
    const parsed =
      parseConicGradient(normalizedGradientString) ??
      createDefaultGradient("conic");
    return ensureGradientHasStops(parsed);
  }, [gradientType, normalizedGradientString]);

  const computedGradientString = toValue(computedStyleValue);
  const { normalizedGradientString: normalizedComputedGradientString } =
    normalizeGradientInput(computedGradientString, gradientType);

  const parsedComputedGradient = useMemo(() => {
    if (gradientType === "linear") {
      const parsed =
        parseLinearGradient(normalizedComputedGradientString) ??
        createDefaultGradient("linear");
      return ensureGradientHasStops(parsed);
    }
    const parsed =
      parseConicGradient(normalizedComputedGradientString) ??
      createDefaultGradient("conic");
    return ensureGradientHasStops(parsed);
  }, [gradientType, normalizedComputedGradientString]);

  const [isRepeating, setIsRepeating] = useState(initialIsRepeating);

  useEffect(() => {
    setIsRepeating(initialIsRepeating);
  }, [initialIsRepeating]);

  const handleGradientSave = useCallback(
    (nextGradient: ParsedGradient) => {
      const gradientValue = formatGradientValue(nextGradient);
      // TODO maybe used a more structured representation
      const style: StyleValue = { type: "unparsed", value: gradientValue };
      setRepeatedStyleItem(styleDecl, index, style);
    },
    [index, styleDecl]
  );

  const {
    value: gradient,
    set: setLocalGradient,
    save: saveLocalGradient,
  } = useLocalValue<ParsedGradient>(parsedGradient, handleGradientSave, {
    autoSave: false,
  });
  const [selectedStopIndex, setSelectedStopIndex] = useState(0);
  const [hintOverrides, setHintOverrides] = useState(
    () => new Map<number, PercentUnitValue>()
  );

  const [intermediateValue, setIntermediateValue] = useState<
    IntermediateValue | InvalidValue | undefined
  >(undefined);

  useEffect(() => {
    setSelectedStopIndex((currentIndex) =>
      clampStopIndex(currentIndex, gradient)
    );
  }, [gradient]);

  useEffect(() => {
    setHintOverrides((previous) => {
      return pruneHintOverrides(previous, gradient.stops.length);
    });
  }, [gradient]);

  const computedGradientForPicker = useMemo(() => {
    if (parsedComputedGradient === undefined) {
      return;
    }
    return resolveGradientForPicker(
      parsedComputedGradient,
      new Map<number, PercentUnitValue>()
    );
  }, [parsedComputedGradient]);

  const gradientForPicker = useMemo(() => {
    const base = resolveGradientForPicker(gradient, hintOverrides);
    if (computedGradientForPicker === undefined) {
      return base;
    }

    const computedStops = computedGradientForPicker.stops;
    const stops = base.stops.map((stop, index) => {
      const computedStop = computedStops[index];
      if (computedStop === undefined) {
        return stop;
      }
      return {
        ...stop,
        color: computedStop.color ?? stop.color,
        position: computedStop.position ?? stop.position,
        hint: computedStop.hint ?? stop.hint,
      } satisfies GradientStop;
    });

    if (isLinearGradient(base) && isLinearGradient(computedGradientForPicker)) {
      return {
        ...base,
        angle: computedGradientForPicker.angle ?? base.angle,
        sideOrCorner:
          computedGradientForPicker.sideOrCorner ?? base.sideOrCorner,
        stops,
      } satisfies ParsedLinearGradient;
    }

    if (isConicGradient(base) && isConicGradient(computedGradientForPicker)) {
      return {
        ...base,
        angle: computedGradientForPicker.angle ?? base.angle,
        position: computedGradientForPicker.position ?? base.position,
        stops,
      } satisfies ParsedConicGradient;
    }

    return {
      ...base,
      stops,
    } as ParsedGradient;
  }, [computedGradientForPicker, gradient, hintOverrides]);

  const anglePlaceholder =
    gradient.type === "conic"
      ? gradient.angle === undefined
        ? "0deg"
        : undefined
      : getAnglePlaceholder(gradient);

  const textAreaValue = intermediateValue?.value ?? toValue(styleValue);

  const applyGradient = useCallback(
    (nextGradient: ParsedGradient, options?: { isEphemeral?: boolean }) => {
      const isEphemeral = options?.isEphemeral === true;
      setLocalGradient(nextGradient);
      setIntermediateValue(undefined);
      const gradientValue = formatGradientValue(nextGradient);
      setRepeatedStyleItem(
        styleDecl,
        index,
        { type: "unparsed", value: gradientValue },
        { isEphemeral }
      );
      if (isEphemeral === false) {
        saveLocalGradient();
      }
    },
    [index, saveLocalGradient, setLocalGradient, styleDecl]
  );

  const handlePickerChange = useCallback(
    (nextGradient: ParsedGradient) => {
      applyGradient(nextGradient, { isEphemeral: true });
    },
    [applyGradient]
  );

  const handlePickerChangeComplete = useCallback(
    (nextGradient: ParsedGradient) => {
      applyGradient(nextGradient);
    },
    [applyGradient]
  );

  const handleStopColorChange = useCallback(
    (color: GradientStop["color"], options?: { isEphemeral?: boolean }) => {
      const isEphemeral = options?.isEphemeral ?? true;
      const stopIndex = clampStopIndex(selectedStopIndex, gradient);
      const stops = gradient.stops.map((stop, index) =>
        index === stopIndex
          ? {
              ...stop,
              color:
                color?.type === "var" && stop.color?.type === "var"
                  ? {
                      ...color,
                      fallback:
                        color.fallback === undefined
                          ? cloneVarFallback(stop.color.fallback)
                          : cloneVarFallback(color.fallback),
                    }
                  : color,
            }
          : stop
      );
      applyGradient({ ...gradient, stops }, { isEphemeral });
    },
    [applyGradient, gradient, selectedStopIndex]
  );

  const safeSelectedStopIndex = clampStopIndex(selectedStopIndex, gradient);
  const selectedStop = gradient.stops[safeSelectedStopIndex];
  const selectedStopPositionValue = selectedStop?.position;
  const selectedStopHintOverride = hintOverrides.get(safeSelectedStopIndex);
  const selectedStopHintValue = selectedStop?.hint ?? selectedStopHintOverride;
  const selectedStopColor = selectedStop?.color ?? fallbackStopColor;

  const updateSelectedStop = useCallback(
    (
      updater: (stop: GradientStop) => GradientStop,
      options?: { isEphemeral?: boolean }
    ) => {
      const stopIndex = clampStopIndex(selectedStopIndex, gradient);
      const currentStop = gradient.stops[stopIndex];
      if (currentStop === undefined) {
        return;
      }
      const stops = gradient.stops.map((stop, index) =>
        index === stopIndex ? updater(stop) : stop
      );
      const nextGradient = { ...gradient, stops };
      applyGradient(nextGradient, options);
    },
    [applyGradient, gradient, selectedStopIndex]
  );

  const handleAngleUpdate = useCallback(
    (styleValue: StyleValue, options?: { isEphemeral?: boolean }) => {
      const angleValue = resolveAngleValue(styleValue);
      if (angleValue === undefined) {
        return;
      }
      if (isLinearGradient(gradient)) {
        applyGradient(
          {
            ...gradient,
            angle: angleValue,
            sideOrCorner: undefined,
          },
          options
        );
        return;
      }

      applyGradient(
        {
          ...gradient,
          angle: angleValue,
        },
        options
      );
    },
    [applyGradient, gradient]
  );

  const handleAngleDelete = useCallback(
    (options?: { isEphemeral?: boolean }) => {
      const nextGradient: ParsedGradient = {
        ...gradient,
        angle: undefined,
      };
      applyGradient(nextGradient, options);
    },
    [applyGradient, gradient]
  );

  const handleStopPositionUpdate = useCallback(
    (styleValue: StyleValue, options?: { isEphemeral?: boolean }) => {
      const stopIndex = clampStopIndex(selectedStopIndex, gradient);
      const resolution = resolveStopPositionUpdate(styleValue);
      if (resolution.type === "none") {
        return;
      }

      updateSelectedStop(
        (stop) => ({
          ...stop,
          position: resolution.position,
        }),
        options
      );

      if (!options?.isEphemeral && resolution.clearHintOverrides) {
        setHintOverrides((previous) => removeHintOverride(previous, stopIndex));
      }
    },
    [gradient, selectedStopIndex, updateSelectedStop]
  );

  const handleStopPositionDelete = useCallback(
    (options?: { isEphemeral?: boolean }) => {
      updateSelectedStop((stop) => {
        const { position: _omit, ...rest } = stop;
        return rest;
      }, options);
    },
    [updateSelectedStop]
  );

  const handleStopHintUpdate = useCallback(
    (styleValue: StyleValue, options?: { isEphemeral?: boolean }) => {
      const stopIndex = clampStopIndex(selectedStopIndex, gradient);
      const resolution = resolveStopHintUpdate(styleValue, {
        getPercentUnit,
        clampPercentUnit: (value) => ({
          ...value,
          value: clamp(value.value, 0, 100),
        }),
      });

      if (resolution.type === "none") {
        return;
      }

      updateSelectedStop(
        (stop) => ({
          ...stop,
          hint: resolution.hint,
        }),
        options
      );

      if (options?.isEphemeral) {
        return;
      }

      if (resolution.clearOverride) {
        setHintOverrides((previous) => removeHintOverride(previous, stopIndex));
        return;
      }

      const override = resolution.override;
      if (override !== undefined) {
        setHintOverrides((previous) =>
          setHintOverride(previous, stopIndex, override)
        );
      }
    },
    [gradient, selectedStopIndex, updateSelectedStop]
  );

  const handleStopHintDelete = useCallback(
    (options?: { isEphemeral?: boolean }) => {
      const stopIndex = clampStopIndex(selectedStopIndex, gradient);
      updateSelectedStop((stop) => {
        const { hint: _omit, ...rest } = stop;
        return { ...rest };
      }, options);
      if (!options?.isEphemeral) {
        setHintOverrides((previous) => removeHintOverride(previous, stopIndex));
      }
    },
    [gradient, selectedStopIndex, updateSelectedStop]
  );

  const handleRepeatChange = useCallback(
    (value: string) => {
      if (value !== "repeat" && value !== "no-repeat") {
        return;
      }
      const repeating = value === "repeat";
      setIsRepeating(repeating);
      applyGradient({ ...gradient, repeating });
    },
    [applyGradient, gradient]
  );

  const applyStyleValueToStop = useCallback(
    (
      styleValue: StyleValue | IntermediateColorValue | undefined,
      options?: { isEphemeral?: boolean }
    ) => {
      const isEphemeral = options?.isEphemeral ?? true;
      const nextColor = styleValueToColor(styleValue);
      if (nextColor) {
        handleStopColorChange(nextColor, { isEphemeral });
      }
    },
    [handleStopColorChange]
  );

  const handleColorPickerChange = useCallback(
    (styleValue: StyleValue | IntermediateColorValue | undefined) => {
      applyStyleValueToStop(styleValue);
    },
    [applyStyleValueToStop]
  );

  const handleColorPickerChangeComplete = useCallback(
    (styleValue: StyleValue) => {
      applyStyleValueToStop(styleValue, { isEphemeral: false });
    },
    [applyStyleValueToStop]
  );

  const handleReverseStops = useCallback(() => {
    const resolution = resolveReverseStops(gradient, selectedStopIndex);
    if (resolution.type === "none") {
      return;
    }
    setSelectedStopIndex(resolution.selectedStopIndex);
    applyGradient(resolution.gradient);
  }, [applyGradient, gradient, selectedStopIndex]);

  const handleChange = (value: string) => {
    setIntermediateValue({
      type: "intermediate",
      value,
    });

    // This doesn't have the same behavior as CssValueInput.
    // However, it's great to see the immediate results when making gradient changes,
    // especially until we have a better gradient tool.
    const newValue = parseCssValue("background-image", value);

    if (newValue.type === "unparsed" || newValue.type === "var") {
      setRepeatedStyleItem(styleDecl, index, newValue, { isEphemeral: true });
      return;
    }

    // Set backgroundImage at layer to none if it's invalid
    setRepeatedStyleItem(
      styleDecl,
      index,
      { type: "keyword", value: "none" },
      { isEphemeral: true }
    );
  };

  const handleOnComplete = () => {
    if (intermediateValue === undefined) {
      return;
    }

    const parsed = parseCssFragment(intermediateValue.value, [
      "background-image",
      "background",
    ]);
    const backgroundImage = parsed.get("background-image");
    const backgroundColor = parsed.get("background-color");

    // set invalid state
    if (backgroundColor?.type === "invalid" || backgroundImage === undefined) {
      setIntermediateValue({ type: "invalid", value: intermediateValue.value });
      if (styleValue) {
        setRepeatedStyleItem(styleDecl, index, styleValue, {
          isEphemeral: true,
        });
      }
      return;
    }
    setIntermediateValue(undefined);
    if (backgroundColor && isTransparent(backgroundColor) === false) {
      setProperty("background-color")(backgroundColor);
    }
    // insert all new layers at current position
    editRepeatedStyleItem(
      [styleDecl],
      index,
      new Map([["background-image", backgroundImage]])
    );
  };

  const handleOnCompleteRef = useRef(handleOnComplete);
  handleOnCompleteRef.current = handleOnComplete;

  // Blur wouldn't fire if user clicks outside of the FloatingPanel
  useEffect(() => {
    return () => {
      handleOnCompleteRef.current();
    };
  }, []);

  return (
    <Flex
      direction="column"
      css={{
        padding: theme.spacing[5],
        gap: theme.spacing[5],
      }}
    >
      <Box css={{ paddingInline: theme.spacing[2] }}>
        <GradientPicker
          gradient={gradientForPicker}
          type={gradientType}
          onChange={handlePickerChange}
          onChangeComplete={handlePickerChangeComplete}
          onThumbSelect={(index) => {
            setSelectedStopIndex(index);
          }}
        />
      </Box>
      <Grid gap="2" columns="3" align="end">
        <Label>Color</Label>
        <Flex gap="2" css={{ gridColumn: "span 2" }}>
          <ColorPicker
            property="color"
            value={selectedStopColor}
            currentColor={selectedStopColor}
            onChange={handleColorPickerChange}
            onChangeComplete={handleColorPickerChangeComplete}
            onAbort={() => {
              // no-op: gradient changes are managed via GradientPicker callbacks
            }}
            onReset={() => {
              // no-op: gradient changes are managed via GradientPicker callbacks
            }}
          />
          <IconButton
            aria-label="Reverse gradient stops"
            onClick={handleReverseStops}
            disabled={gradient.stops.length <= 1}
          >
            <ArrowRightLeftIcon />
          </IconButton>
        </Flex>
      </Grid>
      <Grid align="end" gap="2" columns={3}>
        <Flex direction="column" gap="1">
          <Label>Stop</Label>
          <CssValueInputContainer
            property="background-position-x"
            styleSource="default"
            getOptions={() => $availableUnitVariables.get()}
            value={selectedStopPositionValue}
            unitOptions={percentUnitOptions}
            onUpdate={handleStopPositionUpdate}
            onDelete={handleStopPositionDelete}
          />
        </Flex>
        <Flex direction="column" gap="1">
          <Label>Hint</Label>
          <CssValueInputContainer
            property="background-position-x"
            styleSource="default"
            getOptions={() => $availableUnitVariables.get()}
            value={selectedStopHintValue}
            unitOptions={percentUnitOptions}
            onUpdate={handleStopHintUpdate}
            onDelete={handleStopHintDelete}
          />
        </Flex>
        <Flex direction="column" gap="1" css={{ minWidth: theme.spacing[17] }}>
          <Label>Repeat</Label>
          <ToggleGroup
            type="single"
            value={isRepeating ? "repeat" : "no-repeat"}
            aria-label="Gradient repeat"
            onValueChange={handleRepeatChange}
          >
            <ToggleGroupButton value="no-repeat" aria-label="No repeat">
              <XSmallIcon />
            </ToggleGroupButton>
            <ToggleGroupButton value="repeat" aria-label="Repeat">
              <RepeatGridIcon />
            </ToggleGroupButton>
          </ToggleGroup>
        </Flex>
        <Label css={{ alignSelf: "center" }}>Angle</Label>
        <Box css={{ gridColumn: "span 2" }}>
          <CssValueInputContainer
            property="rotate"
            styleSource="default"
            getOptions={() => $availableUnitVariables.get()}
            value={gradient.angle}
            unitOptions={angleUnitOptions}
            placeholder={anglePlaceholder}
            onUpdate={(value, options) => {
              handleAngleUpdate(value, options);
            }}
            onDelete={handleAngleDelete}
          />
        </Box>
      </Grid>
      <Label>
        <Flex align="center" gap="1">
          Code
          <Tooltip
            variant="wrapped"
            content={
              <Text>
                Paste a CSS gradient, for example:
                <br />
                <br />
                linear-gradient(...)
                <br />
                <br />
                If pasting from Figma, remove the "background" property name.
              </Text>
            }
          >
            <InfoCircleIcon />
          </Tooltip>
        </Flex>
      </Label>
      <CssFragmentEditor
        css={getCodeEditorCssVars({ minHeight: "40px", maxHeight: "40px" })}
        content={
          <CssFragmentEditorContent
            invalid={intermediateValue?.type === "invalid"}
            autoFocus={styleValue.type === "var"}
            value={textAreaValue ?? ""}
            onChange={handleChange}
            onChangeComplete={handleOnComplete}
          />
        }
      />
    </Flex>
  );
};

export const __testing__ = {
  normalizeGradientInput,
  getAnglePlaceholder,
  resolveAngleValue,
  sideOrCornerToAngle,
  fillMissingStopPositions,
  resolveGradientForPicker,
  removeHintOverride,
  setHintOverride,
  pruneHintOverrides,
  resolveReverseStops,
  resolveStopPositionUpdate,
  ensureGradientHasStops,
  clampStopIndex,
  styleValueToColor,
  resolveStopHintUpdate,
};
