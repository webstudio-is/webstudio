import React, { forwardRef, type ElementRef, type ComponentProps } from "react";

const defaultTag = "input";

export const Input = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
  // Make sure children are not passed down to an input, because this will result in error.
>(({ children: _children, ...props }, ref) => <input {...props} ref={ref} />);

Input.displayName = "Input";
