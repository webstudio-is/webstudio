import React, { forwardRef, type ElementRef, type ComponentProps } from "react";

const defaultTag = "button";

export type ButtonProps = ComponentProps<typeof defaultTag>;

export const Button = forwardRef<ElementRef<typeof defaultTag>, ButtonProps>(
  (props, ref) => <button {...props} ref={ref} />
);

Button.defaultProps = {
  type: "submit", // Match the platform default
};
Button.displayName = "Button";
