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

// @todo prevent replacing with empty strigs
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
