export type UrlParts = {
  pathname: string;
  search: string;
  hash: string;
};

export const isInternalHref = (href: string, assetBaseUrl: string) =>
  /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href) === false &&
  (assetBaseUrl !== "" &&
    href.startsWith("/") &&
    href.startsWith(assetBaseUrl)) === false;

/**
 * React Router resolves href="" and hash-only hrefs without preserving the
 * concrete browser URL shape Webstudio uses for :local-link-like matching.
 * Normalize those cases before comparing so current-link state follows anchor
 * URL semantics instead of route-only semantics.
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
