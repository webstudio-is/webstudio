import { Link } from "@remix-run/react";
import { type ComponentProps } from "react";

const isAbsoluteUrl = (href: string) => {
  // http:, mailto:, tel:, etc.
  return /^[a-z]+:/i.test(href);
};

export const renderRemixLink = (
  href: string,
  props: Omit<ComponentProps<"a">, "href">,
  ref: React.ForwardedRef<HTMLAnchorElement>
) =>
  isAbsoluteUrl(href) ? (
    <a {...props} href={href} ref={ref} />
  ) : (
    <Link {...props} to={href} ref={ref} />
  );
