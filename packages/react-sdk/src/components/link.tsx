import { Link as RemixLink } from "@remix-run/react";
import { forwardRef, type ElementRef, type ComponentProps } from "react";

const isAbsoluteUrl = (href: string) => {
  // http:, mailto:, tel:, etc.
  return /^[a-z]+:/i.test(href);
};

const defaultTag = "a";

type LinkProps = Omit<ComponentProps<typeof defaultTag>, "href"> & {
  href?: string;
};

export const Link = forwardRef<ElementRef<typeof defaultTag>, LinkProps>(
  ({ href = "", ...props }, ref) => {
    if (isAbsoluteUrl(href)) {
      return <a {...props} href={href} ref={ref} />;
    }
    return <RemixLink {...props} to={href} ref={ref} />;
  }
);

Link.displayName = "Link";
