import React, { forwardRef, type ElementRef, type ComponentProps } from "react";

const defaultTag = "form";

export const Form = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>((props, ref) => <form {...props} ref={ref} />);

Form.displayName = "Form";
