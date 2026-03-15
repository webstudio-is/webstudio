import { useRef, useEffect, type RefObject } from "react";
import {
  numericScrubControl,
  type NumericScrubValue,
  type NumericScrubDirection,
} from "./numeric-gesture-control";

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

export const NumericGestureControl = Object.assign(Input.bind({}), {
  args: { value: 0, direction: "horizontal", acceleration: 1 },
});

export default {
  title: "Primitives/Numeric gesture control",
  component: Input,
  argTypes: {
    value: {
      control: { type: "number" },
    },
    direction: {
      options: ["horizontal", "vertical"],
      control: { type: "radio" },
    },
  },
};

export const VerticalControl = Object.assign(Input.bind({}), {
  args: { value: 0, direction: "vertical", acceleration: 1 },
});

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

export const ConstrainedControl = () => (
  <ConstrainedInput
    value={50}
    direction="horizontal"
    minValue={0}
    maxValue={100}
  />
);
