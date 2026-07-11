export const isJsonObject = (
  value: unknown
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && Array.isArray(value) === false;

export const appendJsonPath = (path: string, key: string | number) =>
  typeof key === "number"
    ? `${path}[${key}]`
    : /^[A-Za-z_$][\w$]*$/.test(key)
      ? `${path}.${key}`
      : `${path}[${JSON.stringify(key)}]`;

export const getJsonLdTypes = (value: unknown) =>
  typeof value === "string"
    ? [value]
    : Array.isArray(value) && value.every((item) => typeof item === "string")
      ? value
      : [];
