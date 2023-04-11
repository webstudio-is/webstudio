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
  type CSS,
  useScrub,
} from "@webstudio-is/design-system";
import { useCanvasWidth } from "~/builder/shared/nano-states";
import { breakpointsStore } from "~/shared/nano-states";
import {
  selectedBreakpointIdStore,
  selectedBreakpointStore,
} from "~/shared/nano-states";
import { useEffect, useRef, useState } from "react";

// Doesn't make sense to allow resizing the canvas lower/higher than this.
export const minWidth = 240;

export const WidthInput = () => {
  const id = useId();
  const [canvasWidth, setCanvasWidth] = useCanvasWidth();
  const selectedBreakpoint = useStore(selectedBreakpointStore);
  const breakpoints = useStore(breakpointsStore);

  if (canvasWidth === undefined || selectedBreakpoint === undefined) {
    return null;
  }

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

  return (
    <Flex gap="2" align="center">
      <Label htmlFor={id}>Width</Label>
      <Input
        css={{ width: theme.spacing[19] }}
        id={id}
        value={canvasWidth}
        min={minWidth}
        onChange={onChange}
        tabIndex={0}
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
/*
const useScrub = ({
  ref,
  value,
  direction,
  onChange,
}: {
  ref: RefObject<HTMLInputElement>;
  value: NumericScrubValue;
  direction: NumericScrubDirection;
  onChange: (value: NumericScrubValue) => void;
}) => {
  const valueRef = useRef<NumericScrubValue>(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    if (ref.current === null) {
      return;
    }
    const { disconnectedCallback } = numericScrubControl(ref.current, {
      getValue: () => valueRef.current,
      direction,
      onValueInput(event) {
        onChangeRef.current(event.value);
      },
      onValueChange: (event) => {
        event.preventDefault();
      },
    });
    return disconnectedCallback;
  }, [direction, ref]);
};
*/

const Input = ({
  value,
  onChange,
  suffix,
  id,
  css,
  tabIndex,
  min,
}: {
  value: NumericScrubValue;
  suffix?: JSX.Element;
  onChange: (value: NumericScrubValue) => void;
  id: string;
  css: CSS;
  tabIndex?: number;
  min?: number;
}) => {
  const [intermediateValue, setIntermediateValue] = useState<number>();
  const handleChangeComplete = (value: number) => {
    onChange(Math.max(value, min ?? 0));
    setIntermediateValue(undefined);
  };
  const handleChangeCompleteRef = useRef(handleChangeComplete);

  const { scrubRef, inputRef } = useScrub({
    value,
    onChange: handleChangeCompleteRef.current,
  });

  useEffect(
    () => () => {
      const value = inputRef.current?.valueAsNumber;
      if (value !== undefined) {
        handleChangeCompleteRef.current(value);
      }
    },
    [inputRef]
  );

  return (
    <InputField
      id={id}
      value={intermediateValue ?? value}
      ref={scrubRef}
      inputRef={inputRef}
      type="number"
      suffix={suffix}
      min={min}
      onChange={(event) => {
        setIntermediateValue(event.target.valueAsNumber);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          handleChangeComplete(value);
        }
      }}
      onBlur={() => {
        handleChangeComplete(value);
      }}
      css={css}
      tabIndex={tabIndex}
    />
  );
};
