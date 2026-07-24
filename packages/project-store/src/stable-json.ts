import type { JsonValue } from "./types";

export const compareStrings = (left: string, right: string) => {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
};

/**
 * Converts validated application data to the portable JSON value model.
 * Optional object properties are omitted deliberately; unlike JSON.stringify,
 * every other non-JSON value is rejected instead of being changed silently.
 */
export const normalizeJsonValue = (value: unknown): JsonValue => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (Number.isFinite(value) === false) {
      throw new Error("JSON cannot contain non-finite numbers");
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item === undefined) {
        throw new Error("JSON arrays cannot contain undefined values");
      }
      return normalizeJsonValue(item);
    });
  }
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error("JSON can contain only plain objects");
    }
    const result: Record<string, JsonValue> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) {
        result[key] = normalizeJsonValue(item);
      }
    }
    return result;
  }
  throw new Error("Value cannot be represented as JSON");
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
