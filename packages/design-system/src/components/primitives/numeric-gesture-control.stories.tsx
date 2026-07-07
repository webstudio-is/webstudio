import { useRef, useEffect, type RefObject } from "react";
import {
  numericScrubControl,
  type NumericScrubValue,
  type NumericScrubDirection,
} from "./numeric-gesture-control";
import { StorySection } from "../storybook";

const useNumericScrubControl = ({
  ref,
  value,
  direction,
  acceleration,
}: {
  ref: RefObject<null | HTMLInputElement>;
  value: NumericScrubValue;
  direction: NumericScrubDirection;
  acceleration: number;
}) => {
  useEffect(() => {
    if (ref.current === null) {
      return;
    }
    ref.current.value = String(value);
    return numericScrubControl(ref.current, {
      getInitialValue: () => value,
      direction,
      getAcceleration() {
        return acceleration;
      },
      onValueInput: (event) => {
        (event.target as HTMLInputElement).value = String(event.value);
      },
      onValueChange: (event) => {
        event.preventDefault();
        (event.target as HTMLInputElement).value = String(event.value);
        (event.target as HTMLInputElement).select();
      },
    });
  }, [direction, value, acceleration, ref]);
};

const Input = ({
  value,
  direction,
  acceleration,
}: {
  value: NumericScrubValue;
  direction: NumericScrubDirection;
  acceleration: number;
}) => {
  const ref = useRef<HTMLInputElement | null>(null);
  useNumericScrubControl({ ref, value, direction, acceleration });
  return <input defaultValue={value} ref={ref} />;
};

const ConstrainedInput = ({
  value,
  direction,
  minValue,
  maxValue,
}: {
  value: NumericScrubValue;
  direction: NumericScrubDirection;
  minValue: number;
  maxValue: number;
}) => {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (ref.current === null) {
      return;
    }
    ref.current.value = String(value);
    return numericScrubControl(ref.current, {
      getInitialValue: () => value,
      direction,
      minValue,
      maxValue,
      getAcceleration: () => 1,
      onValueInput: (event) => {
        (event.target as HTMLInputElement).value = String(event.value);
      },
      onValueChange: (event) => {
        event.preventDefault();
        (event.target as HTMLInputElement).value = String(event.value);
        (event.target as HTMLInputElement).select();
      },
    });
  }, [direction, value, minValue, maxValue, ref]);
  return <input defaultValue={value} ref={ref} />;
};

export const NumericGestureControl = () => (
  <>
    <StorySection title="Horizontal control">
      <Input value={0} direction="horizontal" acceleration={1} />
    </StorySection>

    <StorySection title="Vertical control">
      <Input value={0} direction="vertical" acceleration={1} />
    </StorySection>

    <StorySection title="Constrained control (0-100)">
      <ConstrainedInput
        value={50}
        direction="horizontal"
        minValue={0}
        maxValue={100}
      />
    </StorySection>
  </>
);

export default {
  title: "Primitives/Numeric Gesture Control",
  component: Input,
};
