import { forwardRef, type ElementRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type ProgressAnimationProps<T extends Record<string, unknown> = {}> = {
  children: React.ReactNode;
} & T;

export const createProgressAnimation = <T extends Record<string, unknown>>() =>
  forwardRef<ElementRef<"div">, ProgressAnimationProps<T>>((props, ref) => {
    // Implementation is located in private-src
    return <div ref={ref} {...props} />;
  });
