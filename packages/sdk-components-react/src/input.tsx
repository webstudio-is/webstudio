import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "input";

export const Input = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag> & {
    type?:
      | "color"
      | "date"
      | "datetime-local"
      | "email"
      | "hidden"
      | "month"
      | "number"
      | "password"
      | "range"
      | "search"
      | "tel"
      | "text"
      | "time"
      | "url"
      | "week";
  }
  // Make sure children are not passed down to an input, because this will result in error.
>(({ children: _children, type = "text", ...props }, ref) => (
  <input {...props} type={type} ref={ref} />
));

Input.displayName = "Input";
