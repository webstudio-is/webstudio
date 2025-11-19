import {
  toValue,
  type InvalidValue,
  type StyleValue,
  type UnitValue,
} from "@webstudio-is/css-engine";
import {
  parseCssValue,
  parseLinearGradient,
  parseConicGradient,
  parseRadialGradient,
  type ParsedGradient,
  type ParsedLinearGradient,
  type ParsedConicGradient,
  type ParsedRadialGradient,
  type GradientStop,
  formatLinearGradient,
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
  Select,
  ToggleGroup,
  ToggleGroupButton,
} from "@webstudio-is/design-system";
import { ColorPickerControl } from "../../shared/color-picker";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  ArrowRightLeftIcon,
  CircleIcon,
  EllipseIcon,
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
import {
  angleUnitOptions,
  clampStopIndex,
  cloneVarFallback,
  createDefaultGradient,
  createSolidLinearGradient,
  createPercentUnitValue,
  ensureGradientHasStops,
  fallbackStopColor,
  formatGradientPositionValues,
  formatGradientValue,
  getPercentUnit,
  gradientPositionXOptions,
  gradientPositionYOptions,
  isConicGradient,
  isLinearGradient,
  isRadialGradient,
  normalizeGradientInput,
  parseGradientPositionValues,
  percentUnitOptions,
  pruneHintOverrides,
  removeHintOverride,
  resolveAngleValue,
  resolveGradientForPicker,
  resolveReverseStops,
  resolveStopHintUpdate,
  resolveStopPositionUpdate,
  setHintOverride,
  styleValueToColor,
} from "./gradient-utils";
import { BackgroundPositionControl } from "./background-position";
import type {
  GradientType,
  IntermediateColorValue,
  PercentUnitValue,
} from "./gradient-utils";

type IntermediateValue = {
  type: "intermediate";
  value: string;
};

const radialSizeOptions = [
  "closest-side",
  "closest-corner",
  "farthest-side",
  "farthest-corner",
] as const;

type RadialSizeOption = (typeof radialSizeOptions)[number];

const radialSizeOptionsSet = new Set<RadialSizeOption>(radialSizeOptions);

const defaultRadialSize: RadialSizeOption = "farthest-corner";
const defaultRadialShape = "ellipse" as const;

const isTransparent = (color: StyleValue) =>
  color.type === "keyword" && color.value === "transparent";

const leftToRightAngle = {
  type: "unit",
  unit: "deg",
  value: 90,
} satisfies UnitValue;

type GradientEditorApplyFn = (
  nextGradient: ParsedGradient,
  options?: { isEphemeral?: boolean }
) => void;

export const BackgroundGradient = ({
  index,
  type: gradientType = "linear",
  variant = "default",
}: {
  index: number;
  type?: GradientType;
  variant?: "default" | "solid";
}) => {
  const styleDecl = useComputedStyleDecl("background-image");
  let styleValue = styleDecl.cascadedValue;
  if (styleValue.type === "layers") {
    styleValue = styleValue.value[index];
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
    if (gradientType === "conic") {
      const parsed =
        parseConicGradient(normalizedGradientString) ??
        createDefaultGradient("conic");
      return ensureGradientHasStops(parsed);
    }
    const parsed =
      parseRadialGradient(normalizedGradientString) ??
      createDefaultGradient("radial");
    return ensureGradientHasStops(parsed);
  }, [gradientType, normalizedGradientString]);

  const handleGradientSave = useCallback(
    (nextGradient: ParsedGradient) => {
      const gradientValue = formatGradientValue(nextGradient);
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
  const [codeEditorResetSignal, setCodeEditorResetSignal] = useState(0);
  const isSolidVariant = variant === "solid";

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

  const applyGradient = useCallback(
    (nextGradient: ParsedGradient, options?: { isEphemeral?: boolean }) => {
      const isEphemeral = options?.isEphemeral === true;
      setLocalGradient(nextGradient);
      setCodeEditorResetSignal((value) => value + 1);
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

  return (
    <Flex
      direction="column"
      css={{
        padding: theme.spacing[5],
        gap: theme.spacing[5],
      }}
    >
      {isSolidVariant ? (
        <SolidColorControls gradient={gradient} applyGradient={applyGradient} />
      ) : (
        <>
          <GradientPickerPanel
            gradient={gradient}
            gradientType={gradientType}
            hintOverrides={hintOverrides}
            setSelectedStopIndex={setSelectedStopIndex}
            applyGradient={applyGradient}
            styleDecl={styleDecl}
            index={index}
          />
          <GradientStopControls
            initialIsRepeating={initialIsRepeating}
            gradient={gradient}
            selectedStopIndex={selectedStopIndex}
            hintOverrides={hintOverrides}
            setHintOverrides={setHintOverrides}
            applyGradient={applyGradient}
            setSelectedStopIndex={setSelectedStopIndex}
          />
          <GradientControl gradient={gradient} applyGradient={applyGradient} />
          <GradientPositionControls
            gradient={gradient}
            applyGradient={applyGradient}
          />
        </>
      )}
      <GradientCodeEditor
        styleDecl={styleDecl}
        styleValue={styleValue}
        index={index}
        resetSignal={codeEditorResetSignal}
      />
    </Flex>
  );
};

type GradientPickerPanelProps = {
  gradient: ParsedGradient;
  gradientType: GradientType;
  hintOverrides: Map<number, PercentUnitValue>;
  setSelectedStopIndex: Dispatch<SetStateAction<number>>;
  applyGradient: GradientEditorApplyFn;
  styleDecl: ReturnType<typeof useComputedStyleDecl>;
  index: number;
};

const GradientPickerPanel = ({
  gradient,
  gradientType,
  hintOverrides,
  setSelectedStopIndex,
  applyGradient,
  styleDecl,
  index,
}: GradientPickerPanelProps) => {
  const parsedComputedGradient = useMemo(() => {
    let computedStyleValue = styleDecl.computedValue;
    if (computedStyleValue?.type === "layers") {
      computedStyleValue = computedStyleValue.value[index];
    }
    const computedGradientString = toValue(computedStyleValue);
    const { normalizedGradientString } = normalizeGradientInput(
      computedGradientString,
      gradientType
    );

    if (gradientType === "linear") {
      const parsed =
        parseLinearGradient(normalizedGradientString) ??
        createDefaultGradient("linear");
      return ensureGradientHasStops(parsed);
    }
    if (gradientType === "conic") {
      const parsed =
        parseConicGradient(normalizedGradientString) ??
        createDefaultGradient("conic");
      return ensureGradientHasStops(parsed);
    }
    const parsed =
      parseRadialGradient(normalizedGradientString) ??
      createDefaultGradient("radial");
    return ensureGradientHasStops(parsed);
  }, [gradientType, index, styleDecl]);

  const computedGradientForPicker = useMemo(() => {
    if (parsedComputedGradient === undefined) {
      return;
    }
    return resolveGradientForPicker(
      parsedComputedGradient,
      new Map<number, PercentUnitValue>()
    );
  }, [parsedComputedGradient]);

  const [isInteracting, setIsInteracting] = useState(false);

  const gradientForPicker = useMemo(() => {
    const base = resolveGradientForPicker(gradient, hintOverrides);
    if (isInteracting || computedGradientForPicker === undefined) {
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

    if (isRadialGradient(base) && isRadialGradient(computedGradientForPicker)) {
      return {
        ...base,
        shape: computedGradientForPicker.shape ?? base.shape,
        size: computedGradientForPicker.size ?? base.size,
        position: computedGradientForPicker.position ?? base.position,
        stops,
      } satisfies ParsedRadialGradient;
    }

    return {
      ...base,
      stops,
    } as ParsedGradient;
  }, [computedGradientForPicker, gradient, hintOverrides, isInteracting]);

  const handlePickerChange = useCallback(
    (nextGradient: ParsedGradient) => {
      setIsInteracting(true);
      applyGradient(nextGradient, { isEphemeral: true });
    },
    [applyGradient]
  );

  const handlePickerChangeComplete = useCallback(
    (nextGradient: ParsedGradient) => {
      setIsInteracting(false);
      applyGradient(nextGradient);
    },
    [applyGradient]
  );

  useEffect(() => {
    return () => {
      setIsInteracting(false);
    };
  }, []);

  const handleThumbSelect = useCallback(
    (index: number) => {
      setSelectedStopIndex(index);
    },
    [setSelectedStopIndex]
  );
  const previewGradientForTrack = useMemo<ParsedLinearGradient>(() => {
    const previewGradient: ParsedLinearGradient = {
      type: "linear",
      angle: leftToRightAngle,
      stops: gradientForPicker.stops,
    };
    if (gradientForPicker.repeating) {
      previewGradient.repeating = true;
    }
    return previewGradient;
  }, [gradientForPicker]);

  return (
    <Box css={{ paddingInline: theme.spacing[2] }}>
      <GradientPicker
        gradient={gradientForPicker}
        backgroundImage={formatLinearGradient(previewGradientForTrack)}
        type={gradientType}
        onChange={handlePickerChange}
        onChangeComplete={handlePickerChangeComplete}
        onThumbSelect={handleThumbSelect}
      />
    </Box>
  );
};

type SolidColorControlsProps = {
  gradient: ParsedGradient;
  applyGradient: GradientEditorApplyFn;
};

const SolidColorControls = ({
  gradient,
  applyGradient,
}: SolidColorControlsProps) => {
  const solidColor: StyleValue = (gradient.stops[0]?.color ??
    fallbackStopColor) as StyleValue;

  const applySolidColorValue = useCallback(
    (
      styleValue: StyleValue | IntermediateColorValue | undefined,
      options?: { isEphemeral?: boolean }
    ) => {
      const nextColor = styleValueToColor(styleValue);
      if (nextColor === undefined) {
        return;
      }
      const baseGradient = isLinearGradient(gradient) ? gradient : undefined;
      const nextGradient = createSolidLinearGradient(nextColor, baseGradient);
      applyGradient(nextGradient, options);
    },
    [applyGradient, gradient]
  );

  const handleColorChange = useCallback(
    (styleValue: StyleValue | IntermediateColorValue | undefined) => {
      applySolidColorValue(styleValue);
    },
    [applySolidColorValue]
  );

  const handleColorChangeComplete = useCallback(
    (styleValue: StyleValue) => {
      applySolidColorValue(styleValue, { isEphemeral: false });
    },
    [applySolidColorValue]
  );

  return (
    <Grid gap="2" columns="3" align="end">
      <Label>Color</Label>
      <Flex css={{ gridColumn: "span 2" }}>
        <ColorPickerControl
          property="color"
          value={solidColor}
          currentColor={solidColor}
          onChange={handleColorChange}
          onChangeComplete={handleColorChangeComplete}
          onAbort={() => {}}
          onReset={() => {}}
        />
      </Flex>
    </Grid>
  );
};

type GradientStopControlsProps = {
  initialIsRepeating: boolean;
  gradient: ParsedGradient;
  selectedStopIndex: number;
  hintOverrides: Map<number, PercentUnitValue>;
  setHintOverrides: Dispatch<SetStateAction<Map<number, PercentUnitValue>>>;
  applyGradient: GradientEditorApplyFn;
  setSelectedStopIndex: Dispatch<SetStateAction<number>>;
};

const GradientStopControls = ({
  initialIsRepeating,
  gradient,
  selectedStopIndex,
  hintOverrides,
  setHintOverrides,
  applyGradient,
  setSelectedStopIndex,
}: GradientStopControlsProps) => {
  const [isRepeating, setIsRepeating] = useState(initialIsRepeating);
  useEffect(() => {
    setIsRepeating(initialIsRepeating);
  }, [initialIsRepeating]);
  const isRadial = isRadialGradient(gradient);
  const reverseDisabled = gradient.stops.length <= 1;
  const safeSelectedStopIndex = clampStopIndex(selectedStopIndex, gradient);
  const selectedStop = gradient.stops[safeSelectedStopIndex];
  const selectedStopPositionValue = selectedStop?.position;
  const selectedStopHintOverride = hintOverrides.get(safeSelectedStopIndex);
  const selectedStopHintValue = selectedStop?.hint ?? selectedStopHintOverride;
  const selectedStopColor: StyleValue = (selectedStop?.color ??
    fallbackStopColor) as StyleValue;
  const currentRadialSize = isRadial ? gradient.size : undefined;
  const isPresetRadialSize =
    typeof currentRadialSize === "string" &&
    radialSizeOptionsSet.has(currentRadialSize as RadialSizeOption);
  const radialSizeValue = isRadial
    ? isPresetRadialSize
      ? (currentRadialSize as RadialSizeOption)
      : defaultRadialSize
    : undefined;
  const radialShapeValue = (() => {
    if (isRadial && gradient.shape) {
      const normalized = gradient.shape.value.toLowerCase();
      if (normalized === "circle" || normalized === "ellipse") {
        return normalized;
      }
    }
    return isRadial ? defaultRadialShape : undefined;
  })();

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
    [gradient, selectedStopIndex, setHintOverrides, updateSelectedStop]
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
    [gradient, selectedStopIndex, setHintOverrides, updateSelectedStop]
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
    [gradient, selectedStopIndex, setHintOverrides, updateSelectedStop]
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
    [applyGradient, gradient, setIsRepeating]
  );

  const handleReverseStops = useCallback(() => {
    const resolution = resolveReverseStops(gradient, selectedStopIndex);
    if (resolution.type === "none") {
      return;
    }
    setSelectedStopIndex(resolution.selectedStopIndex);
    applyGradient(resolution.gradient);
  }, [applyGradient, gradient, selectedStopIndex, setSelectedStopIndex]);

  const handleRadialSizeChange = useCallback(
    (nextSize?: RadialSizeOption) => {
      if (isRadialGradient(gradient) === false) {
        return;
      }
      const size = nextSize ?? defaultRadialSize;
      applyGradient({ ...gradient, size });
    },
    [applyGradient, gradient]
  );

  const handleEndingShapeChange = useCallback(
    (nextShape?: string) => {
      if (isRadialGradient(gradient) === false) {
        return;
      }
      const shapeValue =
        nextShape === "circle" || nextShape === "ellipse"
          ? nextShape
          : defaultRadialShape;
      applyGradient({
        ...gradient,
        shape: { type: "keyword", value: shapeValue },
      });
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

  const getAvailableUnitVariables = useCallback(
    () => $availableUnitVariables.get(),
    []
  );

  useEffect(() => {
    if (isRadialGradient(gradient) === false) {
      return;
    }
    const updates: Partial<ParsedRadialGradient> = {};
    if (gradient.size === undefined) {
      updates.size = defaultRadialSize;
    }
    const normalizedShape = gradient.shape?.value.toLowerCase();
    if (normalizedShape !== "circle" && normalizedShape !== "ellipse") {
      updates.shape = { type: "keyword", value: defaultRadialShape };
    }
    if (Object.keys(updates).length > 0) {
      applyGradient({ ...gradient, ...updates });
    }
  }, [applyGradient, gradient]);

  return (
    <>
      <Grid gap="2" columns="3" align="end">
        <Label>Color</Label>
        <Flex gap="2" css={{ gridColumn: "span 2" }}>
          <ColorPickerControl
            property="color"
            value={selectedStopColor}
            currentColor={selectedStopColor}
            onChange={handleColorPickerChange}
            onChangeComplete={handleColorPickerChangeComplete}
            onAbort={() => {}}
            onReset={() => {}}
          />
          <IconButton
            aria-label="Reverse gradient stops"
            onClick={handleReverseStops}
            disabled={reverseDisabled}
          >
            <ArrowRightLeftIcon />
          </IconButton>
        </Flex>
      </Grid>
      <Grid align="end" gap="2" columns={3}>
        <Flex direction="column" gap="1">
          <Label>Stop</Label>
          <CssValueInputContainer
            property={"background-position-x"}
            styleSource="default"
            getOptions={getAvailableUnitVariables}
            value={selectedStopPositionValue}
            unitOptions={percentUnitOptions}
            onUpdate={handleStopPositionUpdate}
            onDelete={handleStopPositionDelete}
          />
        </Flex>
        <Flex direction="column" gap="1">
          <Label>Hint</Label>
          <CssValueInputContainer
            property={"background-position-x"}
            styleSource="default"
            getOptions={getAvailableUnitVariables}
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
            <Tooltip
              variant="wrapped"
              content="Render the gradient once (background-repeat: no-repeat)."
            >
              <ToggleGroupButton value="no-repeat" aria-label="No repeat">
                <XSmallIcon />
              </ToggleGroupButton>
            </Tooltip>
            <Tooltip
              variant="wrapped"
              content="Tile the gradient across the layer (background-repeat: repeat)."
            >
              <ToggleGroupButton value="repeat" aria-label="Repeat">
                <RepeatGridIcon />
              </ToggleGroupButton>
            </Tooltip>
          </ToggleGroup>
        </Flex>
      </Grid>
      {isRadial && (
        <Grid align="end" gap="2" columns={3}>
          <Flex
            align="center"
            gap="2"
            css={{ gridColumn: "span 2", width: "100%" }}
          >
            <Label css={{ whiteSpace: "nowrap" }}>Size</Label>
            <Select
              options={radialSizeOptions}
              value={radialSizeValue}
              fullWidth
              onChange={(size) => handleRadialSizeChange(size)}
            />
          </Flex>
          <Flex
            direction="column"
            gap="1"
            css={{ minWidth: theme.spacing[17] }}
          >
            <ToggleGroup
              type="single"
              value={radialShapeValue}
              aria-label="Radial ending shape"
              onValueChange={handleEndingShapeChange}
            >
              <Tooltip
                variant="wrapped"
                content="Use an ellipse ending shape (radial-gradient ellipse)."
              >
                <ToggleGroupButton value="ellipse" aria-label="Ellipse">
                  <EllipseIcon />
                </ToggleGroupButton>
              </Tooltip>
              <Tooltip
                variant="wrapped"
                content="Use a circle ending shape (radial-gradient circle)."
              >
                <ToggleGroupButton value="circle" aria-label="Circle">
                  <CircleIcon />
                </ToggleGroupButton>
              </Tooltip>
            </ToggleGroup>
          </Flex>
        </Grid>
      )}
    </>
  );
};

type GradientControlProps = {
  gradient: ParsedGradient;
  applyGradient: GradientEditorApplyFn;
};

const GradientControl = ({ gradient, applyGradient }: GradientControlProps) => {
  const isLinear = isLinearGradient(gradient);
  const isConic = isConicGradient(gradient);
  const supportsAngle = isLinear || isConic;

  const angleValue = supportsAngle ? gradient.angle : undefined;

  const handleAngleUpdate = useCallback(
    (styleValue: StyleValue, options?: { isEphemeral?: boolean }) => {
      if (supportsAngle === false) {
        return;
      }
      const angleValue = resolveAngleValue(styleValue);
      if (angleValue === undefined) {
        return;
      }
      if (isLinear) {
        applyGradient(
          {
            ...(gradient as ParsedLinearGradient),
            angle: angleValue,
            sideOrCorner: undefined,
          },
          options
        );
        return;
      }

      applyGradient(
        {
          ...(gradient as ParsedConicGradient),
          angle: angleValue,
        },
        options
      );
    },
    [applyGradient, gradient, isLinear, supportsAngle]
  );

  const handleAngleDelete = useCallback(
    (options?: { isEphemeral?: boolean }) => {
      if (supportsAngle === false) {
        return;
      }
      const nextGradient: ParsedGradient = {
        ...gradient,
        angle: undefined,
      };
      applyGradient(nextGradient, options);
    },
    [applyGradient, gradient, supportsAngle]
  );

  const getAvailableUnitVariables = useCallback(
    () => $availableUnitVariables.get(),
    []
  );

  if (supportsAngle === false) {
    return;
  }

  return (
    <Grid align="center" gap="2" columns={3}>
      <Label>Angle</Label>
      <Box css={{ gridColumn: "span 2" }}>
        <CssValueInputContainer
          property="rotate"
          styleSource="default"
          getOptions={getAvailableUnitVariables}
          value={angleValue}
          unitOptions={angleUnitOptions}
          onUpdate={handleAngleUpdate}
          onDelete={handleAngleDelete}
        />
      </Box>
    </Grid>
  );
};

type GradientPositionControlsProps = {
  gradient: ParsedGradient;
  applyGradient: GradientEditorApplyFn;
};

const GradientPositionControls = ({
  gradient,
  applyGradient,
}: GradientPositionControlsProps) => {
  const supportsPosition =
    isRadialGradient(gradient) || isConicGradient(gradient);

  const gradientWithPosition = supportsPosition
    ? (gradient as ParsedRadialGradient | ParsedConicGradient)
    : undefined;

  const positionValue = gradientWithPosition?.position;

  const { xValue, yValue } = useMemo(
    () =>
      positionValue
        ? parseGradientPositionValues(positionValue)
        : { xValue: undefined, yValue: undefined },
    [positionValue]
  );

  const updatePosition = useCallback(
    (
      nextX: StyleValue | undefined,
      nextY: StyleValue | undefined,
      options?: { isEphemeral?: boolean }
    ) => {
      if (gradientWithPosition === undefined) {
        return;
      }
      const position = formatGradientPositionValues(nextX, nextY);
      applyGradient(
        {
          ...gradientWithPosition,
          position,
        },
        options
      );
    },
    [applyGradient, gradientWithPosition]
  );

  const handleAxisUpdate = useCallback(
    (axis: "x" | "y") =>
      (styleValue: StyleValue, options?: { isEphemeral?: boolean }) => {
        updatePosition(
          axis === "x" ? styleValue : xValue,
          axis === "y" ? styleValue : yValue,
          options
        );
      },
    [updatePosition, xValue, yValue]
  );

  const handleAxisDelete = useCallback(
    (axis: "x" | "y") => (options?: { isEphemeral?: boolean }) => {
      updatePosition(
        axis === "x" ? undefined : xValue,
        axis === "y" ? undefined : yValue,
        options
      );
    },
    [updatePosition, xValue, yValue]
  );

  const handleGridSelect = useCallback(
    ({ x, y }: { x: number; y: number }) => {
      updatePosition(createPercentUnitValue(x), createPercentUnitValue(y));
    },
    [updatePosition]
  );

  if (supportsPosition === false || gradientWithPosition === undefined) {
    return;
  }

  return (
    <BackgroundPositionControl
      label="Position"
      xAxis={{
        label: "Left",
        description: "Left position offset",
        property: "--gradient-position-x",
        value: xValue,
        getOptions: () => gradientPositionXOptions,
        unitOptions: percentUnitOptions,
        onUpdate: handleAxisUpdate("x"),
        onDelete: handleAxisDelete("x"),
      }}
      yAxis={{
        label: "Top",
        description: "Top position offset",
        property: "--gradient-position-y",
        value: yValue,
        getOptions: () => gradientPositionYOptions,
        unitOptions: percentUnitOptions,
        onUpdate: handleAxisUpdate("y"),
        onDelete: handleAxisDelete("y"),
      }}
      onSelect={handleGridSelect}
    />
  );
};

type GradientCodeEditorProps = {
  styleDecl: ReturnType<typeof useComputedStyleDecl>;
  styleValue: StyleValue;
  index: number;
  resetSignal: number;
};

const GradientCodeEditor = ({
  styleDecl,
  styleValue,
  index,
  resetSignal,
}: GradientCodeEditorProps) => {
  const [intermediateValue, setIntermediateValue] = useState<
    IntermediateValue | InvalidValue | undefined
  >(undefined);
  useEffect(() => {
    setIntermediateValue(undefined);
  }, [resetSignal]);
  const textAreaValue = intermediateValue?.value ?? toValue(styleValue);

  const handleChange = useCallback(
    (value: string) => {
      setIntermediateValue({
        type: "intermediate",
        value,
      });

      const newValue = parseCssValue("background-image", value);

      if (newValue.type === "unparsed" || newValue.type === "var") {
        setRepeatedStyleItem(styleDecl, index, newValue, { isEphemeral: true });
        return;
      }

      setRepeatedStyleItem(
        styleDecl,
        index,
        { type: "keyword", value: "none" },
        { isEphemeral: true }
      );
    },
    [index, setIntermediateValue, styleDecl]
  );

  const handleOnComplete = useCallback(() => {
    if (intermediateValue === undefined) {
      return;
    }

    const parsed = parseCssFragment(intermediateValue.value, [
      "background-image",
      "background",
    ]);
    const backgroundImage = parsed.get("background-image");
    const backgroundColor = parsed.get("background-color");

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
    editRepeatedStyleItem(
      [styleDecl],
      index,
      new Map([["background-image", backgroundImage]])
    );
  }, [index, intermediateValue, setIntermediateValue, styleDecl, styleValue]);

  const handleOnCompleteRef = useRef(handleOnComplete);
  useEffect(() => {
    handleOnCompleteRef.current = handleOnComplete;
  }, [handleOnComplete]);

  useEffect(() => {
    return () => {
      handleOnCompleteRef.current();
    };
  }, []);

  return (
    <>
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
        css={getCodeEditorCssVars({ minHeight: "4lh", maxHeight: "4lh" })}
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
    </>
  );
};
