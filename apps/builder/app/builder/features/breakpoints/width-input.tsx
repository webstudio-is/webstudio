import { useState, type KeyboardEvent, useEffect, useId } from "react";
import { useStore } from "@nanostores/react";
import { findApplicableMedia } from "@webstudio-is/css-engine";
import {
  theme,
  Text,
  Flex,
  Label,
  type NumericScrubValue,
  InputField,
  useScrub,
  handleNumericInputArrowKeys,
} from "@webstudio-is/design-system";
import { $breakpoints, $isResizingCanvas } from "~/shared/nano-states";
import {
  $selectedBreakpointId,
  $selectedBreakpoint,
} from "~/shared/nano-states";
import { $canvasWidth } from "~/builder/shared/nano-states";

const useEnhancedInput = ({
  onChange,
  onChangeComplete,
  value,
  min,
}: {
  onChange: (value: NumericScrubValue) => void;
  onChangeComplete: (value: NumericScrubValue) => void;
  value: number;
  min: number;
}) => {
  const [intermediateValue, setIntermediateValue] = useState<number>();

  const currentValue = intermediateValue ?? value;

  const handleChange = (nextValue: number) => {
    onChange(Math.max(nextValue, min));
    setIntermediateValue(undefined);
  };

  const handleChangeComplete = (nextValue: number) => {
    onChangeComplete(Math.max(nextValue, min));
    setIntermediateValue(undefined);
  };

  const { scrubRef, inputRef } = useScrub({
    distanceThreshold: 2,
    value,
    onChange: handleChange,
    onChangeComplete: handleChangeComplete,
  });

  const getValue = () => {
    const value = inputRef.current?.valueAsNumber;
    return typeof value === "number" && Number.isNaN(value) === false
      ? value
      : min;
  };

  return {
    ref: scrubRef,
    inputRef,
    onChange() {
      setIntermediateValue(getValue());
    },
    onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
      if (event.key === "Enter") {
        handleChangeComplete(getValue());
        return;
      }
      const nextValue = handleNumericInputArrowKeys(currentValue, event);
      if (nextValue !== currentValue) {
        event.preventDefault();
        handleChange(nextValue);
      }
    },
    onBlur() {
      handleChangeComplete(getValue());
    },
    type: "number" as const,
    value: currentValue,
  };
};

export const WidthInput = ({ min }: { min: number }) => {
  const id = useId();
  const canvasWidth = useStore($canvasWidth);
  const selectedBreakpoint = useStore($selectedBreakpoint);
  const breakpoints = useStore($breakpoints);

  const onChange = (value: number) => {
    $canvasWidth.set(value);
    const applicableBreakpoint = findApplicableMedia(
      Array.from(breakpoints.values()),
      value
    );
    if (applicableBreakpoint) {
      $selectedBreakpointId.set(applicableBreakpoint.id);
    }
    if ($isResizingCanvas.get() === false) {
      $isResizingCanvas.set(true);
    }
  };

  const onChangeComplete = (value: number) => {
    onChange(value);
    $isResizingCanvas.set(false);
  };

  useEffect(() => {
    return () => {
      // Just in case we haven't received onChangeComplete, make sure we have set $isResizingCanvas to false,
      // otherwise the canvas will be stuck in a resizing state.
      if ($isResizingCanvas.get()) {
        $isResizingCanvas.set(false);
      }
    };
  }, []);

  const inputProps = useEnhancedInput({
    value: canvasWidth ?? 0,
    onChange,
    onChangeComplete,
    min,
  });

  if (canvasWidth === undefined || selectedBreakpoint === undefined) {
    return null;
  }

  return (
    <Flex gap="2" align="center">
      <Label htmlFor={id}>Width</Label>
      <InputField
        {...inputProps}
        id={id}
        suffix={
          <Text
            variant="unit"
            color="subtle"
            align="center"
            css={{ paddingInline: theme.spacing[3] }}
          >
            PX
          </Text>
        }
      />
    </Flex>
  );
};
