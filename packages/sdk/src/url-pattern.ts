// /:slug -> { name: "slug", modifier: "" }
// /:slug* -> { name: "slug", modifier: "*" }
// /:slug? -> { name: "slug", modifier: "?" }
// /* -> { wildcard: "*" }
const tokenRegex = /:(?<name>\w+)(?<modifier>[?*]?)|(?<wildcard>(?<!:\w+)\*)/;

export const isPathnamePattern = (pathname: string) =>
  tokenRegex.test(pathname);

// use separate regex from matchAll because regex.test is stateful when used with g flag
const tokenRegexGlobal = new RegExp(tokenRegex.source, "g");

export const matchPathnameParams = (pathname: string) => {
  return pathname.matchAll(tokenRegexGlobal);
};

export const removeTrailingSlash = (pathname: string) => {
  let end = pathname.length;
  while (end > 1 && pathname[end - 1] === "/") {
    end -= 1;
  }
  return pathname.slice(0, end);
};

/**
 * Boolean matcher for auth and response-header rules. A trailing wildcard also
 * matches its base path (`/docs/*` matches `/docs`). Page routing instead uses
 * project-build's URLPattern matcher, which returns decoded path parameters and
 * does not match `/docs` for that pattern.
 */
export const matchesPathnamePattern = (pattern: string, pathname: string) => {
  const patternSegments = removeTrailingSlash(pattern || "/")
    .slice(1)
    .split("/");
  const pathnameSegments = removeTrailingSlash(pathname || "/")
    .slice(1)
    .split("/");
  const matchSegments = (
    patternIndex: number,
    pathnameIndex: number
  ): boolean => {
    const segment = patternSegments[patternIndex];
    const value = pathnameSegments[pathnameIndex];
    if (segment === undefined) {
      return value === undefined;
    }
    if (segment === "*" || /^:\w+\*$/.test(segment)) {
      return patternIndex === patternSegments.length - 1;
    }
    if (/^:\w+\?$/.test(segment)) {
      return (
        matchSegments(patternIndex + 1, pathnameIndex) ||
        (value !== undefined &&
          matchSegments(patternIndex + 1, pathnameIndex + 1))
      );
    }
    if (value === undefined) {
      return false;
    }
    if (/^:\w+$/.test(segment)) {
      return matchSegments(patternIndex + 1, pathnameIndex + 1);
    }
    return (
      segment === value && matchSegments(patternIndex + 1, pathnameIndex + 1)
    );
  };
  return matchSegments(0, 0);
};

const parameterSegment = /^:\w+[?*]?$/;

export const validatePathnamePattern = (
  pattern: string
): string | undefined => {
  if (pattern.startsWith("/") === false) {
    return 'Route must start with "/"';
  }
  if (pattern === "/") {
    return;
  }
  if (pattern.endsWith("/")) {
    return 'Route must not end with "/"';
  }
  if (pattern.includes("//")) {
    return 'Route must not contain repeating "/"';
  }
  const segments = pattern.slice(1).split("/");
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment === undefined || segment === "") {
      return "Route contains an empty segment";
    }
    if (segment === "*" || /^:\w+\*$/.test(segment)) {
      if (index !== segments.length - 1) {
        return "Wildcard route segment must be the last segment";
      }
      continue;
    }
    if (segment.startsWith(":") && parameterSegment.test(segment) === false) {
      return `Invalid route parameter "${segment}"`;
    }
    if (segment.includes("*")) {
      return "Wildcard can only be used as * or :name*";
    }
  }
};

/**
 * Check if a string is an absolute URL (has a valid protocol)
 */
export const isAbsoluteUrl = (href: string) => {
  try {
    new URL(href);
    return true;
  } catch {
    return false;
  }
};
