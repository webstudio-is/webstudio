import { useRef, useEffect, RefObject } from "react";
import {
  numericGestureControl,
  type Value,
  type Direction,
} from "./numeric-gesture-control";

const useNumericGestureControl = ({
  ref,
  value,
  direction,
}: {
  ref: RefObject<HTMLInputElement>;
  value: Value;
  direction: Direction;
}) => {
  useEffect(() => {
    if (ref.current === null) return;
    ref.current.value = String(value);
    const { disconnectedCallback } = numericGestureControl(ref.current, {
      initialValue: value,
      direction: direction,
      onValueChange: (event) => {
        event.preventDefault();
        event.target.value = String(event.value);
        event.target.select();
      },
    });
    return () => disconnectedCallback();
  }, [direction, value, ref]);
};

const Input = ({
  value,
  direction,
}: {
  value: Value;
  direction: Direction;
}) => {
  const ref = useRef<HTMLInputElement | null>(null);
  useNumericGestureControl({ ref, value, direction });
  return <input defaultValue={value} ref={ref} />;
};

export const NumericInput = Object.assign(Input.bind({}), {
  args: { value: 0, direction: "horizontal" },
});

export default {
  title: "numericGestureControl",
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
