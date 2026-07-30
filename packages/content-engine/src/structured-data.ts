import { getUtf8ByteLength } from "./byte-stream";

export type StructuredDataLimits = {
  depth: number;
  fields: number;
  stringBytes: number;
  serializedBytes: number;
};

export type StructuredDataErrorCode =
  | "INVALID"
  | "DEPTH_EXCEEDED"
  | "FIELDS_EXCEEDED"
  | "STRING_BYTES_EXCEEDED"
  | "SERIALIZED_BYTES_EXCEEDED";

export class StructuredDataError extends Error {
  readonly code: StructuredDataErrorCode;

  constructor(code: StructuredDataErrorCode) {
    super(`Structured data failed validation: ${code}`);
    this.name = "StructuredDataError";
    this.code = code;
  }
}

export const getStructuredDataByteLength = (value: unknown) =>
  getUtf8ByteLength(JSON.stringify(value));

const isPlainObject = (
  value: unknown
): value is Readonly<Record<string, unknown>> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

export const normalizeStructuredDataObject = (
  value: unknown,
  limits: StructuredDataLimits
): Record<string, unknown> => {
  if (isPlainObject(value) === false) {
    throw new StructuredDataError("INVALID");
  }

  let fields = 0;
  const normalize = (input: unknown, depth: number): unknown => {
    if (depth > limits.depth) {
      throw new StructuredDataError("DEPTH_EXCEEDED");
    }
    if (typeof input === "string") {
      if (getUtf8ByteLength(input) > limits.stringBytes) {
        throw new StructuredDataError("STRING_BYTES_EXCEEDED");
      }
      return input;
    }
    if (
      input === null ||
      typeof input === "boolean" ||
      (typeof input === "number" &&
        Number.isFinite(input) &&
        (Number.isInteger(input) === false || Number.isSafeInteger(input)))
    ) {
      return input;
    }
    if (Array.isArray(input)) {
      return input.map((item) => {
        fields += 1;
        if (fields > limits.fields) {
          throw new StructuredDataError("FIELDS_EXCEEDED");
        }
        return normalize(item, depth + 1);
      });
    }
    if (isPlainObject(input)) {
      const result: Record<string, unknown> = Object.create(null);
      for (const [key, child] of Object.entries(input)) {
        fields += 1;
        if (fields > limits.fields) {
          throw new StructuredDataError("FIELDS_EXCEEDED");
        }
        result[key] = normalize(child, depth + 1);
      }
      return result;
    }
    throw new StructuredDataError("INVALID");
  };

  const normalized = normalize(value, 1) as Record<string, unknown>;
  if (getStructuredDataByteLength(normalized) > limits.serializedBytes) {
    throw new StructuredDataError("SERIALIZED_BYTES_EXCEEDED");
  }
  return normalized;
};
