import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";

type ProgressAnimationProps<T extends Record<string, unknown> = {}> = {
  children: React.ReactNode;
} & ComponentPropsWithoutRef<"div"> &
  T;

export const createProgressAnimation = <T extends Record<string, unknown>>() =>
  forwardRef<ElementRef<"div">, ProgressAnimationProps<T>>((props, ref) => {
    // Implementation is located in private-src
    return <div ref={ref} {...props} />;
  });
