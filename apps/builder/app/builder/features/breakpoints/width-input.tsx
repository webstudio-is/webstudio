import { useStore } from "@nanostores/react";
import { findApplicableMedia } from "@webstudio-is/css-engine";
import {
  theme,
  Text,
  Flex,
  Label,
  type NumericScrubValue,
  InputField,
  useId,
  useScrub,
  handleNumericInputArrowKeys,
} from "@webstudio-is/design-system";
import { useCanvasWidth } from "~/builder/shared/nano-states";
import { breakpointsStore, isResizingCanvasStore } from "~/shared/nano-states";
import {
  selectedBreakpointIdStore,
  selectedBreakpointStore,
} from "~/shared/nano-states";
import { useState, type KeyboardEvent, useEffect } from "react";

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
  const [canvasWidth, setCanvasWidth] = useCanvasWidth();
  const selectedBreakpoint = useStore(selectedBreakpointStore);
  const breakpoints = useStore(breakpointsStore);

  const onChange = (value: number) => {
    setCanvasWidth(value);
    const applicableBreakpoint = findApplicableMedia(
      Array.from(breakpoints.values()),
      value
    );
    if (applicableBreakpoint) {
      selectedBreakpointIdStore.set(applicableBreakpoint.id);
    }
    if (isResizingCanvasStore.get() === false) {
      isResizingCanvasStore.set(true);
    }
  };

  const onChangeComplete = (value: number) => {
    onChange(value);
    isResizingCanvasStore.set(false);
  };

  useEffect(() => {
    return () => {
      // Just in case we haven't received onChangeComplete, make sure we have set isResizingCanvasStore to false,
      // otherwise the canvas will be stuck in a resizing state.
      if (isResizingCanvasStore.get()) {
        isResizingCanvasStore.set(false);
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
        css={{ width: theme.spacing[19] }}
        id={id}
        suffix={
          <Text
            variant="unit"
            color="subtle"
            align="center"
            css={{ width: theme.spacing[10] }}
          >
            PX
          </Text>
        }
      />
    </Flex>
  );
};
