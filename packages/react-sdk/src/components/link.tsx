import { Link as RemixLink } from "@remix-run/react";
import { forwardRef, type ElementRef, type ComponentProps } from "react";

const isAbsoluteUrl = (href: string) => {
  // http:, mailto:, tel:, etc.
  return /^[a-z]+:/i.test(href);
};

export const renderLink = (
  href: string,
  props: Omit<ComponentProps<"a">, "href">,
  ref: React.ForwardedRef<HTMLAnchorElement>
) => {
  return isAbsoluteUrl(href) ? (
    <a {...props} href={href} ref={ref} />
  ) : (
    <RemixLink {...props} to={href} ref={ref} />
  );
};

type LinkProps = Omit<ComponentProps<"a">, "href"> & {
  href?: string;
};

export const Link = forwardRef<ElementRef<"a">, LinkProps>(
  ({ href = "", ...props }, ref) => renderLink(href, props, ref)
);

Link.displayName = "Link";
