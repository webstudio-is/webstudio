import { Link as RemixLink } from "@remix-run/react";
import { forwardRef, type ElementRef, type ComponentProps } from "react";

const defaultTag = "a";

type LinkProps = Omit<ComponentProps<typeof defaultTag>, "href"> & {
  href?: string;
};

export const Link = forwardRef<ElementRef<typeof defaultTag>, LinkProps>(
  ({ href = "", ...props }, ref) => <RemixLink {...props} to={href} ref={ref} />
);

Link.displayName = "Link";
