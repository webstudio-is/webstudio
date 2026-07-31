import type { JsonValue } from "../canonical-json";

export const isJsonObject = (
  value: JsonValue
): value is { readonly [key: string]: JsonValue } =>
  typeof value === "object" && value !== null && Array.isArray(value) === false;
