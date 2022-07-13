import React, { forwardRef, type ElementRef, type ComponentProps } from "react";

const defaultTag = "b";

export const Bold = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>((props, ref) => <b {...props} ref={ref} />);

Bold.displayName = "Bold";
