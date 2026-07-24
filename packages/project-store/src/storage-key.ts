export const validateStorageKey = (key: string, allowEmpty = false) => {
  if (allowEmpty && key === "") {
    return;
  }
  if (
    key.length === 0 ||
    key.startsWith("/") ||
    key.endsWith("/") ||
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
