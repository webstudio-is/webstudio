import { createPath, generatePath, matchPath, parsePath } from "react-router";

type RedirectItem = {
  old: string;
  new: string;
  status?: number | string;
};

type MatchedRedirect = {
  url: string;
  status: number;
};

/**
 * Expands route params in local redirect targets.
 * External and protocol-relative URLs are returned unchanged because route params
 * only apply to app paths.
 */
export const generateRedirectUrl = (
  url: string,
  params: Record<string, string | undefined>
) => {
  if (url.startsWith("/") === false || url.startsWith("//")) {
    return url;
  }

  const path = parsePath(url);
  return createPath({
    ...path,
    pathname: generatePath(path.pathname ?? "/", params),
  });
};

const decodePathname = (pathname: string) => {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
};

const getPathnameVariants = (pathname: string) => {
  return Array.from(new Set([pathname, decodePathname(pathname)]));
};

const getRedirectSource = (source: string, origin: string) => {
  const url = new URL(source, origin);
  return {
    pathname: url.pathname,
    search: url.search,
  };
};

export const matchRedirect = (
  requestUrl: string,
  redirects: RedirectItem[]
): MatchedRedirect | undefined => {
  const url = new URL(requestUrl);
  const requestPathnames = getPathnameVariants(url.pathname);

  for (const redirect of redirects) {
    const source = getRedirectSource(redirect.old, url.origin);
    if (source.search !== "" && source.search !== url.search) {
      continue;
    }

    for (const sourcePathname of getPathnameVariants(source.pathname)) {
      for (const requestPathname of requestPathnames) {
        const match = matchPath(sourcePathname, requestPathname);
        if (match !== null) {
          return {
            url: generateRedirectUrl(redirect.new, match.params),
            status: Number(redirect.status ?? 301),
          };
        }
      }
    }
  }
};
