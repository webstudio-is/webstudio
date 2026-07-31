import { append as appendJsonPointerSegment } from "@hyperjump/json-pointer";
import { normalizeJsonValue, type JsonValue } from "../canonical-json";
import type { DocumentRepresentation } from "./reference";
import {
  DocumentReferenceSyntaxError,
  parseSourceDocumentReference,
  type SourceReferenceOccurrence,
} from "./reference-codec";

export type JsonDocumentErrorCode =
  | "INVALID_REFERENCE_MARKER"
  | "INVALID_REFERENCE"
  | "JSON_PATH_NOT_FOUND"
  | "UNSUPPORTED_REPRESENTATION"
  | "REFERENCE_NOT_FOUND"
  | "INVALID_RESOLVED_VALUE"
  | "UNUSED_REFERENCE";

export class JsonDocumentError extends Error {
  readonly code: JsonDocumentErrorCode;
  readonly referenceId?: string;

  constructor({
    code,
    message,
    referenceId,
    cause,
  }: {
    code: JsonDocumentErrorCode;
    message: string;
    referenceId?: string;
    cause?: unknown;
  }) {
    super(message, { cause });
    this.name = "JsonDocumentError";
    this.code = code;
    this.referenceId = referenceId;
  }
}

const isJsonObject = (
  value: JsonValue
): value is { readonly [key: string]: JsonValue } =>
  typeof value === "object" && value !== null && Array.isArray(value) === false;

const getReferenceMarker = (
  value: JsonValue,
  referenceId: string
): string | undefined => {
  if (isJsonObject(value) === false) {
    return;
  }
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== "$ref") {
    return;
  }
  const reference = value.$ref;
  if (typeof reference !== "string") {
    throw new JsonDocumentError({
      code: "INVALID_REFERENCE_MARKER",
      message: `JSON reference marker ${referenceId} must contain a string $ref`,
      referenceId,
    });
  }
  return reference;
};

const getReferenceId = (pointer: string) => `#${pointer}`;

/** Normalizes one parsed JSON value and discovers exact { $ref } markers. */
export const analyzeJsonDocument = ({
  value,
  sourceDocumentId,
  documentUrl,
}: {
  value: unknown;
  sourceDocumentId: string;
  documentUrl: string | URL;
}): Readonly<{
  document: JsonValue;
  references: readonly SourceReferenceOccurrence[];
}> => {
  const document = normalizeJsonValue(value);
  const references: SourceReferenceOccurrence[] = [];
  const visit = (current: JsonValue, pointer: string) => {
    const referenceId = getReferenceId(pointer);
    const marker = getReferenceMarker(current, referenceId);
    if (marker !== undefined) {
      try {
        references.push(
          Object.freeze({
            sourceDocumentId,
            referenceId,
            reference: parseSourceDocumentReference({
              value: marker,
              baseUrl: documentUrl,
            }),
          })
        );
      } catch (cause) {
        if (cause instanceof DocumentReferenceSyntaxError) {
          throw new JsonDocumentError({
            code: "INVALID_REFERENCE",
            message: `JSON reference marker ${referenceId} is invalid`,
            referenceId,
            cause,
          });
        }
        throw cause;
      }
      return;
    }
    if (Array.isArray(current)) {
      for (const [index, item] of current.entries()) {
        visit(item, appendJsonPointerSegment(String(index), pointer));
      }
      return;
    }
    if (isJsonObject(current)) {
      for (const key of Object.keys(current).sort()) {
        visit(current[key], appendJsonPointerSegment(key, pointer));
      }
    }
  };
  visit(document, "");
  return Object.freeze({
    document,
    references: Object.freeze(references),
  });
};

const getJsonPathValue = (
  document: JsonValue,
  path: readonly string[]
): JsonValue | undefined => {
  let value: JsonValue = document;
  for (const segment of path) {
    if (Array.isArray(value)) {
      const index = Number(segment);
      if (
        Number.isSafeInteger(index) === false ||
        index < 0 ||
        String(index) !== segment ||
        index >= value.length
      ) {
        return;
      }
      value = value[index];
      continue;
    }
    if (isJsonObject(value) && Object.hasOwn(value, segment)) {
      value = value[segment];
      continue;
    }
    return;
  }
  return value;
};

export const selectJsonDocumentRepresentation = ({
  document: input,
  representation,
}: {
  document: unknown;
  representation: DocumentRepresentation;
}): JsonValue => {
  const document = normalizeJsonValue(input);
  if (representation.type === "document") {
    return document;
  }
  if (representation.type !== "json") {
    throw new JsonDocumentError({
      code: "UNSUPPORTED_REPRESENTATION",
      message: `JSON documents do not support ${representation.type}`,
    });
  }
  const value = getJsonPathValue(document, representation.path);
  if (value === undefined) {
    throw new JsonDocumentError({
      code: "JSON_PATH_NOT_FOUND",
      message: "JSON document path does not exist",
    });
  }
  return value;
};

const defineJsonProperty = (
  target: Record<string, JsonValue>,
  key: string,
  value: JsonValue
) => {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  });
};

/** Replaces exact reference markers without mutating the parsed source value. */
export const assembleJsonDocument = ({
  document: input,
  references,
}: {
  document: unknown;
  references: ReadonlyMap<string, unknown>;
}): JsonValue => {
  const document = normalizeJsonValue(input);
  const usedReferences = new Set<string>();
  const assemble = (current: JsonValue, pointer: string): JsonValue => {
    const referenceId = getReferenceId(pointer);
    const marker = getReferenceMarker(current, referenceId);
    if (marker !== undefined) {
      if (references.has(referenceId) === false) {
        throw new JsonDocumentError({
          code: "REFERENCE_NOT_FOUND",
          message: `Resolved JSON reference ${referenceId} is unavailable`,
          referenceId,
        });
      }
      usedReferences.add(referenceId);
      try {
        return normalizeJsonValue(references.get(referenceId));
      } catch (cause) {
        throw new JsonDocumentError({
          code: "INVALID_RESOLVED_VALUE",
          message: `Resolved JSON reference ${referenceId} is not JSON-compatible`,
          referenceId,
          cause,
        });
      }
    }
    if (Array.isArray(current)) {
      return current.map((item, index) =>
        assemble(item, appendJsonPointerSegment(String(index), pointer))
      );
    }
    if (isJsonObject(current)) {
      const result: Record<string, JsonValue> = {};
      for (const [key, value] of Object.entries(current)) {
        defineJsonProperty(
          result,
          key,
          assemble(value, appendJsonPointerSegment(key, pointer))
        );
      }
      return result;
    }
    return current;
  };
  const result = assemble(document, "");
  for (const referenceId of [...references.keys()].sort()) {
    if (usedReferences.has(referenceId) === false) {
      throw new JsonDocumentError({
        code: "UNUSED_REFERENCE",
        message: `Resolved JSON reference ${referenceId} has no marker`,
        referenceId,
      });
    }
  }
  return result;
};
