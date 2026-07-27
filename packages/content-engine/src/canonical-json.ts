import canonicalize from "canonicalize";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

type HashSource = string | ArrayBuffer | ArrayBufferView<ArrayBuffer>;

const assertValidUnicode = (value: string) => {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const trailingCodeUnit = value.charCodeAt(index + 1);
      if (
        index + 1 >= value.length ||
        trailingCodeUnit < 0xdc00 ||
        trailingCodeUnit > 0xdfff
      ) {
        throw new Error("JSON strings cannot contain lone Unicode surrogates");
      }
      index += 1;
      continue;
    }
    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      throw new Error("JSON strings cannot contain lone Unicode surrogates");
    }
  }
};

const normalizeJsonValueInternal = (
  value: unknown,
  ancestors: Set<object>
): JsonValue => {
  if (value === null || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    assertValidUnicode(value);
    return value;
  }
  if (typeof value === "number") {
    if (Number.isFinite(value) === false) {
      throw new Error("JSON cannot contain non-finite numbers");
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new Error("JSON arrays cannot contain symbol properties");
    }
    if (ancestors.has(value)) {
      throw new Error("JSON cannot contain circular references");
    }
    ancestors.add(value);
    try {
      const result: JsonValue[] = [];
      for (let index = 0; index < value.length; index += 1) {
        if (Object.hasOwn(value, index) === false) {
          throw new Error("JSON arrays cannot be sparse");
        }
        const item = value[index];
        if (item === undefined) {
          throw new Error("JSON arrays cannot contain undefined values");
        }
        result.push(normalizeJsonValueInternal(item, ancestors));
      }
      if (Object.keys(value).length !== value.length) {
        throw new Error("JSON arrays cannot contain named properties");
      }
      return result;
    } finally {
      ancestors.delete(value);
    }
  }
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error("JSON can contain only plain objects");
    }
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new Error("JSON objects cannot contain symbol properties");
    }
    if (ancestors.has(value)) {
      throw new Error("JSON cannot contain circular references");
    }
    ancestors.add(value);
    const result: Record<string, JsonValue> = {};
    try {
      for (const [key, item] of Object.entries(value)) {
        assertValidUnicode(key);
        if (item !== undefined) {
          Object.defineProperty(result, key, {
            value: normalizeJsonValueInternal(item, ancestors),
            enumerable: true,
            configurable: true,
            writable: true,
          });
        }
      }
    } finally {
      ancestors.delete(value);
    }
    return result;
  }
  throw new Error("Value cannot be represented as JSON");
};

export const normalizeJsonValue = (value: unknown): JsonValue =>
  normalizeJsonValueInternal(value, new Set());

export const serializeJsonDeterministically = (value: unknown): string => {
  const result = canonicalize(normalizeJsonValue(value));
  if (result === undefined) {
    throw new Error("Value cannot be represented as canonical JSON");
  }
  return result;
};

export const compareStrings = (left: string, right: string) => {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
};

export const sha256Hex = async (value: HashSource) => {
  const source =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", source);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};

export const sha256 = async (value: HashSource) =>
  `sha256:${await sha256Hex(value)}` as const;
