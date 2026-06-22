const isOptionalSegmentMarker = (source: string, index: number) => {
  const nextChar = source[index + 1];
  if (nextChar !== undefined && nextChar !== "/") {
    return false;
  }

  const segmentStart = source.lastIndexOf("/", index - 1);
  const segment = source.slice(segmentStart + 1, index);
  return segment !== "";
};

export const getRedirectSourceSearchIndex = (source: string) => {
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

const stripSearch = (path: string) => {
  const searchIndex = getRedirectSourceSearchIndex(path);
  return searchIndex === -1 ? path : path.slice(0, searchIndex);
};

const safeDecodePathname = (pathname: string) => {
  try {
    return decodeURI(pathname);
  } catch {
    return pathname;
  }
};

export const stripRedirectSourceFragment = (source: string) => {
  const hashIndex = source.indexOf("#");
  return hashIndex === -1 ? source : source.slice(0, hashIndex);
};

export const normalizeRedirectSource = (source: string) => {
  const sourceWithoutFragment = stripRedirectSourceFragment(source);
  const searchIndex = getRedirectSourceSearchIndex(sourceWithoutFragment);
  if (searchIndex === -1) {
    return safeDecodePathname(sourceWithoutFragment);
  }
  const pathname = sourceWithoutFragment.slice(0, searchIndex);
  const search = sourceWithoutFragment.slice(searchIndex);
  return `${safeDecodePathname(pathname)}${search}`;
};

export const getRedirectSourcePathname = (source: string) => {
  return stripSearch(normalizeRedirectSource(source));
};

export const isRedirectSourcePattern = (source: string) => {
  return (
    /(^|\/):[^/]+/.test(source) ||
    /(^|\/)\*(?=\/|$)/.test(source) ||
    /(^|\/)[^/]+\?(?=\/|$)/.test(source)
  );
};

export const hasNamedSplat = (source: string) => {
  return /(^|\/):[^/?#/*]+\*(?=\/|[?#]|$)/.test(source);
};

const isExternalOrNonPathTarget = (target: string) => {
  return (
    /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(target) ||
    target.startsWith("//") ||
    target.startsWith("#")
  );
};

const getPathParamNames = (pathname: string) => {
  const names = new Set<string>();
  for (const segment of pathname.split("/")) {
    if (segment === "*") {
      names.add("*");
      continue;
    }
    const match = segment.match(/^:([a-zA-Z_][a-zA-Z0-9_]*)\??$/);
    if (match) {
      names.add(match[1]);
    }
  }
  return names;
};

const getRedirectSourcePathParamNames = (source: string) => {
  const normalizedSource = normalizeRedirectSource(source);
  if (getRedirectSourceSearchIndex(normalizedSource) !== -1) {
    return new Set<string>();
  }
  return getPathParamNames(getRedirectSourcePathname(normalizedSource));
};

const paramLikePattern = /:[a-zA-Z_][a-zA-Z0-9_]*/;
const pathParamPattern = /^:([a-zA-Z_][a-zA-Z0-9_]*)\??$/;

export const hasInvalidLocalTargetParams = (
  target: string,
  source?: string
) => {
  if (isExternalOrNonPathTarget(target)) {
    return false;
  }

  const searchOrHashIndex = target.search(/[?#]/);
  if (
    searchOrHashIndex !== -1 &&
    paramLikePattern.test(target.slice(searchOrHashIndex))
  ) {
    return true;
  }

  const sourceParamNames =
    source === undefined ? undefined : getRedirectSourcePathParamNames(source);
  const pathname = target.split(/[?#]/, 1)[0];
  return pathname.split("/").some((segment) => {
    let targetParamName: string | undefined;
    if (segment === "*") {
      targetParamName = "*";
    } else {
      const match = segment.match(pathParamPattern);
      if (match) {
        targetParamName = match[1];
      } else {
        return paramLikePattern.test(segment);
      }
    }

    return (
      sourceParamNames !== undefined &&
      sourceParamNames.has(targetParamName) === false
    );
  });
};

export const doesRedirectSourceMatchUrl = (source: string, url: string) => {
  const normalizedSource = normalizeRedirectSource(source);
  const normalizedUrl = normalizeRedirectSource(url);

  if (getRedirectSourceSearchIndex(normalizedSource) !== -1) {
    return normalizedSource === normalizedUrl;
  }

  return normalizedSource === stripSearch(normalizedUrl);
};
