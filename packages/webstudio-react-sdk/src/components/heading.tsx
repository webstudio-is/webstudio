import React, { forwardRef, type ElementRef, type ComponentProps } from "react";

const defaultTag = "h1";

export const Heading = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>((props, ref) => <h1 {...props} ref={ref} />);

Heading.displayName = "Heading";
