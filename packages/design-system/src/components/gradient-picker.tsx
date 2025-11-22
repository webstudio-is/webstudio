import { clamp } from "@react-aria/utils";
import {
  toValue,
  type RgbValue,
  type StyleValue,
} from "@webstudio-is/css-engine";
import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  type GradientColorValue,
  type GradientStop,
  type ParsedGradient,
} from "@webstudio-is/css-data";
import { colord, extend } from "colord";
import mixPlugin from "colord/plugins/mix";
import { ChevronFilledUpIcon } from "@webstudio-is/icons";
import { styled, theme } from "../stitches.config";
import { Flex } from "./flex";
import { Box } from "./box";
import {
  ColorPickerPopover,
  ColorThumb,
  styleValueToRgbaColor,
} from "./color-picker";

extend([mixPlugin]);

type GradientPickerProps<T extends ParsedGradient = ParsedGradient> = {
  gradient: T;
  backgroundImage: string;
  onChange: (value: T) => void;
  onChangeComplete: (value: T) => void;
  onThumbSelect: (index: number, stop: GradientStop) => void;
  selectedStopIndex?: number;
  type?: T["type"];
};

const THUMB_INTERACTION_DISTANCE = 12;
const DRAG_THRESHOLD = 3;
const SLIDER_HEIGHT = 16;
const THUMB_HEIGHT = 14;

const defaultStopColor: RgbValue = {
  type: "rgb",
  r: 0,
  g: 0,
  b: 0,
  alpha: 1,
};

const toRgbColor = (
  color: GradientStop["color"] | undefined
): RgbValue | undefined => {
  if (color === undefined) {
    return;
  }

  if (color.type === "rgb") {
    return color;
  }

  const parsed = colord(toValue(color));
  if (parsed.isValid()) {
    const { r, g, b, a } = parsed.toRgb();
    return {
      type: "rgb",
      r,
      g,
      b,
      alpha: a,
    };
  }
};

const cloneColor = (
  color: GradientStop["color"] | undefined
): GradientStop["color"] | undefined => {
  if (color === undefined) {
    return;
  }

  return { ...color };
};

export const GradientPicker = <T extends ParsedGradient>(
  props: GradientPickerProps<T>
) => {
  const {
    gradient,
    backgroundImage,
    onChange,
    onChangeComplete,
    onThumbSelect,
    selectedStopIndex,
  } = props;
  const [stops, setStops] = useState<Array<GradientStop>>(gradient.stops);
  const [selectedStop, setSelectedStop] = useState<number | undefined>();
  const [isHoveredOnStop, setIsHoveredOnStop] = useState<boolean>(false);
  const [colorPickerOpenStop, setColorPickerOpenStop] = useState<
    number | undefined
  >();
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const thumbRefs = useRef<Array<HTMLDivElement | null>>([]);
  const stopsRef = useRef(stops);

  useEffect(() => {
    stopsRef.current = stops;
  }, [stops]);

  useEffect(() => {
    if (selectedStopIndex !== undefined) {
      setSelectedStop(selectedStopIndex);
    }
  }, [selectedStopIndex]);

  const buildGradient = useCallback(
    (stopsValue: GradientStop[]): T => {
      return {
        ...gradient,
        stops: stopsValue,
      } as T;
    },
    [gradient]
  );

  useEffect(() => {
    setStops(gradient.stops);
    stopsRef.current = gradient.stops;

    setSelectedStop((currentSelected) => {
      if (gradient.stops.length === 0) {
        return;
      }

      // If no stop is selected, select the first one
      if (currentSelected === undefined) {
        const firstStop = gradient.stops[0];
        if (firstStop !== undefined) {
          onThumbSelect(0, firstStop);
        }
        return 0;
      }

      const nextIndex = Math.min(currentSelected, gradient.stops.length - 1);
      const nextStop = gradient.stops[nextIndex];

      if (nextStop !== undefined && nextIndex !== currentSelected) {
        onThumbSelect(nextIndex, nextStop);
      }

      return nextIndex;
    });
  }, [gradient.stops, onThumbSelect]);

  const positions = stops
    .map((stop) =>
      stop.position?.type === "unit" && stop.position.unit === "%"
        ? stop.position.value
        : undefined
    )
    .filter((item): item is number => item !== undefined);
  const hints = gradient.stops
    .map((stop): number | undefined =>
      stop.hint?.type === "unit" && stop.hint.unit === "%"
        ? stop.hint.value
        : undefined
    )
    .filter((item): item is number => item !== undefined);

  const updateStops = useCallback(
    (
      updater: (currentStops: GradientStop[]) => GradientStop[],
      type: "change" | "complete"
    ) => {
      let nextStops: GradientStop[] | undefined;
      let hasChanged = false;
      setStops((currentStops) => {
        nextStops = updater(currentStops);
        if (nextStops !== currentStops) {
          hasChanged = true;
          stopsRef.current = nextStops;
          return nextStops;
        }
        nextStops = currentStops;
        return currentStops;
      });

      if (hasChanged === false || nextStops === undefined) {
        return;
      }

      const nextGradient = buildGradient(nextStops);

      if (type === "change") {
        onChange(nextGradient);
      } else {
        onChangeComplete(nextGradient);
      }
    },
    [buildGradient, onChange, onChangeComplete]
  );

  const updateStopPosition = useCallback(
    (index: number, value: number, type: "change" | "complete") => {
      const nextValue = clamp(value, 0, 100);
      updateStops((currentStops) => {
        if (index < 0 || index >= currentStops.length) {
          return currentStops;
        }

        return currentStops.map((stop, stopIndex) => {
          if (stopIndex !== index) {
            return stop;
          }
          return {
            ...stop,
            position: {
              type: "unit",
              unit: "%",
              value: nextValue,
            },
          };
        });
      }, type);
    },
    [updateStops]
  );

  const handleColorPickerOpenChange = useCallback(
    (index: number, open: boolean) => {
      setColorPickerOpenStop(open ? index : undefined);
    },
    []
  );

  const isGradientColorValue = (
    value: StyleValue
  ): value is GradientColorValue =>
    value.type === "rgb" || value.type === "keyword" || value.type === "var";

  const handleStopColorChange = useCallback(
    (
      index: number,
      value: StyleValue | undefined,
      changeType: "change" | "complete"
    ) => {
      if (value === undefined || !isGradientColorValue(value)) {
        return;
      }

      updateStops((currentStops) => {
        if (index < 0 || index >= currentStops.length) {
          return currentStops;
        }

        return currentStops.map((stop, stopIndex) => {
          if (stopIndex !== index) {
            return stop;
          }
          return {
            ...stop,
            color: value,
          };
        });
      }, changeType);
    },
    [updateStops]
  );

  useEffect(() => {
    if (
      colorPickerOpenStop !== undefined &&
      colorPickerOpenStop >= stops.length
    ) {
      setColorPickerOpenStop(undefined);
    }
  }, [colorPickerOpenStop, stops.length]);

  const computePositionFromClientX = useCallback((clientX: number) => {
    const rect = sliderRef.current?.getBoundingClientRect();
    if (rect === undefined || rect.width === 0) {
      return 0;
    }
    const relativePosition = clientX - rect.left;
    return clamp(Math.round((relativePosition / rect.width) * 100), 0, 100);
  }, []);

  const checkIfStopExistsAtPosition = useCallback(
    (
      clientX: number
    ): {
      isStopExistingAtPosition: boolean;
      newPosition: number;
    } => {
      const rect = sliderRef.current?.getBoundingClientRect();
      const newPosition = computePositionFromClientX(clientX);

      if (rect === undefined || rect.width === 0) {
        return { isStopExistingAtPosition: false, newPosition };
      }

      const relativeX = clamp(clientX - rect.left, 0, rect.width);
      const isStopExistingAtPosition = positions.some((position) => {
        const positionPx = (position / 100) * rect.width;
        return Math.abs(positionPx - relativeX) <= THUMB_INTERACTION_DISTANCE;
      });

      return { isStopExistingAtPosition, newPosition };
    },
    [computePositionFromClientX, positions]
  );

  const handleStopSelected = useCallback(
    (index: number, stop: GradientStop) => {
      setSelectedStop(index);
      onThumbSelect(index, stop);
    },
    [onThumbSelect]
  );

  useEffect(() => {
    if (selectedStop === undefined) {
      return;
    }

    const thumb = thumbRefs.current[selectedStop];
    thumb?.focus({ preventScroll: true });
  }, [selectedStop]);

  const handleThumbPointerDown = useCallback(
    (index: number, stop: GradientStop) =>
      (event: ReactPointerEvent<HTMLDivElement>) => {
        event.stopPropagation();
        // Don't start drag if the color picker is open for this thumb
        if (colorPickerOpenStop === index) {
          return;
        }

        handleStopSelected(index, stop);
        setIsHoveredOnStop(true);

        const pointerId = event.pointerId;
        const target = event.currentTarget as HTMLDivElement;
        const startX = event.clientX;
        let hasDragged = false;
        let isCleanedUp = false;

        const cleanup = () => {
          if (isCleanedUp) {
            return;
          }
          isCleanedUp = true;

          target.removeEventListener("pointermove", handlePointerMove);
          target.removeEventListener("pointerup", handlePointerUp);
          target.removeEventListener("pointercancel", handlePointerUp);
          setIsHoveredOnStop(false);
          if (target.hasPointerCapture(pointerId)) {
            target.releasePointerCapture(pointerId);
          }
        };

        const handlePointerMove = (moveEvent: PointerEvent) => {
          if (!hasDragged) {
            if (Math.abs(moveEvent.clientX - startX) <= DRAG_THRESHOLD) {
              return;
            }
            hasDragged = true;
            target.setPointerCapture(pointerId);
            setColorPickerOpenStop(undefined);
          }
          const newPosition = computePositionFromClientX(moveEvent.clientX);
          updateStopPosition(index, newPosition, "change");
        };

        const handlePointerUp = () => {
          cleanup();
          if (hasDragged) {
            onChangeComplete(buildGradient(stopsRef.current));
          }
          hasDragged = false;
        };

        target.addEventListener("pointermove", handlePointerMove);
        target.addEventListener("pointerup", handlePointerUp);
        target.addEventListener("pointercancel", handlePointerUp);
      },
    [
      colorPickerOpenStop,
      computePositionFromClientX,
      onChangeComplete,
      handleStopSelected,
      updateStopPosition,
      buildGradient,
    ]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (selectedStop === undefined) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        if (colorPickerOpenStop === selectedStop) {
          setColorPickerOpenStop(undefined);
        } else {
          setColorPickerOpenStop(selectedStop);
        }
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        let nextSelection:
          | { index: number | undefined; stop?: GradientStop }
          | undefined;

        updateStops((currentStops) => {
          if (selectedStop < 0 || selectedStop >= currentStops.length) {
            return currentStops;
          }

          const nextStops = currentStops.filter(
            (_, index) => index !== selectedStop
          );

          if (nextStops.length > 0) {
            const candidateIndex = Math.min(selectedStop, nextStops.length - 1);
            nextSelection = {
              index: candidateIndex,
              stop: nextStops[candidateIndex],
            };
          } else {
            nextSelection = { index: undefined };
          }

          return nextStops;
        }, "complete");

        if (nextSelection?.index !== undefined && nextSelection.stop) {
          setSelectedStop(nextSelection.index);
          onThumbSelect(nextSelection.index, nextSelection.stop);
        } else {
          setSelectedStop(undefined);
        }

        return;
      }

      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        const stopCount = stops.length;
        if (stopCount === 0) {
          return;
        }

        const normalizedCurrent =
          ((selectedStop % stopCount) + stopCount) % stopCount;
        const delta = event.key === "ArrowUp" ? -1 : 1;
        const nextIndex = (normalizedCurrent + delta + stopCount) % stopCount;

        if (nextIndex !== normalizedCurrent) {
          const nextStop = stops[nextIndex];
          if (nextStop !== undefined) {
            handleStopSelected(nextIndex, nextStop);
          }
        }

        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const delta = event.key === "ArrowLeft" ? -step : step;
        const currentPosition =
          stops[selectedStop]?.position?.type === "unit"
            ? stops[selectedStop]?.position.value
            : 0;
        updateStopPosition(selectedStop, currentPosition + delta, "complete");
      }
    },
    [
      handleStopSelected,
      onThumbSelect,
      selectedStop,
      stops,
      updateStopPosition,
      updateStops,
      colorPickerOpenStop,
    ]
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("[data-thumb='true']")
      ) {
        return;
      }

      setColorPickerOpenStop(undefined);

      const { isStopExistingAtPosition, newPosition } =
        checkIfStopExistsAtPosition(event.clientX);

      if (isStopExistingAtPosition === true) {
        return;
      }

      event.preventDefault();

      let nextSelection: { index: number; stop: GradientStop } | undefined;

      updateStops((currentStops) => {
        if (currentStops.length === 0) {
          return currentStops;
        }

        const currentPositions = currentStops
          .map((stop) =>
            stop.position?.type === "unit" ? stop.position.value : undefined
          )
          .filter((value): value is number => value !== undefined);

        const newStopIndex = currentPositions.findIndex(
          (position) => position > newPosition
        );
        const insertionIndex =
          newStopIndex === -1 ? currentStops.length : newStopIndex;

        const prevIndex = insertionIndex === 0 ? 0 : insertionIndex - 1;
        const nextIndex =
          insertionIndex === currentStops.length
            ? currentStops.length - 1
            : insertionIndex;

        const prevColor = currentStops[prevIndex]?.color;
        const nextColor = currentStops[nextIndex]?.color ?? prevColor;

        const prevRgb = toRgbColor(prevColor);
        const nextRgb = toRgbColor(nextColor);

        let newColor: GradientStop["color"] | undefined;
        if (prevRgb !== undefined && nextRgb !== undefined) {
          const interpolationColor = colord(prevRgb)
            .mix(colord(nextRgb), newPosition / 100)
            .toRgb();
          newColor = {
            type: "rgb",
            alpha: interpolationColor.a,
            r: interpolationColor.r,
            g: interpolationColor.g,
            b: interpolationColor.b,
          };
        } else if (prevColor !== undefined) {
          newColor = cloneColor(prevColor);
        } else if (nextColor !== undefined) {
          newColor = cloneColor(nextColor);
        } else {
          newColor = { ...defaultStopColor };
        }

        const newStop: GradientStop = {
          color: newColor,
          position: { type: "unit", value: newPosition, unit: "%" },
        };

        const nextStops: GradientStop[] = [
          ...currentStops.slice(0, insertionIndex),
          newStop,
          ...currentStops.slice(insertionIndex),
        ];

        nextSelection = { index: insertionIndex, stop: newStop };

        return nextStops;
      }, "complete");

      if (nextSelection !== undefined) {
        setSelectedStop(nextSelection.index);
        onThumbSelect(nextSelection.index, nextSelection.stop);
      }

      setIsHoveredOnStop(true);
    },
    [checkIfStopExistsAtPosition, onThumbSelect, updateStops]
  );

  const handleMouseIndicator = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const { isStopExistingAtPosition } = checkIfStopExistsAtPosition(
        event.clientX
      );
      setIsHoveredOnStop(isStopExistingAtPosition);
    },
    [checkIfStopExistsAtPosition]
  );

  const handleSliderFocus = useCallback(() => {
    if (stops.length === 0) {
      return;
    }

    // Always ensure a stop is selected when focusing
    if (selectedStop === undefined) {
      const [firstStop] = stops;
      if (firstStop !== undefined) {
        handleStopSelected(0, firstStop);
      }
    }
  }, [handleStopSelected, selectedStop, stops]);

  if (
    stops.some(
      (stop) =>
        stop.color === undefined ||
        stop.position?.type !== "unit" ||
        stop.position.unit !== "%"
    )
  ) {
    return;
  }

  return (
    <Flex
      align="end"
      css={{ height: theme.spacing[16] }}
      onKeyDown={handleKeyDown}
    >
      <SliderRoot
        ref={sliderRef}
        css={{ backgroundImage }}
        isHoveredOnStop={isHoveredOnStop}
        tabIndex={0}
        role="group"
        aria-label="Gradient stops"
        onPointerDown={handlePointerDown}
        onFocus={handleSliderFocus}
        onMouseEnter={handleMouseIndicator}
        onMouseMove={handleMouseIndicator}
        onMouseLeave={() => setIsHoveredOnStop(false)}
      >
        <SliderTrack />
        {stops.map((stop, index) => {
          const isSelected = selectedStop === index;
          if (
            stop.color === undefined ||
            stop.position?.type !== "unit" ||
            stop.position.unit !== "%"
          ) {
            return;
          }

          const stopColor = stop.color as StyleValue;

          return (
            <SliderThumb
              key={index}
              data-thumb="true"
              style={{
                left: `${stop.position.value}%`,
              }}
              role="slider"
              aria-orientation="horizontal"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={stop.position.value}
              aria-label={`Gradient stop ${index + 1}`}
              aria-selected={isSelected}
              tabIndex={-1}
              ref={(element) => {
                thumbRefs.current[index] = element;
              }}
              onPointerDown={handleThumbPointerDown(index, stop)}
              onClick={() => {
                handleStopSelected(index, stop);
              }}
            >
              <ColorPickerPopover
                value={stopColor}
                onChange={(value) =>
                  handleStopColorChange(index, value, "change")
                }
                onChangeComplete={(value) =>
                  handleStopColorChange(index, value, "complete")
                }
                open={colorPickerOpenStop === index}
                onOpenChange={(open) =>
                  handleColorPickerOpenChange(index, open)
                }
                sideOffset={SLIDER_HEIGHT + THUMB_HEIGHT}
                thumb={
                  <ColorThumb
                    color={
                      stop.color ? styleValueToRgbaColor(stop.color) : undefined
                    }
                    interactive={true}
                    css={{
                      margin: 1,
                      width: THUMB_HEIGHT,
                      height: THUMB_HEIGHT,
                    }}
                    data-thumb="true"
                  />
                }
              />
              <SliderThumbPointer aria-hidden />
            </SliderThumb>
          );
        })}

        {hints.map((hint) => (
          <SliderHint key={hint} css={{ left: `${hint}%` }}>
            <ChevronFilledUpIcon size="100%" />
          </SliderHint>
        ))}
      </SliderRoot>
    </Flex>
  );
};

const SliderRoot = styled("div", {
  position: "relative",
  width: "100%",
  height: SLIDER_HEIGHT,
  border: `1px solid ${theme.colors.borderMain}`,
  borderRadius: theme.borderRadius[3],
  touchAction: "none",
  userSelect: "none",
  outline: "none",
  "&::before": {
    content: '""',
    position: "absolute",
    inset: 0,
    background: `repeating-conic-gradient(rgba(0,0,0,0.22) 0% 25%, transparent 0% 50%) 0% 33.33% / 40% 40%`,
    pointerEvents: "none",
    backgroundSize: "10px 10px",
    zIndex: -1,
  },
  variants: {
    isHoveredOnStop: {
      true: {
        cursor: "default",
      },
      false: {
        cursor: "copy",
      },
    },
  },
  "&:focus-visible": {
    boxShadow: `0 0 0 1px ${theme.colors.borderFocus}`,
  },
});

const SliderTrack = styled("div", {
  position: "absolute",
  inset: 0,
  borderRadius: theme.borderRadius[3],
  pointerEvents: "none",
  isolation: "isolate",
});

const SliderThumb = styled(Box, {
  "--thumb-border-color": theme.colors.borderMain,
  position: "absolute",
  display: "grid",
  placeItems: "center",
  bottom: `calc(100% + ${theme.spacing[6]})`,
  transform: "translateX(-50%)",
  borderRadius: theme.borderRadius[2],
  boxShadow: `0 0 0 1px var(--thumb-border-color)`,
  outline: "none",
  zIndex: 1,
  cursor: "grab",
  "&:active": {
    cursor: "grabbing",
  },
  "&:focus-visible, &[aria-selected=true]": {
    "--thumb-border-color": theme.colors.borderFocus,
    boxShadow: `0 0 0 1px ${theme.colors.borderFocus}`,
  },
});

const SliderThumbPointer = styled("div", {
  position: "absolute",
  width: theme.spacing[3],
  height: theme.spacing[3],
  left: "50%",
  bottom: 0,
  background: "white",
  zIndex: -1,
  border: `1px solid var(--thumb-border-color)`,
  borderTopColor: "transparent",
  borderLeftColor: "transparent",
  borderRadius: theme.borderRadius[1],
  transform: "translate(-50%, 50%) rotate(45deg)",
  pointerEvents: "none",
});

const SliderHint = styled(Flex, {
  position: "absolute",
  top: `calc(-1 * ${theme.spacing[6]})`,
  width: theme.spacing[7],
  height: theme.spacing[7],
  pointerEvents: "none",
  transform: "translateX(-50%)",
  alignItems: "center",
  justifyContent: "center",
});

export type { GradientPickerProps };
