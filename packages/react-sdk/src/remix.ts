const getRemixSegment = (segment: string) => {
  if (segment === "*") {
    return "$";
  }
  // matches following examples
  // :name
  // :name?
  // :name*
  const match = segment.match(/^:(?<name>\w+)(?<modifier>\*|\?)?$/);
  const name = match?.groups?.name;
  const modifier = match?.groups?.modifier;
  if (name) {
    if (modifier === "*") {
      return "$";
    }
    if (modifier === "?") {
      return `($${name})`;
    }
    return `$${name}`;
  }
  return `[${segment}]`;
};

/**
 * transforms url pattern subset to remix route format
 *
 * /:name/ -> .$name. - named dynamic segment
 * /:name?/ -> .($name). - optional dynamic segment
 * /* -> .$ - splat in the end of pattern
 * /:name* -> .$ - named splat which gets specified name at runtime
 *
 */
export const generateRemixRoute = (pathname: string) => {
  if (pathname.startsWith("/")) {
    pathname = pathname.slice(1);
  }
  if (pathname === "") {
    return `_index`;
  }
  const base = pathname.split("/").map(getRemixSegment).join(".");
  const tail = pathname.endsWith("*") ? "" : "._index";
  return `${base}${tail}`;
};

/** Map Remix splat parameters to the names used in Webstudio page paths. */
export const toWebstudioParams = (
  pathname: string,
  params: Record<string, string | undefined>
) => {
  const result = { ...params };
  const namedSplat = pathname.match(/:(\w+)\*$/)?.[1];
  if (namedSplat) {
    result[namedSplat] = result["*"];
    delete result["*"];
  } else if (pathname.endsWith("/*")) {
    result[0] = result["*"];
    delete result["*"];
  }
  return result;
};

/** Generate the page-specific wrapper used by published routes. */
export const generateRemixParams = (pathname: string) =>
  `export const getRemixParams = (params: Record<string, string | undefined>) => toWebstudioParams(${JSON.stringify(pathname)}, params);`;
