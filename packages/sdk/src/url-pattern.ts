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
