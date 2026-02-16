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
  useMemo,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type {
  GradientColorValue,
  GradientStop,
  ParsedGradient,
} from "@webstudio-is/css-data";
import * as colorjs from "colorjs.io/fn";
import { ChevronFilledUpIcon } from "@webstudio-is/icons";
import { styled, theme } from "../stitches.config";
import { Flex } from "./flex";
import { Box } from "./box";
import { ColorPickerPopover, ColorThumb } from "./color-picker";

// Helper to mix two RGB colors
const mixColors = (
  color1: RgbValue,
  color2: RgbValue,
  ratio: number
): RgbValue => {
  const c1: colorjs.ColorConstructor = {
    spaceId: "srgb",
    coords: [
      (color1.r ?? 0) / 255,
      (color1.g ?? 0) / 255,
      (color1.b ?? 0) / 255,
    ],
    alpha: undefined,
  };
  const c2: colorjs.ColorConstructor = {
    spaceId: "srgb",
    coords: [
      (color2.r ?? 0) / 255,
      (color2.g ?? 0) / 255,
      (color2.b ?? 0) / 255,
    ],
    alpha: undefined,
  };
  const mixed = colorjs.mix(c1, c2, ratio);
  const [r, g, b] = mixed.coords;
  return {
    type: "rgb",
    r: (r ?? 0) * 255,
    g: (g ?? 0) * 255,
    b: (b ?? 0) * 255,
    alpha: color1.alpha ?? 1,
  };
};

export type GradientPickerProps<T extends ParsedGradient = ParsedGradient> = {
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

  try {
    const parsed = colorjs.parse(toValue(color));
    const [r, g, b] = parsed.coords;
    const alpha = parsed.alpha;
    return {
      type: "rgb",
      r: (r ?? 0) * 255,
      g: (g ?? 0) * 255,
      b: (b ?? 0) * 255,
      alpha: alpha ?? 1,
    };
  } catch {
    return;
  }
};

const computePositionFromClientX = (
  sliderElement: HTMLElement,
  clientX: number
) => {
  const rect = sliderElement.getBoundingClientRect();
  if (rect.width === 0) {
    return 0;
  }
  const relativePosition = clientX - rect.left;
  return clamp(Math.round((relativePosition / rect.width) * 100), 0, 100);
};

const getStopPositionValue = (stop: GradientStop): number => {
  return stop.position?.type === "unit" ? stop.position.value : 0;
};

const createPercentUnit = (value: number) => ({
  type: "unit" as const,
  unit: "%" as const,
  value,
});

const createDragHandler = (threshold: number = DRAG_THRESHOLD) => {
  let pointerAbortController: AbortController | undefined;
  let clickAbortController: AbortController | undefined;

  const handlePointerDown = (options: {
    event: ReactPointerEvent<HTMLDivElement>;
    onDragMove: (position: number) => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
  }) => {
    const { event } = options;
    const pointerId = event.pointerId;
    const target = event.currentTarget as HTMLDivElement;
    const startX = event.clientX;
    let hasDragged = false;

    // Find the slider element using closest with data attribute
    const sliderElement = target.closest("[data-gradient-slider]") as
      | HTMLElement
      | undefined;
    if (sliderElement === undefined) {
      return;
    }

    // Abort any previous drag session that might still be active
    cleanup();

    // Create a new abort controller for this drag session
    pointerAbortController = new AbortController();
    const pointerSignal = pointerAbortController.signal;

    // Create a separate abort controller for the click handler
    clickAbortController = new AbortController();
    const clickSignal = clickAbortController.signal;

    // Capture pointer immediately if threshold is 0 (e.g., for hints)
    if (threshold === 0) {
      event.preventDefault();
      target.setPointerCapture(pointerId);
    }

    const handlePointerMove = (moveEvent: Event) => {
      if (!(moveEvent instanceof PointerEvent)) {
        return;
      }
      if (!hasDragged) {
        if (Math.abs(moveEvent.clientX - startX) <= threshold) {
          return;
        }
        hasDragged = true;
        if (threshold !== 0) {
          target.setPointerCapture(pointerId);
        }
        options.onDragStart?.();
      }
      const newPosition = computePositionFromClientX(
        sliderElement,
        moveEvent.clientX
      );
      options.onDragMove(newPosition);
    };

    // Prevent click event from firing if drag occurred
    // Use document-level listener to catch clicks even if they happen outside the target
    const handleClick = (event: Event) => {
      if (hasDragged) {
        event.preventDefault();
        event.stopPropagation();
      }
      // Cleanup after click fires
      clickAbortController?.abort();
      clickAbortController = undefined;
    };
    document.addEventListener("click", handleClick, {
      capture: true,
      signal: clickSignal,
    });

    const handlePointerUp = () => {
      if (target.hasPointerCapture(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
      if (hasDragged) {
        options.onDragEnd?.();
      }
      // Don't abort immediately - click event needs to fire first
      // Defer cleanup to allow click event to be processed
      setTimeout(() => {
        pointerAbortController?.abort();
        pointerAbortController = undefined;
      }, 0);
    };

    document.addEventListener("pointermove", handlePointerMove, {
      signal: pointerSignal,
    });
    document.addEventListener("pointerup", handlePointerUp, {
      signal: pointerSignal,
    });
    document.addEventListener("pointercancel", handlePointerUp, {
      signal: pointerSignal,
    });
  };

  const cleanup = () => {
    pointerAbortController?.abort();
    pointerAbortController = undefined;
    clickAbortController?.abort();
    clickAbortController = undefined;
  };

  return { handlePointerDown, cleanup };
};

export const GradientPicker = <T extends ParsedGradient>({
  gradient,
  backgroundImage,
  onChange,
  onChangeComplete,
  onThumbSelect,
  selectedStopIndex,
}: GradientPickerProps<T>) => {
  const [stops, setStops] = useState<Array<GradientStop>>(gradient.stops);
  const [selectedStop, setSelectedStop] = useState<number | undefined>();
  const [isHoveredOnStop, setIsHoveredOnStop] = useState<boolean>(false);
  const [draggingStop, setDraggingStop] = useState<number | undefined>();
  const [colorPickerOpenStop, setColorPickerOpenStop] = useState<
    number | undefined
  >();
  const sliderRef = useRef<HTMLDivElement | undefined>(undefined);
  const thumbRefs = useRef<Array<HTMLDivElement | undefined>>([]);
  const stopsRef = useRef(stops);

  const handleSliderRef = useCallback((element: HTMLDivElement | null) => {
    sliderRef.current = element ?? undefined;
  }, []);

  useEffect(() => {
    stopsRef.current = stops;
  }, [stops]);

  const thumbDragHandler = useMemo(() => createDragHandler(), []);

  const hintDragHandler = useMemo(() => createDragHandler(0), []);

  useEffect(() => {
    return () => {
      thumbDragHandler.cleanup();
      hintDragHandler.cleanup();
    };
  }, [thumbDragHandler, hintDragHandler]);

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
    .map((stop, index): { value: number; stopIndex: number } | undefined =>
      stop.hint?.type === "unit" && stop.hint.unit === "%"
        ? { value: stop.hint.value, stopIndex: index }
        : undefined
    )
    .filter(
      (item): item is { value: number; stopIndex: number } => item !== undefined
    );

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
            position: createPercentUnit(nextValue),
          };
        });
      }, type);
    },
    [updateStops]
  );

  const updateStopHint = useCallback(
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
            hint: createPercentUnit(nextValue),
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

  const checkIfStopExistsAtPosition = useCallback(
    (
      clientX: number
    ): {
      isStopExistingAtPosition: boolean;
      newPosition: number;
    } => {
      const sliderElement = sliderRef.current;
      if (sliderElement === undefined) {
        return { isStopExistingAtPosition: false, newPosition: 0 };
      }
      const rect = sliderElement.getBoundingClientRect();
      const newPosition = computePositionFromClientX(sliderElement, clientX);

      if (rect.width === 0) {
        return { isStopExistingAtPosition: false, newPosition };
      }

      const relativeX = clamp(clientX - rect.left, 0, rect.width);
      const isStopExistingAtPosition = positions.some((position) => {
        const positionPx = (position / 100) * rect.width;
        return Math.abs(positionPx - relativeX) <= THUMB_INTERACTION_DISTANCE;
      });

      return { isStopExistingAtPosition, newPosition };
    },
    [positions]
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
        // Don't start drag if the color picker is open for this thumb
        if (colorPickerOpenStop === index) {
          event.stopPropagation();
          return;
        }

        handleStopSelected(index, stop);
        setIsHoveredOnStop(true);

        // Track the currently dragged stop index
        let currentIndex = index;

        // Calculate hint offset relative to stop position
        const originalPosition = getStopPositionValue(stop);
        const originalHint =
          stop.hint?.type === "unit" ? stop.hint.value : undefined;
        const hintOffset =
          originalHint !== undefined ? originalHint - originalPosition : 0;

        thumbDragHandler.handlePointerDown({
          event,
          onDragMove: (newPosition) => {
            updateStops((currentStops) => {
              if (currentIndex < 0 || currentIndex >= currentStops.length) {
                return currentStops;
              }

              const clampedPosition = clamp(newPosition, 0, 100);

              // Update the position of the dragged stop and maintain hint offset
              const updatedStops = currentStops.map((stop, stopIndex) => {
                if (stopIndex !== currentIndex) {
                  return stop;
                }

                const updatedStop: GradientStop = {
                  ...stop,
                  position: createPercentUnit(clampedPosition),
                };

                // Update hint to maintain the same offset relative to the stop
                if (stop.hint?.type === "unit") {
                  const newHintPosition = clamp(
                    clampedPosition + hintOffset,
                    0,
                    100
                  );
                  updatedStop.hint = createPercentUnit(newHintPosition);
                }

                return updatedStop;
              });

              // Sort stops by position and track where our dragged stop ends up
              const draggedStop = updatedStops[currentIndex];
              const sortedStops = [...updatedStops].sort((stopA, stopB) => {
                return (
                  getStopPositionValue(stopA) - getStopPositionValue(stopB)
                );
              });

              // Find the new index of the dragged stop
              const newIndex = sortedStops.findIndex(
                (stop) => stop === draggedStop
              );
              if (newIndex !== -1 && newIndex !== currentIndex) {
                currentIndex = newIndex;
                setSelectedStop(newIndex);
                setDraggingStop(newIndex);
              }

              return sortedStops;
            }, "change");
          },
          onDragStart: () => {
            setColorPickerOpenStop(undefined);
            setDraggingStop(currentIndex);
          },
          onDragEnd: () => {
            setIsHoveredOnStop(false);
            setDraggingStop(undefined);
            onChangeComplete(buildGradient(stopsRef.current));
          },
        });
      },
    [
      colorPickerOpenStop,
      handleStopSelected,
      thumbDragHandler,
      updateStops,
      onChangeComplete,
      buildGradient,
    ]
  );

  const handleHintPointerDown = useCallback(
    (index: number) => (event: ReactPointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      hintDragHandler.handlePointerDown({
        event,
        onDragMove: (newPosition) => {
          updateStopHint(index, newPosition, "change");
        },
        onDragEnd: () => {
          onChangeComplete(buildGradient(stopsRef.current));
        },
      });
    },
    [hintDragHandler, updateStopHint, onChangeComplete, buildGradient]
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
        event.target.closest("[data-gradient-thumb='true']")
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
          const interpolationColor = mixColors(
            prevRgb,
            nextRgb,
            newPosition / 100
          );
          newColor = {
            type: "rgb",
            alpha: interpolationColor.alpha,
            r: interpolationColor.r,
            g: interpolationColor.g,
            b: interpolationColor.b,
          };
        } else if (prevColor !== undefined) {
          newColor = { ...prevColor };
        } else if (nextColor !== undefined) {
          newColor = { ...nextColor };
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
        ref={handleSliderRef}
        data-gradient-slider
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
          const isDragging = draggingStop === index;
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
              data-gradient-thumb="true"
              style={{
                left: `${stop.position.value}%`,
                zIndex: isDragging ? 2 : 1,
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
                thumbRefs.current[index] = element ?? undefined;
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
                    color={stop.color ? toValue(stop.color) : "transparent"}
                    interactive={true}
                    css={{
                      margin: 1,
                      width: THUMB_HEIGHT,
                      height: THUMB_HEIGHT,
                    }}
                    data-gradient-thumb="true"
                  />
                }
              />
              <SliderThumbPointer aria-hidden />
            </SliderThumb>
          );
        })}

        {hints.map((hint) => {
          return (
            <SliderHint
              key={`${hint.stopIndex}-${hint.value}`}
              style={{ left: `${hint.value}%` }}
              onPointerDown={handleHintPointerDown(hint.stopIndex)}
            >
              <ChevronFilledUpIcon size="100%" />
            </SliderHint>
          );
        })}
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
  top: `100%`,
  width: theme.spacing[7],
  height: theme.spacing[7],
  pointerEvents: "auto",
  transform: "translateX(-50%)",
  alignItems: "center",
  justifyContent: "center",
  cursor: "grab",
  touchAction: "none",
  userSelect: "none",
  color: "black",
  "&:active": {
    cursor: "grabbing",
  },
});
