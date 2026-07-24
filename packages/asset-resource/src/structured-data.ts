export type StructuredDataLimits = {
  depth: number;
  fields: number;
  stringBytes: number;
};

export type StructuredDataErrorCode =
  | "INVALID"
  | "DEPTH_EXCEEDED"
  | "FIELDS_EXCEEDED"
  | "STRING_BYTES_EXCEEDED";

export class StructuredDataError extends Error {
  readonly code: StructuredDataErrorCode;

  constructor(code: StructuredDataErrorCode) {
    super(`Structured data failed validation: ${code}`);
    this.name = "StructuredDataError";
    this.code = code;
  }
}

const encoder = new TextEncoder();

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
      if (encoder.encode(input).byteLength > limits.stringBytes) {
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
      return input.map((item) => normalize(item, depth + 1));
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

  return normalize(value, 1) as Record<string, unknown>;
};
