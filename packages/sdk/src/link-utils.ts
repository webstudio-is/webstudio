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
      hash: new URL(href, "https://webstudio.local/").hash,
    };
  }

  return resolvedPath;
};

const serializeHash = (hash: string) => {
  const url = new URL("https://webstudio.local/");
  // Assigning preserves trailing spaces that URL parsing would trim.
  url.hash = hash;
  return url.hash;
};

/**
 * Webstudio's local link styles target the concrete URL, not just the matched
 * route. Without a current fragment, all links to the same path and query
 * match. With a fragment, page links and links to that section match.
 */
export const isLocalLinkActive = (current: UrlParts, target: UrlParts) => {
  return (
    current.pathname === target.pathname &&
    current.search === target.search &&
    (current.hash === "" ||
      target.hash === "" ||
      serializeHash(current.hash) === serializeHash(target.hash))
  );
};

/** Resolve a configured redirect without allowing executable URL schemes. */
export const resolveRedirectUrl = (
  value: string | undefined,
  baseUrl: string
) => {
  if (typeof value !== "string" || value.trim() === "") {
    return;
  }
  try {
    const url = new URL(value, baseUrl);
    if (["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) {
      return url.href;
    }
  } catch {
    // Invalid destinations leave the visitor on the Form success message.
  }
};
