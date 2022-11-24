import { Link as RemixLink, useLocation } from "@remix-run/react";
import { forwardRef, type ElementRef, type ComponentProps } from "react";

// @todo: Ideally this code should live in designer app.
// Sdk should not know how routing is implemented in designer.
// We can move it there later when we have a way of customizing components per environment.
const preserveMode = (href: string, currentSearch: string) => {
  // http:, mailto:, tel:, etc.
  if (/^[a-z]+:/i.test(href)) {
    return href;
  }

  const mode = new URLSearchParams(currentSearch).get("mode");

  if (mode !== "preview" && mode !== "edit") {
    return href;
  }

  const [path, search] = href.split("?");
  const searchParams = new URLSearchParams(search);
  searchParams.set("mode", mode);
  return `${path}?${searchParams.toString()}`;
};
const usePreserveMode = (href: string) => {
  const { search } = useLocation();
  return preserveMode(href, search);
};

const defaultTag = "a";

type LinkProps = Omit<ComponentProps<typeof defaultTag>, "href"> & {
  href?: string;
};

export const Link = forwardRef<ElementRef<typeof defaultTag>, LinkProps>(
  ({ href = "", ...props }, ref) => {
    const hrefWithMode = usePreserveMode(href);
    return <RemixLink {...props} to={hrefWithMode} ref={ref} />;
  }
);

Link.displayName = "Link";
