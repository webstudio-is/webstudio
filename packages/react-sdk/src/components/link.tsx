import React, { forwardRef, type ElementRef, type ComponentProps } from "react";

const defaultTag = "a";

type LinkProps = Omit<ComponentProps<typeof defaultTag>, "href"> & {
  href?: string;
};

export const Link = forwardRef<ElementRef<typeof defaultTag>, LinkProps>(
  ({ href = "", ...props }, ref) => <a {...props} href={href} ref={ref} />
);

Link.displayName = "Link";
