import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "button";

type ButtonProps = ComponentProps<typeof defaultTag>;

export const Button = forwardRef<ElementRef<typeof defaultTag>, ButtonProps>(
  ({ type = "submit", children, ...props }, ref) => (
    <button type={type} {...props} ref={ref}>
      {children ?? "Button you can edit"}
    </button>
  )
);

Button.displayName = "Button";
