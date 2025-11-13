import { clamp } from "@react-aria/utils";
import { toValue, UnitValue, type RgbValue } from "@webstudio-is/css-engine";
import {
  useState,
  useCallback,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  reconstructLinearGradient,
  type GradientStop,
  type ParsedGradient,
} from "@webstudio-is/css-data";
import { colord, extend } from "colord";
import mixPlugin from "colord/plugins/mix";
import { ChevronFilledUpIcon } from "@webstudio-is/icons";
import { styled, theme } from "../stitches.config";
import { Flex } from "./flex";
import { Box } from "./box";

extend([mixPlugin]);

type GradientPickerProps = {
  gradient: ParsedGradient;
  onChange: (value: ParsedGradient) => void;
  onThumbSelected: (index: number, stop: GradientStop) => void;
};

const defaultAngle: UnitValue = {
  type: "unit",
  value: 90,
  unit: "deg",
};

const THUMB_INTERACTION_PX = 12;

export const GradientPicker = (props: GradientPickerProps) => {
  const { gradient, onChange, onThumbSelected } = props;
  const [stops, setStops] = useState<Array<GradientStop>>(gradient.stops);
  const [selectedStop, setSelectedStop] = useState<number | undefined>();
  const [isHoveredOnStop, setIsHoveredOnStop] = useState<boolean>(false);
  const sliderRef = useRef<HTMLDivElement | null>(null);

  const positions = stops
    .map((stop) => stop.position?.value)
    .filter((item): item is number => item !== undefined);
  const hints = gradient.stops
    .map((stop): number | undefined => stop.hint?.value)
    .filter((item): item is number => item !== undefined);
  const background = reconstructLinearGradient({
    stops,
    sideOrCorner: gradient.sideOrCorner,
    angle: defaultAngle,
  });

  const updateStops = useCallback(
    (updater: (currentStops: GradientStop[]) => GradientStop[]) => {
      setStops((currentStops) => {
        const nextStops = updater(currentStops);
        onChange({
          angle: gradient.angle,
          stops: nextStops,
          sideOrCorner: gradient.sideOrCorner,
        });
        return nextStops;
      });
    },
    [gradient.angle, gradient.sideOrCorner, onChange]
  );

  const updateStopPosition = useCallback(
    (index: number, value: number) => {
      const nextValue = clamp(value, 0, 100);
      updateStops((currentStops) => {
        if (index < 0 || index >= currentStops.length) {
          return currentStops;
        }

        return currentStops.map((stop, stopIndex) => {
          if (stopIndex !== index) {
            return stop;
          }

          const nextPosition = {
            type: "unit",
            unit: "%",
            value: nextValue,
          } as const;

          if (stop.position === undefined) {
            return {
              ...stop,
              position: nextPosition,
            };
          }

          return {
            ...stop,
            position: nextPosition,
          };
        });
      });
    },
    [updateStops]
  );

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
        return Math.abs(positionPx - relativeX) <= THUMB_INTERACTION_PX;
      });

      return { isStopExistingAtPosition, newPosition };
    },
    [computePositionFromClientX, positions]
  );

  const handleStopSelected = useCallback(
    (index: number, stop: GradientStop) => {
      setSelectedStop(index);
      onThumbSelected(index, stop);
    },
    [onThumbSelected]
  );

  const handleThumbPointerDown = useCallback(
    (index: number, stop: GradientStop) =>
      (event: ReactPointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        handleStopSelected(index, stop);
        setIsHoveredOnStop(true);

        const pointerId = event.pointerId;
        const target = event.currentTarget;
        target.setPointerCapture(pointerId);

        const handlePointerMove = (moveEvent: PointerEvent) => {
          const newPosition = computePositionFromClientX(moveEvent.clientX);
          updateStopPosition(index, newPosition);
        };

        const handlePointerUp = () => {
          target.releasePointerCapture(pointerId);
          target.removeEventListener("pointermove", handlePointerMove);
          target.removeEventListener("pointerup", handlePointerUp);
          target.removeEventListener("pointercancel", handlePointerUp);
          setIsHoveredOnStop(false);
        };

        target.addEventListener("pointermove", handlePointerMove);
        target.addEventListener("pointerup", handlePointerUp);
        target.addEventListener("pointercancel", handlePointerUp);
      },
    [computePositionFromClientX, handleStopSelected, updateStopPosition]
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (selectedStop === undefined) {
        return;
      }

      if (event.key === "Backspace") {
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
        });

        if (nextSelection?.index !== undefined && nextSelection.stop) {
          setSelectedStop(nextSelection.index);
          onThumbSelected(nextSelection.index, nextSelection.stop);
        } else {
          setSelectedStop(undefined);
        }

        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const delta = event.key === "ArrowLeft" ? -step : step;
        const currentPosition = stops[selectedStop]?.position?.value ?? 0;
        updateStopPosition(selectedStop, currentPosition + delta);
      }
    },
    [onThumbSelected, selectedStop, stops, updateStopPosition, updateStops]
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("[data-thumb='true']")
      ) {
        return;
      }

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
          .map((stop) => stop.position?.value)
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

        if (prevColor === undefined && nextColor === undefined) {
          return currentStops;
        }

        const interpolationColor =
          prevColor !== undefined && nextColor !== undefined
            ? colord(toValue(prevColor))
                .mix(colord(toValue(nextColor)), newPosition / 100)
                .toRgb()
            : colord(toValue((prevColor ?? nextColor)!)).toRgb();

        const newColorStop: RgbValue = {
          type: "rgb",
          alpha: interpolationColor.a,
          r: interpolationColor.r,
          g: interpolationColor.g,
          b: interpolationColor.b,
        };

        const newStop: GradientStop = {
          color: newColorStop,
          position: { type: "unit", value: newPosition, unit: "%" },
        };

        const nextStops: GradientStop[] = [
          ...currentStops.slice(0, insertionIndex),
          newStop,
          ...currentStops.slice(insertionIndex),
        ];

        nextSelection = { index: insertionIndex, stop: newStop };

        return nextStops;
      });

      if (nextSelection !== undefined) {
        setSelectedStop(nextSelection.index);
        onThumbSelected(nextSelection.index, nextSelection.stop);
      }

      setIsHoveredOnStop(true);
    },
    [checkIfStopExistsAtPosition, onThumbSelected, updateStops]
  );

  const handleMouseIndicator = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const { isStopExistingAtPosition } = checkIfStopExistsAtPosition(
        event.clientX
      );
      setIsHoveredOnStop(isStopExistingAtPosition);
    },
    [checkIfStopExistsAtPosition]
  );

  const handleSliderFocus = useCallback(() => {
    if (selectedStop !== undefined || stops.length === 0) {
      return;
    }

    const [firstStop] = stops;
    if (firstStop !== undefined) {
      handleStopSelected(0, firstStop);
    }
  }, [handleStopSelected, selectedStop, stops]);

  if (
    stops.some(
      (stop) => stop.position === undefined || stop.color === undefined
    )
  ) {
    return null;
  }

  return (
    <Flex
      align="end"
      css={{
        height: theme.spacing[18],
      }}
    >
      <SliderRoot
        ref={sliderRef}
        css={{ background }}
        isHoveredOnStop={isHoveredOnStop}
        tabIndex={0}
        role="group"
        aria-label="Gradient stops"
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
        onFocus={handleSliderFocus}
        onMouseEnter={handleMouseIndicator}
        onMouseMove={handleMouseIndicator}
        onMouseLeave={() => setIsHoveredOnStop(false)}
      >
        <SliderTrack />
        {stops.map((stop, index) => {
          if (stop.color === undefined || stop.position === undefined) {
            return null;
          }

          return (
            <SliderThumb
              key={index}
              data-thumb="true"
              style={{
                left: `${stop.position.value}%`,
                background: toValue(stop.color),
              }}
              role="slider"
              aria-orientation="horizontal"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={stop.position.value}
              aria-label={`Gradient stop ${index + 1}`}
              tabIndex={-1}
              onPointerDown={handleThumbPointerDown(index, stop)}
              onClick={() => handleStopSelected(index, stop)}
            >
              <SliderThumbTrigger data-thumb="true" />
            </SliderThumb>
          );
        })}

        {hints.map((hint) => {
          return (
            <Flex
              key={hint}
              align="center"
              justify="center"
              css={{
                position: "absolute",
                left: `${hint}%`,
                top: theme.spacing[9],
              }}
            >
              <ChevronFilledUpIcon />
            </Flex>
          );
        })}
      </SliderRoot>
    </Flex>
  );
};

const SliderRoot = styled("div", {
  position: "relative",
  width: "100%",
  height: theme.spacing[9],
  border: `1px solid ${theme.colors.borderMain}`,
  borderRadius: theme.borderRadius[3],
  touchAction: "none",
  userSelect: "none",
  outline: "none",
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
    boxShadow: `0 0 0 2px ${theme.colors.borderFocus}`,
  },
});

const SliderTrack = styled("div", {
  position: "absolute",
  inset: 0,
  borderRadius: theme.borderRadius[3],
  pointerEvents: "none",
});

const SliderThumb = styled(Box, {
  position: "absolute",
  display: "block",
  transform: `translate(-50%, calc(-1 * ${theme.spacing[9]} - 10px))`,
  outline: `3px solid ${theme.colors.borderFocus}`,
  borderRadius: theme.borderRadius[5],
  outlineOffset: -3,
  zIndex: 1,
  cursor: "grab",
  "&:active": {
    cursor: "grabbing",
  },
  "&::before": {
    content: "''",
    position: "absolute",
    borderLeft: "5px solid transparent",
    borderRight: "5px solid transparent",
    borderTop: `5px solid ${theme.colors.borderFocus}`,
    bottom: -5,
    marginLeft: "50%",
    transform: "translateX(-50%)",
  },
});

const SliderThumbTrigger = styled(Box, {
  width: theme.spacing[10],
  height: theme.spacing[10],
  borderRadius: theme.borderRadius[4],
  backgroundColor: "inherit",
});

export type { GradientPickerProps };
