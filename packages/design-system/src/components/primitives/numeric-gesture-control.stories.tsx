import { useRef, useEffect, RefObject } from "react";
import {
  numericScrubControl,
  type NumericScrubValue,
  type NumericScrubDirection,
} from "./numeric-gesture-control";

const useNumericScrubControl = ({
  ref,
  value,
  direction,
}: {
  ref: RefObject<HTMLInputElement>;
  value: NumericScrubValue;
  direction: NumericScrubDirection;
}) => {
  useEffect(() => {
    if (ref.current === null) return;
    ref.current.value = String(value);
    const { disconnectedCallback } = numericScrubControl(ref.current, {
      initialValue: value,
      direction: direction,
      onValueChange: (event) => {
        event.preventDefault();
        (event.target as HTMLInputElement).value = String(event.value);
        (event.target as HTMLInputElement).select();
      },
    });
    return () => disconnectedCallback();
  }, [direction, value, ref]);
};

const Input = ({
  value,
  direction,
}: {
  value: NumericScrubValue;
  direction: NumericScrubDirection;
}) => {
  const ref = useRef<HTMLInputElement | null>(null);
  useNumericScrubControl({ ref, value, direction });
  return <input defaultValue={value} ref={ref} />;
};

export const NumericInput = Object.assign(Input.bind({}), {
  args: { value: 0, direction: "horizontal" },
});

export default {
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
