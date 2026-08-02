import type { JsonValue } from "../canonical-json";

export const isJsonObject = (
  value: JsonValue
): value is { readonly [key: string]: JsonValue } =>
  typeof value === "object" && value !== null && Array.isArray(value) === false;

/** Returns the value from an exact JSON `{ $ref }` marker. */
export const getJsonReferenceMarkerValue = (
  value: JsonValue
): JsonValue | undefined => {
  if (isJsonObject(value) === false) {
    return;
  }
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== "$ref") {
    return;
  }
  return value.$ref;
};
