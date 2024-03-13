import { URLPattern } from "urlpattern-polyfill";

const baseUrl = "http://url";

export const matchPathnamePattern = (pattern: string, pathname: string) => {
  try {
    return new URLPattern({ pathname: pattern }).exec({ pathname })?.pathname
      .groups;
  } catch {
    // empty block
  }
};

// allowed syntax
// :name - group without modifiers
// :name? - group with optional modifier
// :name* - group with zero or more modifier in the end
// * - wildcard group in the end

type Token =
  | { type: "fragment"; value: string }
  | { type: "param"; name: string; optional: boolean; splat: boolean };

// /:slug -> { name: "slug", modifier: "" }
// /:slug* -> { name: "slug", modifier: "*" }
// /:slug? -> { name: "slug", modifier: "?" }
// /* -> { wildcard: "*" }
const tokenRegex = /:(?<name>\w+)(?<modifier>[?*]?)|(?<wildcard>(?<!:\w+)\*)/;
// use separate regex from matchAll because regex.test is stateful when used with g flag
const tokenRegexGlobal = new RegExp(tokenRegex.source, "g");

export const isPathnamePattern = (pathname: string) =>
  tokenRegex.test(pathname);

export const tokenizePathnamePattern = (pathname: string) => {
  const tokens: Token[] = [];
  let lastCursor = 0;
  let lastWildcard = -1;

  for (const match of pathname.matchAll(tokenRegexGlobal)) {
    const cursor = match.index ?? 0;
    if (lastCursor < cursor) {
      tokens.push({
        type: "fragment",
        value: pathname.slice(lastCursor, cursor),
      });
    }
    lastCursor = cursor + match[0].length;
    if (match.groups?.name) {
      const optional = match.groups.modifier === "?";
      const splat = match.groups.modifier === "*";

      tokens.push({ type: "param", name: match.groups.name, optional, splat });
    }
    if (match.groups?.wildcard) {
      lastWildcard += 1;
      tokens.push({
        type: "param",
        name: lastWildcard.toString(),
        splat: true,
        optional: false,
      });
    }
  }
  if (lastCursor < pathname.length || tokens.length === 0) {
    tokens.push({
      type: "fragment",
      value: pathname.slice(lastCursor),
    });
  }
  return tokens;
};

export const compilePathnamePattern = (
  tokens: Token[],
  values: Record<string, string>
) => {
  let compiledPathname = "";
  for (const token of tokens) {
    if (token.type === "fragment") {
      compiledPathname += token.value;
    }
    if (token.type === "param") {
      const value = values[token.name] ?? "";
      // remove preceding slash
      if (token.optional && value.length === 0) {
        compiledPathname = compiledPathname.slice(0, -1);
      }
      compiledPathname += value;
    }
  }
  return compiledPathname;
};

export const validatePathnamePattern = (pathname: string) => {
  try {
    new URLPattern(pathname, baseUrl);
  } catch {
    return [`Invalid path pattern '${pathname}'`];
  }

  const messages: string[] = [];

  // fobid :name+ everywhere
  const namedGroupsWithPlus = Array.from(pathname.matchAll(/:\w+\+/g)).flat();
  if (namedGroupsWithPlus.length > 0) {
    const list = namedGroupsWithPlus.map((item) => `'${item}'`).join(", ");
    messages.push(`Dynamic parameters ${list} shouldn't have the + modifier.`);
  }

  // :name* in the middle
  const namedGroupsWithAsterisk = Array.from(
    // skip matching in the end of string
    pathname.matchAll(/:\w+\*(?!$)/g)
  ).flat();
  if (namedGroupsWithAsterisk.length > 0) {
    const list = namedGroupsWithAsterisk.map((item) => `'${item}'`).join(", ");
    messages.push(`${list} should end the path.`);
  }

  // *? everywhere
  const wildcardGroupsWithQuestion = Array.from(
    pathname.matchAll(/\*\?/g)
  ).flat();
  if (wildcardGroupsWithQuestion.length > 0) {
    messages.push(`Optional wildcard '*?' is not allowed.`);
  }

  // * in the middle
  const wildcardGroups = Array.from(
    // skip matching with :name before *
    // skip matching with ? after *
    // skip matching with * in the end
    pathname.matchAll(/(?<!:\w+)\*(?!\?)(?!$)/g)
  ).flat();
  if (wildcardGroups.length > 0) {
    messages.push(`Wildcard '*' should end the path.`);
  }

  // show segment errors only when syntax is valid
  if (messages.length > 0) {
    return messages;
  }

  for (const segment of pathname.split("/")) {
    const group = segment.match(/(?<group>:\w+(\*|\?)?)/)?.groups?.group;
    if (group) {
      if (group.length !== segment.length) {
        messages.push(
          `Static parts cannot be mixed with dynamic parameters at '${segment}'.`
        );
      }
    } else if (segment.includes("*")) {
      if (segment.length > 1) {
        messages.push(
          `Static parts cannot be mixed with dynamic parameters at '${segment}'.`
        );
      }
    }
  }

  return messages;
};
