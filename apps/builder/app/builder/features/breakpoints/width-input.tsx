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
} from "@webstudio-is/design-system";
import { useCanvasWidth } from "~/builder/shared/nano-states";
import { breakpointsStore } from "~/shared/nano-states";
import {
  selectedBreakpointIdStore,
  selectedBreakpointStore,
} from "~/shared/nano-states";
import { useState, type ChangeEvent, type KeyboardEvent } from "react";

// Doesn't make sense to allow resizing the canvas lower/higher than this.
export const minWidth = 240;

const useEnhancedInput = ({
  onChange,
  value,
}: {
  onChange: (value: NumericScrubValue) => void;
  value: number;
}) => {
  const [intermediateValue, setIntermediateValue] = useState<number>();

  const handleChange = (nextValue: number) => {
    onChange(Math.max(nextValue, minWidth));
    setIntermediateValue(undefined);
  };

  const { scrubRef, inputRef } = useScrub({
    value,
    onChange: handleChange,
  });

  return {
    ref: scrubRef,
    inputRef,
    onChange(event: ChangeEvent<HTMLInputElement>) {
      setIntermediateValue(event.target.valueAsNumber);
    },
    onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
      if (event.key === "Enter") {
        handleChange(event.currentTarget.valueAsNumber);
      }
    },
    onBlur() {
      handleChange(inputRef.current?.valueAsNumber ?? 0);
    },
    type: "number" as const,
    value: intermediateValue ?? value,
  };
};

export const WidthInput = () => {
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
  };

  const inputProps = useEnhancedInput({ onChange, value: canvasWidth ?? 0 });

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
