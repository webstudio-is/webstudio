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
    return `_index.tsx`;
  }
  const base = pathname.split("/").map(getRemixSegment).join(".");
  const tail = pathname.endsWith("*") ? "" : "._index";
  return `${base}${tail}.tsx`;
};

/**
 * generates a function to convert remix params to compatible with url pattern groups
 *
 * for /:name* pattern
 * params["*"] is replaced with params["name"]
 *
 * for /* pattern
 * params["*"] is replaced with params[0]
 */
export const generateRemixParams = (pathname: string) => {
  const name = pathname.match(/:(?<name>\w+)\*$/)?.groups?.name;
  let generated = "";
  generated += `export const getRemixParams = ({ ...params }: Params): Params => {\n`;
  if (name) {
    generated += `  params["${name}"] = params["*"]\n`;
    generated += `  delete params["*"]\n`;
  }
  if (pathname.endsWith("/*")) {
    generated += `  params[0] = params["*"]\n`;
    generated += `  delete params["*"]\n`;
  }
  generated += `  return params\n`;
  generated += `}\n`;
  return generated;
};
