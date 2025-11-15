import {
  toValue,
  type InvalidValue,
  type StyleValue,
  type RgbValue,
  type UnitValue,
  type KeywordValue,
} from "@webstudio-is/css-engine";
import {
  parseCssValue,
  parseLinearGradient,
  reconstructLinearGradient,
  type ParsedGradient,
  type GradientStop,
} from "@webstudio-is/css-data";
import {
  Flex,
  Label,
  Text,
  theme,
  Tooltip,
  GradientPicker,
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
import { useComputedStyleDecl } from "../../shared/model";
import {
  editRepeatedStyleItem,
  setRepeatedStyleItem,
} from "../../shared/repeated-style";
import {
  parseCssFragment,
  CssFragmentEditor,
  CssFragmentEditorContent,
} from "../../shared/css-fragment";
import { colord, extend } from "colord";
import namesPlugin from "colord/plugins/names";
import { useLocalValue } from "../../../settings-panel/shared";
import { CssValueInputContainer } from "../../shared/css-value-input";

extend([namesPlugin]);

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

const fillMissingStopPositions = (gradient: ParsedGradient): ParsedGradient => {
  const stops = gradient.stops;
  if (stops.length === 0) {
    return gradient;
  }

  const hasMissingPositions = stops.some((stop) => stop.position === undefined);
  if (hasMissingPositions === false) {
    return gradient;
  }

  const hasNonPercentPosition = stops.some(
    (stop) => stop.position !== undefined && stop.position.unit !== "%"
  );
  if (hasNonPercentPosition) {
    return gradient;
  }

  const totalStops = stops.length;
  const values = stops.map((stop) => stop.position?.value);
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
  };
};

const defaultGradient: ParsedGradient = {
  stops: [
    {
      color: { type: "rgb", r: 0, g: 0, b: 0, alpha: 1 },
      position: { type: "unit", unit: "%", value: 0 },
    },
    {
      color: { type: "rgb", r: 255, g: 255, b: 255, alpha: 1 },
      position: { type: "unit", unit: "%", value: 100 },
    },
  ],
};

const colordToRgbValue = (instance: ReturnType<typeof colord>) => {
  const rgb = instance.toRgb();
  return {
    type: "rgb" as const,
    r: rgb.r,
    g: rgb.g,
    b: rgb.b,
    alpha: rgb.a,
  } satisfies RgbValue;
};

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

const styleValueToRgb = (
  styleValue: StyleValue | IntermediateColorValue | undefined
): RgbValue | undefined => {
  if (styleValue === undefined) {
    return;
  }

  if (styleValue.type === "intermediate") {
    const parsed = colord(styleValue.value);
    if (parsed.isValid()) {
      return colordToRgbValue(parsed);
    }
    return;
  }

  if (styleValue.type === "rgb") {
    return styleValue;
  }

  if (styleValue.type === "keyword" || styleValue.type === "invalid") {
    const parsed = colord(styleValue.value);
    if (parsed.isValid()) {
      return colordToRgbValue(parsed);
    }
    return;
  }

  if (styleValue.type === "var") {
    // Variables are not supported for gradient stops editing.
    return;
  }

  const parsed = colord(toValue(styleValue));
  if (parsed.isValid()) {
    return colordToRgbValue(parsed);
  }
};

export const BackgroundLinearGradient = ({ index }: { index: number }) => {
  const styleDecl = useComputedStyleDecl("background-image");
  let styleValue = styleDecl.cascadedValue;
  if (styleValue.type === "layers") {
    styleValue = styleValue.value[index];
  }

  const gradientString = toValue(styleValue);
  const { normalizedGradientString, initialIsRepeating } = useMemo(() => {
    const leadingWhitespaceMatch = gradientString.match(/^\s*/);
    const leadingWhitespace = leadingWhitespaceMatch?.[0] ?? "";
    const withoutLeading = gradientString.slice(leadingWhitespace.length);
    const lowerCase = withoutLeading.toLowerCase();

    if (lowerCase.startsWith("repeating-linear-gradient")) {
      const suffix = withoutLeading.slice("repeating-linear-gradient".length);
      return {
        normalizedGradientString: `${leadingWhitespace}linear-gradient${suffix}`,
        initialIsRepeating: true,
      };
    }

    return {
      normalizedGradientString: gradientString,
      initialIsRepeating: false,
    };
  }, [gradientString]);

  const parsedGradient = useMemo(() => {
    const parsed = parseLinearGradient(normalizedGradientString);
    if (parsed === undefined) {
      return;
    }
    return parsed;
  }, [normalizedGradientString]);

  const initialGradient = parsedGradient ?? defaultGradient;
  const [isRepeating, setIsRepeating] = useState(initialIsRepeating);
  const isRepeatingRef = useRef(isRepeating);

  useEffect(() => {
    isRepeatingRef.current = isRepeating;
  }, [isRepeating]);

  useEffect(() => {
    setIsRepeating(initialIsRepeating);
    isRepeatingRef.current = initialIsRepeating;
  }, [initialIsRepeating]);

  const formatGradientValue = useCallback(
    (nextGradient: ParsedGradient, repeating = isRepeatingRef.current) => {
      const linearGradient = reconstructLinearGradient(nextGradient);
      if (repeating) {
        return linearGradient.replace(
          /^linear-gradient/i,
          "repeating-linear-gradient"
        );
      }
      return linearGradient;
    },
    []
  );
  const handleGradientSave = useCallback(
    (nextGradient: ParsedGradient) => {
      const gradientValue = formatGradientValue(nextGradient);
      // TODO maybe used a more structured representation
      const style: StyleValue = { type: "unparsed", value: gradientValue };
      setRepeatedStyleItem(styleDecl, index, style);
    },
    [formatGradientValue, index, setRepeatedStyleItem, styleDecl]
  );

  const {
    value: gradient,
    set: setLocalGradient,
    save: saveLocalGradient,
  } = useLocalValue<ParsedGradient>(initialGradient, handleGradientSave, {
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
    if (gradient.stops.length === 0) {
      setSelectedStopIndex(0);
      return;
    }

    setSelectedStopIndex((currentIndex) => {
      if (currentIndex < 0) {
        return 0;
      }
      if (currentIndex >= gradient.stops.length) {
        return gradient.stops.length - 1;
      }
      return currentIndex;
    });
  }, [gradient]);

  useEffect(() => {
    setHintOverrides((previous) => {
      if (previous.size === 0) {
        return previous;
      }
      let changed = false;
      const next = new Map(previous);
      for (const [index] of previous) {
        if (index >= gradient.stops.length) {
          next.delete(index);
          changed = true;
        }
      }
      return changed ? next : previous;
    });
  }, [gradient]);

  const gradientForPicker = useMemo(() => {
    const filled = fillMissingStopPositions(gradient);
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
    };
  }, [gradient, hintOverrides]);

  const anglePlaceholder = useMemo(() => {
    if (gradient.angle !== undefined) {
      return;
    }
    const derived = sideOrCornerToAngle(gradient.sideOrCorner);
    if (derived !== undefined) {
      return `${derived}deg`;
    }
    return "180deg";
  }, [gradient.angle, gradient.sideOrCorner]);

  const textAreaValue = intermediateValue?.value ?? toValue(styleValue);

  const previewGradient = useCallback(
    (nextGradient: ParsedGradient, options?: { repeating?: boolean }) => {
      setLocalGradient(nextGradient);
      const gradientValue = formatGradientValue(
        nextGradient,
        options?.repeating
      );
      const style: StyleValue = { type: "unparsed", value: gradientValue };
      setRepeatedStyleItem(styleDecl, index, style, { isEphemeral: true });
      setIntermediateValue(undefined);
    },
    [
      formatGradientValue,
      index,
      setLocalGradient,
      setRepeatedStyleItem,
      styleDecl,
    ]
  );

  const commitGradient = useCallback(
    (nextGradient: ParsedGradient, options?: { repeating?: boolean }) => {
      setLocalGradient(nextGradient);
      setIntermediateValue(undefined);
      const gradientValue = formatGradientValue(
        nextGradient,
        options?.repeating
      );
      setRepeatedStyleItem(styleDecl, index, {
        type: "unparsed",
        value: gradientValue,
      });
      saveLocalGradient();
    },
    [
      formatGradientValue,
      index,
      saveLocalGradient,
      setLocalGradient,
      setRepeatedStyleItem,
      styleDecl,
    ]
  );

  const handleStopColorChange = useCallback(
    (color: RgbValue, options?: { commit?: boolean }) => {
      const stops = gradient.stops.map((stop, index) =>
        index === selectedStopIndex ? { ...stop, color } : stop
      );
      const nextGradient = { ...gradient, stops };
      if (options?.commit) {
        commitGradient(nextGradient);
      } else {
        previewGradient(nextGradient);
      }
    },
    [commitGradient, gradient, previewGradient, selectedStopIndex]
  );

  const selectedStop = gradient.stops[selectedStopIndex];
  const selectedStopForDisplay = gradientForPicker.stops[selectedStopIndex];
  const selectedStopHintOverride = hintOverrides.get(selectedStopIndex);
  const selectedStopHintValue = selectedStop?.hint ?? selectedStopHintOverride;
  const selectedStopHintPlaceholder =
    selectedStopHintValue === undefined &&
    selectedStopForDisplay?.position !== undefined
      ? `${selectedStopForDisplay.position.value}%`
      : undefined;

  const updateSelectedStop = useCallback(
    (updater: (stop: GradientStop) => GradientStop, isEphemeral: boolean) => {
      if (gradient.stops[selectedStopIndex] === undefined) {
        return;
      }
      const stops = gradient.stops.map((stop, index) =>
        index === selectedStopIndex ? updater(stop) : stop
      );
      const nextGradient = { ...gradient, stops };
      if (isEphemeral) {
        previewGradient(nextGradient);
        return;
      }
      commitGradient(nextGradient);
    },
    [commitGradient, gradient, previewGradient, selectedStopIndex]
  );

  type AngleUnitValue = UnitValue & { unit: AngleUnit };
  type PercentUnitValue = UnitValue & { unit: "%" };

  const getAngleUnit = useCallback((styleValue: StyleValue | undefined) => {
    if (styleValue === undefined) {
      return;
    }

    if (styleValue.type === "unit" && isAngleUnit(styleValue.unit)) {
      return {
        ...styleValue,
        unit: styleValue.unit,
      } satisfies AngleUnitValue;
    }

    if (styleValue.type === "tuple") {
      const first = styleValue.value[0];
      if (first?.type === "unit" && isAngleUnit(first.unit)) {
        return {
          ...first,
          unit: first.unit,
        } satisfies AngleUnitValue;
      }
    }

    if (styleValue.type === "layers") {
      const firstLayer = styleValue.value[0];
      if (firstLayer?.type === "unit" && isAngleUnit(firstLayer.unit)) {
        return {
          ...firstLayer,
          unit: firstLayer.unit,
        } satisfies AngleUnitValue;
      }
    }
  }, []);

  const getPercentUnit = useCallback((styleValue: StyleValue | undefined) => {
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
  }, []);

  const clampPercentUnit = useCallback((value: PercentUnitValue) => {
    return {
      ...value,
      value: clamp(value.value, 0, 100),
    } satisfies PercentUnitValue;
  }, []);

  const handleAngleUpdate = useCallback(
    (styleValue: StyleValue, options?: { isEphemeral?: boolean }) => {
      const angleValue = getAngleUnit(styleValue);
      if (angleValue === undefined) {
        return;
      }
      const nextGradient: ParsedGradient = {
        ...gradient,
        angle: angleValue,
        sideOrCorner: undefined,
      };
      const isEphemeral = options?.isEphemeral === true;
      if (isEphemeral) {
        previewGradient(nextGradient);
        return;
      }
      commitGradient(nextGradient);
    },
    [commitGradient, getAngleUnit, gradient, previewGradient]
  );

  const handleAngleDelete = useCallback(
    (options?: { isEphemeral?: boolean }) => {
      const isEphemeral = options?.isEphemeral === true;
      const nextGradient: ParsedGradient = {
        ...gradient,
        angle: undefined,
      };
      if (isEphemeral) {
        previewGradient(nextGradient);
        return;
      }
      commitGradient(nextGradient);
    },
    [commitGradient, gradient, previewGradient]
  );

  const handleStopPositionUpdate = useCallback(
    (styleValue: StyleValue, options?: { isEphemeral?: boolean }) => {
      const percentUnit = getPercentUnit(styleValue);
      if (percentUnit === undefined) {
        return;
      }
      const nextPosition = clampPercentUnit(percentUnit);
      const isEphemeral = options?.isEphemeral === true;
      updateSelectedStop(
        (stop) => ({
          ...stop,
          position: nextPosition,
        }),
        isEphemeral
      );

      if (!isEphemeral) {
        setHintOverrides((previous) => {
          if (previous.size === 0) {
            return previous;
          }
          if (previous.has(selectedStopIndex) === false) {
            return previous;
          }
          const next = new Map(previous);
          next.delete(selectedStopIndex);
          return next;
        });
      }
    },
    [clampPercentUnit, getPercentUnit, selectedStopIndex, updateSelectedStop]
  );

  const handleStopPositionDelete = useCallback(
    (options?: { isEphemeral?: boolean }) => {
      const isEphemeral = options?.isEphemeral === true;
      updateSelectedStop((stop) => {
        const { position: _omit, ...rest } = stop;
        return { ...rest };
      }, isEphemeral);
    },
    [updateSelectedStop]
  );

  const handleStopHintUpdate = useCallback(
    (styleValue: StyleValue, options?: { isEphemeral?: boolean }) => {
      const percentUnit = getPercentUnit(styleValue);
      if (percentUnit === undefined) {
        return;
      }
      const nextHint = clampPercentUnit(percentUnit);
      const isEphemeral = options?.isEphemeral === true;
      updateSelectedStop(
        (stop) => ({
          ...stop,
          hint: nextHint,
        }),
        isEphemeral
      );

      if (isEphemeral === false) {
        setHintOverrides((previous) => {
          const next = new Map(previous);
          next.set(selectedStopIndex, nextHint);
          return next;
        });
      }
    },
    [clampPercentUnit, getPercentUnit, selectedStopIndex, updateSelectedStop]
  );

  const handleStopHintDelete = useCallback(
    (options?: { isEphemeral?: boolean }) => {
      const isEphemeral = options?.isEphemeral === true;
      updateSelectedStop((stop) => {
        const { hint: _omit, ...rest } = stop;
        return { ...rest };
      }, isEphemeral);
      if (isEphemeral === false) {
        setHintOverrides((previous) => {
          if (previous.has(selectedStopIndex) === false) {
            return previous;
          }
          const next = new Map(previous);
          next.delete(selectedStopIndex);
          return next;
        });
      }
    },
    [selectedStopIndex, updateSelectedStop]
  );

  const repeatToggleValue = isRepeating ? "repeat" : "no-repeat";

  const handleRepeatChange = useCallback(
    (value: string) => {
      if (value !== "repeat" && value !== "no-repeat") {
        return;
      }
      const repeating = value === "repeat";
      isRepeatingRef.current = repeating;
      setIsRepeating(repeating);
      commitGradient(gradient, { repeating });
    },
    [commitGradient, gradient]
  );

  const applyStyleValueToStop = useCallback(
    (
      styleValue: StyleValue | IntermediateColorValue | undefined,
      options?: { commit?: boolean }
    ) => {
      const rgb = styleValueToRgb(styleValue);
      if (rgb) {
        handleStopColorChange(rgb, options);
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
      applyStyleValueToStop(styleValue, { commit: true });
    },
    [applyStyleValueToStop]
  );

  const handleReverseStops = useCallback(() => {
    if (gradient.stops.length <= 1) {
      return;
    }
    const reversedStops = [...gradient.stops].reverse();
    const nextStops = reversedStops.map((stop) => {
      let position = stop.position;
      if (position?.type === "unit" && position.unit === "%") {
        position = {
          ...position,
          value: clamp(100 - position.value, 0, 100),
        };
      }
      return { ...stop, position };
    });
    const nextGradient = { ...gradient, stops: nextStops };
    setSelectedStopIndex(gradient.stops.length - 1 - selectedStopIndex);
    commitGradient(nextGradient);
  }, [commitGradient, gradient, selectedStopIndex]);

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
        gridColumn: "span 2",
        px: theme.spacing[5],
        py: theme.spacing[5],
        gap: theme.spacing[3],
      }}
    >
      <Box css={{ paddingInline: theme.spacing[2] }}>
        <GradientPicker
          gradient={gradientForPicker}
          onChange={previewGradient}
          onChangeComplete={commitGradient}
          onThumbSelect={(index) => {
            setSelectedStopIndex(index);
          }}
        />
      </Box>
      {selectedStop?.color ? (
        <Flex direction="column" gap="3">
          <Flex direction="column" gap="2">
            <Label>Color</Label>
            <Flex align="center" gap="2">
              <Box css={{ flexGrow: 1 }}>
                <ColorPicker
                  property="color"
                  value={selectedStop.color}
                  currentColor={selectedStop.color}
                  onChange={handleColorPickerChange}
                  onChangeComplete={handleColorPickerChangeComplete}
                  onAbort={() => {
                    // no-op: gradient changes are managed via GradientPicker callbacks
                  }}
                  onReset={() => {
                    // no-op: gradient changes are managed via GradientPicker callbacks
                  }}
                />
              </Box>
              <IconButton
                aria-label="Reverse gradient stops"
                onClick={handleReverseStops}
                disabled={gradient.stops.length <= 1}
              >
                <ArrowRightLeftIcon />
              </IconButton>
            </Flex>
          </Flex>
          <Flex
            gap="2"
            css={{
              flexWrap: "wrap",
            }}
          >
            <Flex direction="column" gap="1" css={{ flex: "1 1 0" }}>
              <Label>Stop</Label>
              <CssValueInputContainer
                property="background-position-x"
                styleSource="default"
                value={selectedStop.position}
                unitOptions={percentUnitOptions}
                placeholder={
                  selectedStop?.position === undefined &&
                  selectedStopForDisplay?.position !== undefined
                    ? `${selectedStopForDisplay.position.value}%`
                    : undefined
                }
                onUpdate={(value, options) => {
                  handleStopPositionUpdate(value, {
                    isEphemeral: options?.isEphemeral === true,
                  });
                }}
                onDelete={(options) => {
                  handleStopPositionDelete({
                    isEphemeral: options?.isEphemeral === true,
                  });
                }}
              />
            </Flex>
            <Flex direction="column" gap="1" css={{ flex: "1 1 0" }}>
              <Label>Hint</Label>
              <CssValueInputContainer
                property="background-position-x"
                styleSource="default"
                value={selectedStopHintValue}
                unitOptions={percentUnitOptions}
                placeholder={selectedStopHintPlaceholder}
                onUpdate={(value, options) => {
                  handleStopHintUpdate(value, {
                    isEphemeral: options?.isEphemeral === true,
                  });
                }}
                onDelete={(options) => {
                  handleStopHintDelete({
                    isEphemeral: options?.isEphemeral === true,
                  });
                }}
              />
            </Flex>
            <Flex
              direction="column"
              gap="1"
              css={{ minWidth: theme.spacing[17] }}
            >
              <Label>Repeat</Label>
              <ToggleGroup
                type="single"
                value={repeatToggleValue}
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
          </Flex>
        </Flex>
      ) : (
        <Text color="subtle">Select a gradient stop to edit its color.</Text>
      )}
      {parsedGradient === undefined && (
        <Text color="subtle">
          The current value isn't a linear gradient. Adjusting the controls will
          create a new linear gradient.
        </Text>
      )}
      <Flex direction="column" gap="1">
        <Label>Angle</Label>
        <CssValueInputContainer
          property="rotate"
          styleSource="default"
          value={gradient.angle}
          unitOptions={angleUnitOptions}
          placeholder={anglePlaceholder}
          onUpdate={(value, options) => {
            handleAngleUpdate(value, {
              isEphemeral: options?.isEphemeral === true,
            });
          }}
          onDelete={(options) => {
            handleAngleDelete({
              isEphemeral: options?.isEphemeral === true,
            });
          }}
        />
      </Flex>
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
