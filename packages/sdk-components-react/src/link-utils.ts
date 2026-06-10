import type { ComponentPropsWithoutRef } from "react";

export type UrlParts = {
  pathname: string;
  search: string;
  hash: string;
};

type AnchorProps = ComponentPropsWithoutRef<"a">;

export const isLocalHref = (href: string, assetBaseUrl: string) =>
  /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href) === false &&
  (href.startsWith("/") && href.startsWith(assetBaseUrl)) === false;

/**
 * React Router resolves href="" and hash-only hrefs without preserving the
 * concrete browser URL shape Webstudio uses for :local-link-like matching.
 * Normalize those cases before comparing so aria-current follows anchor URL
 * semantics instead of route-only semantics.
 */
export const resolveLocalLinkUrl = (
  href: string,
  location: UrlParts,
  resolvedPath: UrlParts
): UrlParts => {
  if (href === "") {
    return {
      pathname: location.pathname,
      search: location.search,
      hash: "",
    };
  }

  if (href.startsWith("#")) {
    return {
      pathname: location.pathname,
      search: location.search,
      hash: href === "#" ? "" : href,
    };
  }

  return resolvedPath;
};

/**
 * Webstudio's local link styles target the concrete URL, not just the matched
 * route. This intentionally preserves the old NavLink end/exact behavior while
 * also requiring query string and fragment equality.
 */
export const isLocalLinkActive = (current: UrlParts, target: UrlParts) => {
  return (
    current.pathname === target.pathname &&
    current.search === target.search &&
    current.hash === target.hash
  );
};

export const getLocalLinkProps = <
  Props extends {
    href: string;
    "aria-current"?: AnchorProps["aria-current"];
    className?: string;
  },
>(
  props: Props,
  location: UrlParts,
  resolvedPath: UrlParts
) => {
  const { href, "aria-current": ariaCurrent, className, ...linkProps } = props;
  const target = resolveLocalLinkUrl(href, location, resolvedPath);
  const isActive = isLocalLinkActive(location, target);
  const classNameValue = [className, isActive ? "active" : undefined]
    .filter(Boolean)
    .join(" ");

  return {
    href,
    linkProps,
    localLinkProps: {
      ...(isActive ? { "aria-current": ariaCurrent ?? "page" } : {}),
      ...(classNameValue === "" ? {} : { className: classNameValue }),
    },
  };
};

export const stripRouterOnlyProps = <
  Props extends {
    prefetch?: unknown;
    reloadDocument?: unknown;
    replace?: unknown;
    preventScrollReset?: unknown;
  },
>({
  prefetch,
  reloadDocument,
  replace,
  preventScrollReset,
  ...props
}: Props) => props;
