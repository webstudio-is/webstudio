import { contentEngineLimits } from "./limits";
import {
  ByteLimitExceededError,
  decodeUtf8,
  readBoundedBytes,
  stripUtf8ByteOrderMark,
  type ByteSource,
} from "./byte-stream";
import {
  normalizeStructuredDataObject,
  StructuredDataError,
  type StructuredDataLimits,
} from "./structured-data";

export type JsonMetadataErrorCode =
  | "JSON_BYTES_EXCEEDED"
  | "JSON_DECODING_FAILED"
  | "JSON_INVALID"
  | "JSON_DEPTH_EXCEEDED"
  | "JSON_FIELDS_EXCEEDED"
  | "JSON_STRING_BYTES_EXCEEDED";

export class JsonMetadataError extends Error {
  readonly code: JsonMetadataErrorCode;

  constructor(code: JsonMetadataErrorCode, message: string) {
    super(message);
    this.name = "JsonMetadataError";
    this.code = code;
  }
}

type JsonMetadataLimits = StructuredDataLimits & { bytes: number };

const defaultLimits: JsonMetadataLimits = {
  bytes: contentEngineLimits.jsonBytes,
  depth: contentEngineLimits.jsonDepth,
  fields: contentEngineLimits.jsonFields,
  stringBytes: contentEngineLimits.jsonStringBytes,
  serializedBytes: contentEngineLimits.indexedPropertiesBytes,
};

const structuredError = (error: StructuredDataError): JsonMetadataError => {
  if (error.code === "DEPTH_EXCEEDED") {
    return new JsonMetadataError(
      "JSON_DEPTH_EXCEEDED",
      "JSON metadata exceeds the nesting limit"
    );
  }
  if (error.code === "FIELDS_EXCEEDED") {
    return new JsonMetadataError(
      "JSON_FIELDS_EXCEEDED",
      "JSON metadata exceeds the field limit"
    );
  }
  if (error.code === "STRING_BYTES_EXCEEDED") {
    return new JsonMetadataError(
      "JSON_STRING_BYTES_EXCEEDED",
      "JSON metadata contains a string that exceeds the byte limit"
    );
  }
  if (error.code === "SERIALIZED_BYTES_EXCEEDED") {
    return new JsonMetadataError(
      "JSON_BYTES_EXCEEDED",
      "JSON properties exceed the indexed byte limit"
    );
  }
  return new JsonMetadataError(
    "JSON_INVALID",
    "JSON metadata must contain a JSON object"
  );
};

/** Reads one bounded JSON file and exposes its root object as query fields. */
export const extractJsonProperties = async (
  source: ByteSource,
  overrides: Partial<JsonMetadataLimits> = {}
) => {
  const limits = { ...defaultLimits, ...overrides };
  let bytes: Uint8Array;
  try {
    bytes = await readBoundedBytes(source, limits.bytes);
  } catch (error) {
    if (error instanceof ByteLimitExceededError) {
      throw new JsonMetadataError(
        "JSON_BYTES_EXCEEDED",
        "JSON metadata exceeds the byte limit"
      );
    }
    throw error;
  }

  let value: unknown;
  try {
    value = JSON.parse(stripUtf8ByteOrderMark(decodeUtf8(bytes)));
  } catch (error) {
    if (error instanceof TypeError) {
      throw new JsonMetadataError(
        "JSON_DECODING_FAILED",
        "JSON metadata is not valid UTF-8"
      );
    }
    throw new JsonMetadataError("JSON_INVALID", "JSON metadata is invalid");
  }

  try {
    return {
      properties: normalizeStructuredDataObject(value, limits),
      sourceBytes: bytes.byteLength,
    };
  } catch (error) {
    if (error instanceof StructuredDataError) {
      throw structuredError(error);
    }
    throw error;
  }
};
