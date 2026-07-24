/**
 * Logical object keys use `/` on every backend. Backslashes and NUL bytes are
 * rejected so one key cannot address different paths on Windows, POSIX, and
 * object storage.
 */
export const validateStorageKey = (key: string, allowEmpty = false) => {
  if (allowEmpty && key === "") {
    return;
  }
  if (
    key.length === 0 ||
    key.startsWith("/") ||
    key.endsWith("/") ||
    key.includes("\\") ||
    key.includes("\0") ||
    key
      .split("/")
      .some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Error(`Invalid object key ${JSON.stringify(key)}`);
  }
};

export const prependStoragePrefix = (prefix: string, key: string) => {
  validateStorageKey(prefix, true);
  validateStorageKey(key, true);
  if (prefix === "") {
    return key;
  }
  if (key === "") {
    return `${prefix}/`;
  }
  return `${prefix}/${key}`;
};

/**
 * Storage scopes often originate from opaque external ids. URI encoding keeps
 * separators literal, but it deliberately leaves `.` untouched, including the
 * special filesystem segments `.` and `..`. Encode dots as well so the same
 * segment is safe and deterministic in filesystem paths, object keys, and URLs.
 */
export const encodeStoragePathSegment = (value: string) => {
  if (value.length === 0) {
    throw new Error("Storage path segment cannot be empty");
  }
  return encodeURIComponent(value).replaceAll(".", "%2E");
};

export const getHostedProjectStoragePrefixes = (projectId: string) => {
  const root = `projects/${encodeStoragePathSegment(projectId)}`;
  return {
    database: `${root}/db`,
    assets: `${root}/assets`,
  } as const;
};
