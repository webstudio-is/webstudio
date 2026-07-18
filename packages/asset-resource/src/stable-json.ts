const compareStrings = (left: string, right: string) => {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
};

export const serializeJsonDeterministically = (value: unknown): string => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (Number.isFinite(value) === false) {
      throw new Error("Deterministic JSON cannot contain non-finite numbers");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(serializeJsonDeterministically).join(",")}]`;
  }
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error("Deterministic JSON can contain only plain objects");
    }
    return `{${Object.keys(value)
      .sort(compareStrings)
      .map(
        (key) =>
          `${JSON.stringify(key)}:${serializeJsonDeterministically(
            (value as Record<string, unknown>)[key]
          )}`
      )
      .join(",")}}`;
  }
  throw new Error("Deterministic JSON contains an unsupported value");
};
