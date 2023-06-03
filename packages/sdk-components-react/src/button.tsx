import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "button";

type ButtonProps = ComponentProps<typeof defaultTag> & { innerText?: string };

export const Button = forwardRef<ElementRef<typeof defaultTag>, ButtonProps>(
  (
    {
      type = "submit",
      innerText = "Edit Inner Text in Properties",
      children,
      ...props
    },
    ref
  ) => (
    <button type={type} {...props} ref={ref}>
      {children ? children : innerText}
    </button>
  )
);

Button.displayName = "Button";
