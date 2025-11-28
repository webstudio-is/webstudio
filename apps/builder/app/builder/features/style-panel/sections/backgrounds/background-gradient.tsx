import {
  toValue,
  type StyleValue,
  type UnitValue,
} from "@webstudio-is/css-engine";
import {
  type ParsedGradient,
  type ParsedLinearGradient,
  type ParsedConicGradient,
  type ParsedRadialGradient,
  type GradientStop,
  formatLinearGradient,
} from "@webstudio-is/css-data";
import {
  Flex,
  theme,
  Tooltip,
  GradientPicker,
  Grid,
  Box,
  IconButton,
  Select,
  Separator,
  ToggleGroup,
  ToggleGroupButton,
} from "@webstudio-is/design-system";
import { ColorPickerControl } from "../../shared/color-picker";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  ArrowRightLeftIcon,
  CircleIcon,
  EllipseIcon,
  MinusIcon,
  PlusIcon,
  RepeatGridIcon,
  XSmallIcon,
} from "@webstudio-is/icons";
import {
  useComputedStyleDecl,
  $availableUnitVariables,
} from "../../shared/model";
import { setRepeatedStyleItem } from "../../shared/repeated-style";
import { useLocalValue } from "../../../settings-panel/shared";
import { CssValueInputContainer } from "../../shared/css-value-input";
import { PropertyInlineLabel } from "../../property-label";
import {
  angleUnitOptions,
  clampStopIndex,
  createDefaultGradient,
  createSolidLinearGradient,
  createPercentUnitValue,
  ensureGradientHasStops,
  fallbackStopColor,
  formatGradientPositionValues,
  formatGradientValue,
  getDefaultAngle,
  getStopPosition,
  gradientPositionXOptions,
  gradientPositionYOptions,
  isConicGradient,
  isLinearGradient,
  isRadialGradient,
  normalizeGradientInput,
  parseAnyGradient,
  parseGradientPositionValues,
  percentUnitOptions,
  pruneHintOverrides,
  reindexHintOverrides,
  removeHintOverride,
  resolveAngleValue,
  resolveGradientForPicker,
  resolveReverseStops,
  resolveStopHintUpdate,
  resolveStopPositionUpdate,
  setHintOverride,
  sortGradientStops,
  styleValueToColor,
  updateGradientStop,
} from "./gradient-utils";
import { BackgroundPositionControl } from "./background-position";
import { BackgroundCodeEditor } from "./background-code-editor";
import type {
  GradientType,
  IntermediateColorValue,
  PercentUnitValue,
} from "./gradient-utils";

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

const leftToRightAngle = {
  type: "unit",
  unit: "deg",
  value: 90,
} satisfies UnitValue;

const radialSizeDescriptions: Record<RadialSizeOption, string> = {
  "closest-side": "Extends to the nearest edge of the container",
  "closest-corner": "Extends to the nearest corner of the container",
  "farthest-side": "Extends to the farthest edge of the container",
  "farthest-corner": "Extends to the farthest corner of the container",
};

const radialShapeDescriptions = {
  ellipse: "Use an ellipse ending shape (radial-gradient ellipse).",
  circle: "Use a circle ending shape (radial-gradient circle).",
} as const;

type GradientEditorApplyFn = (
  nextGradient: ParsedGradient,
  options?: { isEphemeral?: boolean }
) => void;

const getAvailableUnitVariables = () => $availableUnitVariables.get();

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
  let computedStyleValue = styleDecl.computedValue;
  if (styleValue.type === "layers") {
    styleValue = styleValue.value[index];
  }
  if (computedStyleValue.type === "layers") {
    computedStyleValue = computedStyleValue.value[index];
  }

  const gradientString = toValue(styleValue);
  const { normalizedGradientString, initialIsRepeating } =
    normalizeGradientInput(gradientString, gradientType);

  const parsedGradient = useMemo(() => {
    const parsed =
      parseAnyGradient(normalizedGradientString) ??
      createDefaultGradient(gradientType);
    return ensureGradientHasStops(parsed);
  }, [gradientType, normalizedGradientString]);

  const computedGradientString = toValue(computedStyleValue);
  const { normalizedGradientString: normalizedComputedGradientString } =
    normalizeGradientInput(computedGradientString, gradientType);

  const computedParsedGradient = useMemo(() => {
    const parsed =
      parseAnyGradient(normalizedComputedGradientString) ??
      createDefaultGradient(gradientType);
    return ensureGradientHasStops(parsed);
  }, [gradientType, normalizedComputedGradientString]);

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
  const [isRepeating, setIsRepeating] = useState(initialIsRepeating);
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

  useEffect(() => {
    setIsRepeating(initialIsRepeating);
  }, [initialIsRepeating]);

  const applyGradient = useCallback(
    (nextGradient: ParsedGradient, options?: { isEphemeral?: boolean }) => {
      const isEphemeral = options?.isEphemeral === true;

      // Only sort gradient stops on final (non-ephemeral) changes
      // This allows stops to visually cross during ephemeral updates (e.g., typing in inputs)
      let finalGradient: ParsedGradient;
      let finalHints: Map<number, PercentUnitValue>;

      if (isEphemeral) {
        // During ephemeral changes, apply the gradient as-is without sorting
        finalGradient = nextGradient;
        finalHints = hintOverrides;
      } else {
        // On complete, sort stops and reindex hint overrides to keep them in sync
        const { sortedGradient, reindexedHints } = sortGradientStops(
          nextGradient,
          hintOverrides
        );
        finalGradient = sortedGradient;
        finalHints = reindexedHints;
      }

      setLocalGradient(finalGradient);
      setHintOverrides(finalHints);

      const gradientValue = formatGradientValue(finalGradient);
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
    [index, saveLocalGradient, setLocalGradient, styleDecl, hintOverrides]
  );

  return (
    <Flex direction="column" justify="center" gap="2" shrink={false}>
      {isSolidVariant ? (
        <Box css={{ padding: theme.panel.padding }}>
          <SolidColorControls
            gradient={gradient}
            applyGradient={applyGradient}
          />
        </Box>
      ) : (
        <>
          <GradientPickerSection
            gradient={gradient}
            computedGradient={computedParsedGradient}
            gradientType={gradientType}
            hintOverrides={hintOverrides}
            setHintOverrides={setHintOverrides}
            setSelectedStopIndex={setSelectedStopIndex}
            applyGradient={applyGradient}
            selectedStopIndex={selectedStopIndex}
          />
          <Separator />
          <Box css={{ paddingInline: theme.panel.paddingInline }}>
            <OtherGradientPropertiesSection
              gradient={gradient}
              applyGradient={applyGradient}
              isRepeating={isRepeating}
              setIsRepeating={setIsRepeating}
            />
          </Box>
          <Box css={{ paddingInline: theme.panel.paddingInline }}>
            <GradientPositionControls
              gradient={gradient}
              applyGradient={applyGradient}
            />
          </Box>
        </>
      )}
      <Box
        css={{
          paddingInline: theme.panel.paddingInline,
          paddingBottom: theme.panel.paddingBlock,
        }}
      >
        <BackgroundCodeEditor index={index} />
      </Box>
    </Flex>
  );
};

type GradientPickerSectionProps = {
  gradient: ParsedGradient;
  computedGradient: ParsedGradient;
  gradientType: GradientType;
  hintOverrides: Map<number, PercentUnitValue>;
  setHintOverrides: Dispatch<SetStateAction<Map<number, PercentUnitValue>>>;
  setSelectedStopIndex: Dispatch<SetStateAction<number>>;
  applyGradient: GradientEditorApplyFn;
  selectedStopIndex: number;
};

const GradientPickerSection = ({
  gradient,
  computedGradient,
  gradientType,
  hintOverrides,
  setHintOverrides,
  setSelectedStopIndex,
  applyGradient,
  selectedStopIndex,
}: GradientPickerSectionProps) => {
  // Use computed gradient for picker (resolves all CSS variables)
  const computedGradientForPicker = useMemo(() => {
    return resolveGradientForPicker(computedGradient, hintOverrides);
  }, [computedGradient, hintOverrides]);

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

  const handleThumbSelect = useCallback(
    (index: number, _stop: GradientStop) => {
      setSelectedStopIndex(index);
    },
    [setSelectedStopIndex]
  );

  const previewGradientForTrack = useMemo<ParsedLinearGradient>(() => {
    const previewGradient: ParsedLinearGradient = {
      type: "linear",
      angle: leftToRightAngle,
      stops: computedGradientForPicker.stops,
    };
    if (computedGradientForPicker.repeating) {
      previewGradient.repeating = true;
    }
    return previewGradient;
  }, [computedGradientForPicker]);

  return (
    <Flex
      direction="column"
      shrink={false}
      gap="2"
      css={{ padding: theme.panel.padding }}
    >
      <GradientPicker
        gradient={computedGradientForPicker}
        backgroundImage={formatLinearGradient(previewGradientForTrack)}
        type={gradientType}
        onChange={handlePickerChange}
        onChangeComplete={handlePickerChangeComplete}
        onThumbSelect={handleThumbSelect}
        selectedStopIndex={selectedStopIndex}
      />
      <GradientStopControls
        gradient={gradient}
        computedGradient={computedGradient}
        selectedStopIndex={selectedStopIndex}
        setSelectedStopIndex={setSelectedStopIndex}
        hintOverrides={hintOverrides}
        setHintOverrides={setHintOverrides}
        applyGradient={applyGradient}
      />
    </Flex>
  );
};

type OtherGradientPropertiesSectionProps = {
  gradient: ParsedGradient;
  applyGradient: GradientEditorApplyFn;
  isRepeating: boolean;
  setIsRepeating: Dispatch<SetStateAction<boolean>>;
};

const OtherGradientPropertiesSection = ({
  gradient,
  applyGradient,
  isRepeating,
  setIsRepeating,
}: OtherGradientPropertiesSectionProps) => {
  const isLinear = isLinearGradient(gradient);
  const isConic = isConicGradient(gradient);
  const isRadial = isRadialGradient(gradient);
  const supportsAngle = isLinear || isConic;
  const angleValue = supportsAngle ? gradient.angle : undefined;
  const defaultAngle = getDefaultAngle(gradient);

  const gradientTypeName = isLinear
    ? "linear-gradient"
    : isConic
      ? "conic-gradient"
      : "radial-gradient";
  const repeatingGradientTypeName = `repeating-${gradientTypeName}`;

  // Radial gradient size and shape
  useEffect(() => {
    if (isRadial === false) {
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
  }, [applyGradient, gradient, isRadial]);

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

  const handleRadialSizeChange = useCallback(
    (nextSize?: RadialSizeOption) => {
      if (isRadial === false) {
        return;
      }
      const size = nextSize ?? defaultRadialSize;
      applyGradient({ ...gradient, size });
    },
    [applyGradient, gradient, isRadial]
  );

  const handleEndingShapeChange = useCallback(
    (nextShape?: string) => {
      if (isRadial === false) {
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
    [applyGradient, gradient, isRadial]
  );

  return (
    <Flex direction="column" gap="2">
      <Grid gap="2" columns={isRadial ? 3 : supportsAngle ? 2 : 1}>
        {supportsAngle && (
          <Flex direction="column" gap="1">
            <PropertyInlineLabel
              label="Angle"
              description="Direction of the gradient line. 0deg is up, 90deg is right, 180deg is down, 270deg is left."
            />
            <CssValueInputContainer
              property="rotate"
              styleSource="default"
              getOptions={getAvailableUnitVariables}
              value={angleValue ?? defaultAngle}
              unitOptions={angleUnitOptions}
              onUpdate={handleAngleUpdate}
              onDelete={handleAngleDelete}
            />
          </Flex>
        )}
        {isRadial && (
          <Flex direction="column" gap="1">
            <PropertyInlineLabel
              label="Size"
              description="Radial gradient size determining how far the gradient extends from its center."
            />
            <Select
              options={radialSizeOptions}
              value={radialSizeValue}
              fullWidth
              onChange={(size) => handleRadialSizeChange(size)}
              getDescription={(option) => radialSizeDescriptions[option]}
            />
          </Flex>
        )}
        {isRadial && (
          <Flex direction="column" gap="1">
            <PropertyInlineLabel
              label="Shape"
              description="Radial gradient ending shape."
            />
            <ToggleGroup
              type="single"
              value={radialShapeValue}
              aria-label="Radial ending shape"
              onValueChange={handleEndingShapeChange}
            >
              <Tooltip
                variant="wrapped"
                content={radialShapeDescriptions.ellipse}
              >
                <ToggleGroupButton value="ellipse" aria-label="Ellipse">
                  <EllipseIcon />
                </ToggleGroupButton>
              </Tooltip>
              <Tooltip
                variant="wrapped"
                content={radialShapeDescriptions.circle}
              >
                <ToggleGroupButton value="circle" aria-label="Circle">
                  <CircleIcon />
                </ToggleGroupButton>
              </Tooltip>
            </ToggleGroup>
          </Flex>
        )}
        <Flex direction="column" gap="1">
          <PropertyInlineLabel
            label="Repeat"
            description="Whether to repeat the gradient pattern."
          />
          <ToggleGroup
            type="single"
            value={isRepeating ? "repeat" : "no-repeat"}
            aria-label="Gradient repeat"
            onValueChange={handleRepeatChange}
          >
            <Tooltip
              variant="wrapped"
              content={`Render the gradient once (${gradientTypeName}).`}
            >
              <ToggleGroupButton value="no-repeat" aria-label="No repeat">
                <XSmallIcon />
              </ToggleGroupButton>
            </Tooltip>
            <Tooltip
              variant="wrapped"
              content={`Repeat the gradient pattern (${repeatingGradientTypeName}).`}
            >
              <ToggleGroupButton value="repeat" aria-label="Repeat">
                <RepeatGridIcon />
              </ToggleGroupButton>
            </Tooltip>
          </ToggleGroup>
        </Flex>
      </Grid>
    </Flex>
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
      <PropertyInlineLabel
        label="Color"
        description="The solid color for this background layer. Renders as a linear gradient with the same color at 0% and 100%."
      />
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
  gradient: ParsedGradient;
  computedGradient: ParsedGradient;
  selectedStopIndex: number;
  setSelectedStopIndex: Dispatch<SetStateAction<number>>;
  hintOverrides: Map<number, PercentUnitValue>;
  setHintOverrides: Dispatch<SetStateAction<Map<number, PercentUnitValue>>>;
  applyGradient: GradientEditorApplyFn;
};

const GradientStopControls = ({
  gradient,
  computedGradient,
  selectedStopIndex,
  setSelectedStopIndex,
  hintOverrides,
  setHintOverrides,
  applyGradient,
}: GradientStopControlsProps) => {
  const reverseDisabled = gradient.stops.length <= 1;

  const handleReverseStops = useCallback(() => {
    const resolution = resolveReverseStops(gradient, selectedStopIndex);
    if (resolution.type === "none") {
      return;
    }
    setSelectedStopIndex(resolution.selectedStopIndex);
    applyGradient(resolution.gradient);
  }, [applyGradient, gradient, selectedStopIndex, setSelectedStopIndex]);

  const updateStop = useCallback(
    (
      stopIndex: number,
      updater: (stop: GradientStop) => GradientStop,
      options?: { isEphemeral?: boolean }
    ) => {
      const nextGradient = updateGradientStop(gradient, stopIndex, updater);
      applyGradient(nextGradient, options);
    },
    [applyGradient, gradient]
  );

  const handleAddStop = useCallback(() => {
    // Calculate position for new stop between selected stop and adjacent stop
    const clampedSelectedIndex = clampStopIndex(selectedStopIndex, gradient);
    const currentStop = gradient.stops[clampedSelectedIndex];
    const currentPosition = getStopPosition(currentStop);

    // If last stop is selected, insert between it and the previous stop
    const isLastStop = clampedSelectedIndex === gradient.stops.length - 1;

    let newPosition: number;
    if (isLastStop && gradient.stops.length > 1) {
      const prevStop = gradient.stops[clampedSelectedIndex - 1];
      const prevPosition = getStopPosition(prevStop);
      newPosition = (prevPosition + currentPosition) / 2;
    } else {
      // Otherwise, insert between current and next stop
      const nextStop = gradient.stops[clampedSelectedIndex + 1];
      const nextPosition = nextStop ? getStopPosition(nextStop) : 100;
      newPosition = (currentPosition + nextPosition) / 2;
    }

    applyGradient({
      ...gradient,
      stops: [
        ...gradient.stops,
        {
          color: fallbackStopColor,
          position: createPercentUnitValue(newPosition),
        },
      ],
    });
  }, [applyGradient, gradient, selectedStopIndex]);

  const handleDeleteStop = useCallback(
    (stopIndex: number) => {
      if (gradient.stops.length <= 2) {
        return;
      }
      applyGradient({
        ...gradient,
        stops: gradient.stops.filter((_, index) => index !== stopIndex),
      });
      setHintOverrides((previous) => reindexHintOverrides(previous, stopIndex));
    },
    [applyGradient, gradient, setHintOverrides]
  );

  return (
    <Flex direction="column" gap="2">
      <Flex align="center" justify="between">
        <PropertyInlineLabel
          label="Stops"
          description="Gradient color stops and their positions along the gradient line."
        />
        <Flex gap="1">
          <Tooltip
            variant="wrapped"
            content="Reverse the order of all gradient stops."
          >
            <IconButton
              aria-label="Reverse gradient stops"
              onClick={handleReverseStops}
              disabled={reverseDisabled}
            >
              <ArrowRightLeftIcon />
            </IconButton>
          </Tooltip>
          <Tooltip content="Add gradient stop" variant="wrapped">
            <IconButton aria-label="Add stop" onClick={handleAddStop}>
              <PlusIcon />
            </IconButton>
          </Tooltip>
        </Flex>
      </Flex>
      {gradient.stops.map((stop, stopIndex) => {
        const isSelected =
          stopIndex === clampStopIndex(selectedStopIndex, gradient);
        const stopPositionValue = stop.position;
        const stopHintOverride = hintOverrides.get(stopIndex);
        const stopHintValue = stop.hint ?? stopHintOverride;

        const handleStopPositionUpdate = (
          styleValue: StyleValue,
          options?: { isEphemeral?: boolean }
        ) => {
          const resolution = resolveStopPositionUpdate(styleValue);
          if (resolution.type === "none") {
            return;
          }

          updateStop(
            stopIndex,
            (stop) => ({
              ...stop,
              position: resolution.position,
            }),
            options
          );

          if (!options?.isEphemeral && resolution.clearHintOverrides) {
            setHintOverrides((previous) =>
              removeHintOverride(previous, stopIndex)
            );
          }
        };

        const handleStopPositionDelete = (options?: {
          isEphemeral?: boolean;
        }) => {
          updateStop(
            stopIndex,
            (stop) => {
              const { position: _omit, ...rest } = stop;
              return rest;
            },
            options
          );
        };

        const handleStopHintUpdate = (
          styleValue: StyleValue,
          options?: { isEphemeral?: boolean }
        ) => {
          const resolution = resolveStopHintUpdate(styleValue);

          if (resolution.type === "none") {
            return;
          }

          updateStop(
            stopIndex,
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
            setHintOverrides((previous) =>
              removeHintOverride(previous, stopIndex)
            );
            return;
          }

          const override = resolution.override;
          if (override !== undefined) {
            setHintOverrides((previous) =>
              setHintOverride(previous, stopIndex, override)
            );
          }
        };

        const handleStopHintDelete = (options?: { isEphemeral?: boolean }) => {
          updateStop(
            stopIndex,
            (stop) => {
              const { hint: _omit, ...rest } = stop;
              return { ...rest };
            },
            options
          );
          if (!options?.isEphemeral) {
            setHintOverrides((previous) =>
              removeHintOverride(previous, stopIndex)
            );
          }
        };

        const handleStopColorChange = (
          styleValue: StyleValue | IntermediateColorValue | undefined
        ) => {
          const nextColor = styleValueToColor(styleValue);
          if (nextColor === undefined) {
            return;
          }
          updateStop(
            stopIndex,
            (stop) => ({
              ...stop,
              color: nextColor,
            }),
            { isEphemeral: true }
          );
        };

        const handleStopColorChangeComplete = (styleValue: StyleValue) => {
          const nextColor = styleValueToColor(styleValue);
          if (nextColor === undefined) {
            return;
          }
          updateStop(
            stopIndex,
            (stop) => ({
              ...stop,
              color: nextColor,
            }),
            { isEphemeral: false }
          );
        };

        const stopColor = (stop.color ?? fallbackStopColor) as StyleValue;
        // Use computed color for display (resolves CSS variables)
        const computedStop = computedGradient.stops[stopIndex];
        const currentColor = (computedStop?.color ?? stopColor) as StyleValue;

        return (
          <Flex
            key={stopIndex}
            gap="1"
            css={{
              opacity: isSelected ? 1 : 0.6,
            }}
            onFocus={() => {
              if (!isSelected) {
                setSelectedStopIndex(stopIndex);
              }
            }}
          >
            <Grid
              align="end"
              gap="1"
              css={{ gridTemplateColumns: "1fr 1fr 2fr" }}
            >
              <Tooltip
                content="Position of this gradient stop along the gradient line."
                variant="wrapped"
              >
                <Box>
                  <CssValueInputContainer
                    property={"background-position-x"}
                    styleSource="default"
                    getOptions={getAvailableUnitVariables}
                    value={stopPositionValue}
                    unitOptions={percentUnitOptions}
                    onUpdate={handleStopPositionUpdate}
                    onDelete={handleStopPositionDelete}
                  />
                </Box>
              </Tooltip>
              <Tooltip
                content="Midpoint position for color transition between this stop and the next."
                variant="wrapped"
              >
                <Box>
                  <CssValueInputContainer
                    property={"background-position-x"}
                    styleSource="default"
                    getOptions={getAvailableUnitVariables}
                    value={stopHintValue}
                    unitOptions={percentUnitOptions}
                    onUpdate={handleStopHintUpdate}
                    onDelete={handleStopHintDelete}
                  />
                </Box>
              </Tooltip>
              <Tooltip content="Color of this gradient stop." variant="wrapped">
                <Box>
                  <ColorPickerControl
                    property="color"
                    value={stopColor}
                    currentColor={currentColor}
                    onChange={handleStopColorChange}
                    onChangeComplete={handleStopColorChangeComplete}
                    onAbort={() => {}}
                    onReset={() => {}}
                  />
                </Box>
              </Tooltip>
            </Grid>
            <Tooltip content="Delete stop" variant="wrapped">
              <IconButton
                aria-label="Delete stop"
                onClick={() => handleDeleteStop(stopIndex)}
                disabled={gradient.stops.length <= 2}
              >
                <MinusIcon />
              </IconButton>
            </Tooltip>
          </Flex>
        );
      })}
    </Flex>
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

  // Parse position values directly without memoization to ensure the grid
  // indicator updates immediately after position changes
  const parsedValues = positionValue
    ? parseGradientPositionValues(positionValue)
    : { xValue: undefined, yValue: undefined };

  // Extract single values from layers type if needed
  const xValue =
    parsedValues.xValue?.type === "layers"
      ? parsedValues.xValue.value[0]
      : parsedValues.xValue;
  const yValue =
    parsedValues.yValue?.type === "layers"
      ? parsedValues.yValue.value[0]
      : parsedValues.yValue;

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
