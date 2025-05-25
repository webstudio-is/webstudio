import { toValue, UnitValue, type RgbValue } from "@webstudio-is/css-engine";
import { Slider, Range, Thumb, Track } from "@radix-ui/react-slider";
import { useState, useCallback } from "react";
import {
  reconstructLinearGradient,
  type GradientStop,
  type ParsedGradient,
} from "@webstudio-is/css-data";
import { styled, theme, Flex, Box } from "@webstudio-is/design-system";
import { colord, extend } from "colord";
import mixPlugin from "colord/plugins/mix";
import { ChevronFilledUpIcon } from "@webstudio-is/icons";

extend([mixPlugin]);

type GradientControlProps = {
  gradient: ParsedGradient;
  onChange: (value: ParsedGradient) => void;
  onThumbSelected: (index: number, stop: GradientStop) => void;
};

const defaultAngle: UnitValue = {
  type: "unit",
  value: 90,
  unit: "deg",
};

export const GradientControl = (props: GradientControlProps) => {
  const [stops, setStops] = useState<Array<GradientStop>>(props.gradient.stops);
  const [selectedStop, setSelectedStop] = useState<number | undefined>();
  const [isHoveredOnStop, setIsHoveredOnStop] = useState<boolean>(false);
  const positions = stops
    .map((stop) => stop.position?.value)
    .filter((item) => item !== undefined);
  const hints = props.gradient.stops
    .map((stop) => stop.hint?.value)
    .filter((item) => item !== undefined);
  const background = reconstructLinearGradient({
    stops,
    sideOrCorner: props.gradient.sideOrCorner,
    angle: defaultAngle,
  });

  // Every color stop should have a position asociated for us in-order to display the slider thumb.
  // But when users manually enter linear-gradient from the advanced-panel. They might add something like this
  // linear-gradient(to right, red, blue), or linear-gradient(150deg, red, blue 50%, yellow 50px)
  // Browsers handels all these cases by following the rules of the css spec.
  // https://www.w3.org/TR/css-images-4/#color-stop-fixup
  // In order to handle such inputs from the advanced tab too. We need to implement the color-stop-fix-up spec during parsing.
  // But for now, we are just checking if every stop has a position or not. Since the main use-case is to add gradients from ui.
  // We will never run into this case of a color-stop missing a position associated with it.
  const isEveryStopHasAPosition = stops.every(
    (stop) => stop.position !== undefined && stop.color !== undefined
  );

  const handleValueChange = useCallback(
    (newPositions: number[]) => {
      const newStops: GradientStop[] = stops.map((stop, index) => ({
        ...stop,
        position: { type: "unit", value: newPositions[index], unit: "%" },
      }));

      setStops(newStops);
      props.onChange({
        angle: props.gradient.angle,
        stops: newStops,
        sideOrCorner: props.gradient.sideOrCorner,
      });
    },
    [stops, props]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Backspace" && selectedStop !== undefined) {
        const newStops = stops;
        newStops.splice(selectedStop, 1);
        setStops(newStops);
        setSelectedStop(undefined);
      }
    },
    [stops, selectedStop]
  );

  const checkIfStopExistsAtPosition = useCallback(
    (
      event: React.MouseEvent<HTMLSpanElement>
    ): { isStopExistingAtPosition: boolean; newPosition: number } => {
      const sliderWidth = event.currentTarget.offsetWidth;
      const clickedPosition =
        event.clientX - event.currentTarget.getBoundingClientRect().left;
      const newPosition = Math.ceil((clickedPosition / sliderWidth) * 100);
      // The 8px buffer here is the width of the thumb.
      // We don't want to add a new stop if the user clicks on the thumb.
      const isStopExistingAtPosition = positions.some(
        (position) => Math.abs(newPosition - position) <= 8
      );

      return { isStopExistingAtPosition, newPosition };
    },
    [positions]
  );

  const handlePointerDown = useCallback(
    (event: React.MouseEvent<HTMLSpanElement>) => {
      if (event.target === undefined || event.target === null) {
        return;
      }

      // radix-slider automatically brings the closest thumb to the clicked position.
      // But, we want it be prevented. For adding a new color-stop where the user clicked.
      // And handle the change in values only even for scrubing when the user is dragging the thumb.
      const { isStopExistingAtPosition, newPosition } =
        checkIfStopExistsAtPosition(event);

      if (isStopExistingAtPosition === true) {
        return;
      }

      // Adding a new stop when user clicks on the slider.
      event.preventDefault();
      const newStopIndex = positions.findIndex(
        (position) => position > newPosition
      );
      const index = newStopIndex === -1 ? stops.length : newStopIndex;
      const prevColor = stops[index === 0 ? 0 : index - 1].color;
      const nextColor =
        stops[index === positions.length ? index - 1 : index].color;

      const interpolationColor = colord(toValue(prevColor))
        .mix(colord(toValue(nextColor)), newPosition / 100)
        .toRgb();

      const newColorStop: RgbValue = {
        type: "rgb",
        alpha: interpolationColor.a,
        r: interpolationColor.r,
        g: interpolationColor.g,
        b: interpolationColor.b,
      };

      const newStops: GradientStop[] = [
        ...stops.slice(0, index),
        {
          color: newColorStop,
          position: { type: "unit", value: newPosition, unit: "%" },
        },
        ...stops.slice(index),
      ];

      setStops(newStops);
      setIsHoveredOnStop(true);
      props.onChange({
        angle: props.gradient.angle,
        stops: newStops,
        sideOrCorner: props.gradient.sideOrCorner,
      });
    },
    [stops, positions, checkIfStopExistsAtPosition, props]
  );

  const handleStopSelected = useCallback(
    (index: number, stop: GradientStop) => {
      setSelectedStop(index);
      props.onThumbSelected(index, stop);
    },
    [props]
  );

  const handleMouseEnter = (event: React.MouseEvent<HTMLSpanElement>) => {
    const { isStopExistingAtPosition } = checkIfStopExistsAtPosition(event);
    setIsHoveredOnStop(isStopExistingAtPosition);
  };

  if (isEveryStopHasAPosition === false) {
    return;
  }

  return (
    <Flex
      align="end"
      css={{
        height: theme.spacing[18],
      }}
    >
      <SliderRoot
        css={{ background }}
        max={100}
        step={1}
        value={positions}
        onValueChange={handleValueChange}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        isHoveredOnStop={isHoveredOnStop}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseEnter}
        onMouseLeave={() => setIsHoveredOnStop(false)}
      >
        <Track>
          <SliderRange />
        </Track>
        {stops.map((stop, index) => {
          if (stop.color === undefined || stop.position === undefined) {
            return;
          }

          return (
            <SliderThumb
              key={index}
              style={{
                background: toValue(stop.color),
              }}
              onClick={() => handleStopSelected(index, stop)}
            >
              <SliderThumbTrigger />
            </SliderThumb>
          );
        })}

        {/*
            Hints are displayed as a chevron icon below the slider thumb.
            Usually hints are used to display the behaviour of the color-stop that is preciding.
            But, if we just move them along the UI. We will be basically altering the gradient itself.
            Because the position of the hint is the position of the color-stop. And moving it along, might associate the hint
            with a different color-stop. So, we are not allowing the user to move the hint along the slider.

            None of the tools are even displaying the hints at the moment. We are just displaying them so users can know
            they are hints associated with stops if they managed to add gradient from the advanced tab.
        */}
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

const SliderRoot = styled(Slider, {
  position: "relative",
  width: "100%",
  height: theme.spacing[9],
  border: `1px solid ${theme.colors.borderMain}`,
  borderRadius: theme.borderRadius[3],
  touchAction: "none",
  userSelect: "none",
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
});

const SliderRange = styled(Range, {
  position: "absolute",
  background: "transparent",
  borderRadius: theme.borderRadius[3],
});

const SliderThumb = styled(Thumb, {
  display: "block",
  transform: `translateY(calc(-1 * ${theme.spacing[9]} - 10px))`,
  outline: `3px solid ${theme.colors.borderFocus}`,
  borderRadius: theme.borderRadius[5],
  outlineOffset: -3,

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
});
