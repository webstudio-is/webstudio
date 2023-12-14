import { URLPattern } from "urlpattern-polyfill";

const baseUrl = "http://url";

export const parsePathnamePattern = (pathname: string) => {
  try {
    const pattern = new URLPattern(pathname, baseUrl);
    // match path with itself to figure out if some parameters are specified
    const fakeParams = pattern.exec(pathname, baseUrl)?.pathname.groups;
    return Object.keys(fakeParams ?? {});
  } catch {
    return [];
  }
};

const indexRegex = /^\d+$/;

export const compilePathnamePattern = (
  pathname: string,
  values: Record<string, string>
) => {
  const entries = Object.entries(values)
    .sort(
      // sort only indexes, names order is not important
      ([leftName], [rightName]) => Number(leftName) - Number(rightName)
    )
    .filter(([_name, value]) => value.length > 0);
  for (const [name, value] of entries) {
    pathname = pathname.replaceAll(`:${name}*`, value);
    pathname = pathname.replaceAll(`:${name}`, value);
  }
  for (const [name, value] of entries) {
    if (indexRegex.test(name)) {
      // replace only first occurence
      pathname = pathname.replace(`*`, value);
    }
  }
  return pathname;
};

export const validatePathnamePattern = (pathname: string) => {
  try {
    new URLPattern(pathname, baseUrl);
  } catch {
    return [`Invalid path pattern '${pathname}'`];
  }

  const messages: string[] = [];

  // allowed syntax
  // :name - group without modifiers
  // :name? - group with optional modifier
  // :name* - group with zero or more modifier in the end
  // * - wildcard group in the end

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
