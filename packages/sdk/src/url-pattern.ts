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
