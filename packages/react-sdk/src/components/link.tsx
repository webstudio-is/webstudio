import React, { forwardRef, type ElementRef, type ComponentProps } from "react";

const defaultTag = "a";

type LinkProps = ComponentProps<typeof defaultTag>;

export const Link = forwardRef<ElementRef<typeof defaultTag>, LinkProps>(
  (props, ref) => <a {...props} ref={ref} />
);

Link.displayName = "Link";
