import {
  createPath,
  generatePath,
  matchPath,
  parsePath,
} from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";

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
  if (
    /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(url) ||
    url.startsWith("//") ||
    url.startsWith("?") ||
    url.startsWith("#")
  ) {
    return url;
  }

  const targetParams = Object.fromEntries(
    Object.entries(params).map(([name, value]) => [
      name,
      name === "*" ? value : value?.replaceAll("/", "%2F"),
    ])
  );
  const path = parsePath(url);
  try {
    return createPath({
      ...path,
      pathname: generatePath(path.pathname ?? "/", targetParams),
    });
  } catch {
    return url;
  }
};

const stripHash = (source: string) => {
  const hashIndex = source.indexOf("#");
  return hashIndex === -1 ? source : source.slice(0, hashIndex);
};

const getRedirectStatus = (status: RedirectItem["status"]) => {
  return Number(status) === 302 ? 302 : 301;
};

const decodePathname = (pathname: string) => {
  try {
    return decodeURI(pathname);
  } catch {
    return pathname;
  }
};

const getPathnameVariants = (pathname: string) => {
  return Array.from(new Set([pathname, decodePathname(pathname)]));
};

const isOptionalSegmentMarker = (source: string, index: number) => {
  const nextChar = source[index + 1];
  if (nextChar !== undefined && nextChar !== "/") {
    return false;
  }

  const segmentStart = source.lastIndexOf("/", index - 1);
  const segment = source.slice(segmentStart + 1, index);
  return segment !== "";
};

const getSourceSearchIndex = (source: string) => {
  for (let index = 0; index < source.length; index += 1) {
    if (
      source[index] === "?" &&
      isOptionalSegmentMarker(source, index) === false
    ) {
      return index;
    }
  }
  return -1;
};

const isRedirectPattern = (source: string) => {
  return (
    /(^|\/):[^/]+/.test(source) ||
    /(^|\/)\*(?=\/|$)/.test(source) ||
    /(^|\/)[^/]+\?(?=\/|$)/.test(source)
  );
};

export const matchRedirect = (
  requestUrl: string,
  redirects: RedirectItem[]
): MatchedRedirect | undefined => {
  const url = new URL(requestUrl);
  const requestPathnames = getPathnameVariants(url.pathname);

  for (const redirect of redirects) {
    const source = stripHash(redirect.old);
    if (getSourceSearchIndex(source) !== -1) {
      const exactMatch = requestPathnames.some(
        (requestPathname) => source === `${requestPathname}${url.search}`
      );
      if (exactMatch) {
        return {
          url: generateRedirectUrl(redirect.new, {}),
          status: getRedirectStatus(redirect.status),
        };
      }
      continue;
    }

    if (isRedirectPattern(source) === false) {
      if (requestPathnames.includes(source)) {
        return {
          url: generateRedirectUrl(redirect.new, {}),
          status: getRedirectStatus(redirect.status),
        };
      }
      continue;
    }

    const match = requestPathnames
      .map((requestPathname) =>
        matchPath(
          { path: source, caseSensitive: true, end: true },
          requestPathname
        )
      )
      .find((match) => match !== null);
    if (match === undefined) {
      continue;
    }

    return {
      url: generateRedirectUrl(redirect.new, match.params),
      status: getRedirectStatus(redirect.status),
    };
  }
};

export const redirectRequest = (
  request: Request,
  redirects: RedirectItem[]
): Response | undefined => {
  const matchedRedirect = matchRedirect(request.url, redirects);
  if (matchedRedirect === undefined) {
    return;
  }
  return redirect(matchedRedirect.url, matchedRedirect.status);
};
