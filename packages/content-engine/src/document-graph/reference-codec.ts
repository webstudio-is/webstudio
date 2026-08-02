import {
  append as appendJsonPointerSegment,
  nil as emptyJsonPointer,
  pointerSegments,
} from "@hyperjump/json-pointer";
import {
  createDocumentRepresentation,
  type DocumentRepresentation,
} from "./reference";

export type SourceDocumentReference = Readonly<{
  documentUrl: string;
  representation: DocumentRepresentation;
}>;

export type SourceReferenceOccurrence = Readonly<{
  sourceDocumentId: string;
  referenceId: string;
  reference: SourceDocumentReference;
}>;

export type DocumentReferenceSyntaxErrorCode =
  | "INVALID_BASE_URL"
  | "INVALID_REFERENCE_URL"
  | "INVALID_DOCUMENT_URL"
  | "INVALID_FRAGMENT_ENCODING"
  | "INVALID_FRAGMENT"
  | "INVALID_JSON_POINTER"
  | "INVALID_REPRESENTATION";

export class DocumentReferenceSyntaxError extends Error {
  readonly code: DocumentReferenceSyntaxErrorCode;
  readonly value: unknown;

  constructor({
    code,
    message,
    value,
    cause,
  }: {
    code: DocumentReferenceSyntaxErrorCode;
    message: string;
    value: unknown;
    cause?: unknown;
  }) {
    super(message, { cause });
    this.name = "DocumentReferenceSyntaxError";
    this.code = code;
    this.value = value;
  }
}

const parseAbsoluteUrl = ({
  value,
  code,
  label,
}: {
  value: unknown;
  code: "INVALID_BASE_URL" | "INVALID_DOCUMENT_URL";
  label: string;
}) => {
  if (typeof value !== "string" && value instanceof URL === false) {
    throw new DocumentReferenceSyntaxError({
      code,
      message: `${label} must be an absolute URL`,
      value,
    });
  }
  try {
    return new URL(value);
  } catch (cause) {
    throw new DocumentReferenceSyntaxError({
      code,
      message: `${label} must be an absolute URL`,
      value,
      cause,
    });
  }
};

const getRepresentation = (encodedFragment: string): DocumentRepresentation => {
  if (encodedFragment === "") {
    return createDocumentRepresentation({ type: "document" });
  }
  let fragment: string;
  try {
    fragment = decodeURIComponent(encodedFragment);
  } catch (cause) {
    throw new DocumentReferenceSyntaxError({
      code: "INVALID_FRAGMENT_ENCODING",
      message: "Document reference fragment is not valid URI encoding",
      value: encodedFragment,
      cause,
    });
  }
  if (fragment === "body") {
    return createDocumentRepresentation({ type: "markdown-body" });
  }
  if (fragment === "frontmatter") {
    return createDocumentRepresentation({ type: "markdown-frontmatter" });
  }
  if (fragment.startsWith("/") === false) {
    throw new DocumentReferenceSyntaxError({
      code: "INVALID_FRAGMENT",
      message:
        "Document reference fragment must be a JSON Pointer, body, or frontmatter",
      value: fragment,
    });
  }
  try {
    return createDocumentRepresentation({
      type: "json",
      path: [...pointerSegments(fragment)],
    });
  } catch (cause) {
    throw new DocumentReferenceSyntaxError({
      code: "INVALID_JSON_POINTER",
      message: "Document reference fragment is not a valid JSON Pointer",
      value: fragment,
      cause,
    });
  }
};

/** Parses and resolves one authored URI reference without performing I/O. */
export const parseSourceDocumentReference = ({
  value,
  baseUrl,
}: {
  value: unknown;
  baseUrl: string | URL;
}): SourceDocumentReference => {
  const base = parseAbsoluteUrl({
    value: baseUrl,
    code: "INVALID_BASE_URL",
    label: "Document reference base",
  });
  base.hash = "";
  if (typeof value !== "string") {
    throw new DocumentReferenceSyntaxError({
      code: "INVALID_REFERENCE_URL",
      message: "Document reference must be a string URI reference",
      value,
    });
  }
  let resolved: URL;
  try {
    resolved = new URL(value, base);
  } catch (cause) {
    throw new DocumentReferenceSyntaxError({
      code: "INVALID_REFERENCE_URL",
      message: "Document reference is not a valid URI reference",
      value,
      cause,
    });
  }
  const representation = getRepresentation(resolved.hash.slice(1));
  resolved.hash = "";
  return Object.freeze({
    documentUrl: resolved.href,
    representation,
  });
};

const serializeRepresentation = (representation: DocumentRepresentation) => {
  if (representation.type === "document") {
    return "";
  }
  if (representation.type === "markdown-body") {
    return "body";
  }
  if (representation.type === "markdown-frontmatter") {
    return "frontmatter";
  }
  let pointer: string = emptyJsonPointer;
  for (const segment of representation.path) {
    pointer = appendJsonPointerSegment(segment, pointer);
  }
  return encodeURIComponent(pointer);
};

/** Serializes a normalized source reference to one canonical absolute URI. */
export const serializeSourceDocumentReference = (
  input: SourceDocumentReference
) => {
  const documentUrl = parseAbsoluteUrl({
    value: input.documentUrl,
    code: "INVALID_DOCUMENT_URL",
    label: "Referenced document",
  });
  if (documentUrl.hash !== "") {
    throw new DocumentReferenceSyntaxError({
      code: "INVALID_DOCUMENT_URL",
      message: "Referenced document URL must not contain a fragment",
      value: input.documentUrl,
    });
  }
  let representation: DocumentRepresentation;
  try {
    representation = createDocumentRepresentation(input.representation);
  } catch (cause) {
    throw new DocumentReferenceSyntaxError({
      code: "INVALID_REPRESENTATION",
      message: "Document reference representation is invalid",
      value: input.representation,
      cause,
    });
  }
  const fragment = serializeRepresentation(representation);
  if (fragment !== "") {
    documentUrl.hash = fragment;
  }
  return documentUrl.href;
};
