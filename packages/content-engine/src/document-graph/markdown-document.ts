import { json, record, strictObject, string } from "zod";
import {
  ByteLimitExceededError,
  decodeUtf8,
  readBoundedBytes,
  stripUtf8ByteOrderMark,
  type ByteSource,
} from "../byte-stream";
import { normalizeJsonValue, type JsonValue } from "../canonical-json";
import { extractMarkdownFrontmatter } from "../frontmatter";
import { contentEngineLimits } from "../limits";
import { extractMarkdownBody } from "../markdown-body";
import type { DocumentRepresentation } from "./reference";
import type { SourceReferenceOccurrence } from "./reference-codec";
import {
  analyzeJsonDocument,
  assembleJsonDocument,
  JsonDocumentError,
} from "./json-document";

export type MarkdownDocument = Readonly<{
  source: string;
  body: string;
  frontmatter: { readonly [key: string]: JsonValue };
}>;

export type MarkdownDocumentErrorCode =
  | "CONTENT_LIMIT_EXCEEDED"
  | "CONTENT_DECODING_FAILED"
  | "INVALID_DOCUMENT"
  | "INVALID_REFERENCE_MARKER"
  | "INVALID_REFERENCE"
  | "REFERENCE_NOT_FOUND"
  | "INVALID_RESOLVED_VALUE"
  | "UNUSED_REFERENCE"
  | "UNSUPPORTED_REPRESENTATION";

export class MarkdownDocumentError extends Error {
  readonly code: MarkdownDocumentErrorCode;
  readonly referenceId?: string;

  constructor({
    code,
    message,
    referenceId,
    cause,
  }: {
    code: MarkdownDocumentErrorCode;
    message: string;
    referenceId?: string;
    cause?: unknown;
  }) {
    super(message, { cause });
    this.name = "MarkdownDocumentError";
    this.code = code;
    this.referenceId = referenceId;
  }
}

const markdownDocumentSchema = strictObject({
  source: string(),
  body: string(),
  frontmatter: record(string(), json()),
});

const normalizeMarkdownDocument = (input: unknown): MarkdownDocument => {
  let parsed;
  try {
    parsed = markdownDocumentSchema.parse(input);
  } catch (cause) {
    throw new MarkdownDocumentError({
      code: "INVALID_DOCUMENT",
      message: "Markdown document is invalid",
      cause,
    });
  }
  return Object.freeze({
    source: parsed.source,
    body: parsed.body,
    frontmatter: normalizeJsonValue(parsed.frontmatter) as {
      readonly [key: string]: JsonValue;
    },
  });
};

const markdownReferencePrefix = "#frontmatter";

const toMarkdownReferenceId = (jsonReferenceId: string) =>
  `${markdownReferencePrefix}${jsonReferenceId.slice(1)}`;

const toJsonReferenceId = (markdownReferenceId: string) => {
  if (
    markdownReferenceId !== markdownReferencePrefix &&
    markdownReferenceId.startsWith(`${markdownReferencePrefix}/`) === false
  ) {
    throw new MarkdownDocumentError({
      code: "UNUSED_REFERENCE",
      message: `Resolved Markdown reference ${markdownReferenceId} is outside frontmatter`,
      referenceId: markdownReferenceId,
    });
  }
  return `#${markdownReferenceId.slice(markdownReferencePrefix.length)}`;
};

const throwMarkdownJsonError = (error: JsonDocumentError): never => {
  const referenceId =
    error.referenceId === undefined
      ? undefined
      : toMarkdownReferenceId(error.referenceId);
  let code: MarkdownDocumentErrorCode = "INVALID_DOCUMENT";
  if (
    error.code === "INVALID_REFERENCE_MARKER" ||
    error.code === "INVALID_REFERENCE" ||
    error.code === "REFERENCE_NOT_FOUND" ||
    error.code === "INVALID_RESOLVED_VALUE" ||
    error.code === "UNUSED_REFERENCE"
  ) {
    code = error.code;
  }
  throw new MarkdownDocumentError({
    code,
    message: error.message,
    referenceId,
    cause: error,
  });
};

/** Reads one bounded Markdown source and discovers references in frontmatter. */
export const analyzeMarkdownDocument = async ({
  source,
  sourceDocumentId,
  documentUrl,
  maximumBytes = contentEngineLimits.hydratedFileBytes,
}: {
  source: ByteSource;
  sourceDocumentId: string;
  documentUrl: string | URL;
  maximumBytes?: number;
}): Promise<
  Readonly<{
    document: MarkdownDocument;
    references: readonly SourceReferenceOccurrence[];
  }>
> => {
  let bytes: Uint8Array;
  try {
    bytes = await readBoundedBytes(source, maximumBytes);
  } catch (cause) {
    if (cause instanceof ByteLimitExceededError) {
      throw new MarkdownDocumentError({
        code: "CONTENT_LIMIT_EXCEEDED",
        message: "Markdown document exceeds the byte limit",
        cause,
      });
    }
    throw cause;
  }
  let sourceText: string;
  try {
    sourceText = stripUtf8ByteOrderMark(decodeUtf8(bytes));
  } catch (cause) {
    throw new MarkdownDocumentError({
      code: "CONTENT_DECODING_FAILED",
      message: "Markdown document is not valid UTF-8",
      cause,
    });
  }
  const [body, frontmatter] = await Promise.all([
    extractMarkdownBody(bytes, maximumBytes),
    extractMarkdownFrontmatter(bytes),
  ]);
  let analyzedFrontmatter;
  try {
    analyzedFrontmatter = analyzeJsonDocument({
      value: frontmatter.properties,
      sourceDocumentId,
      documentUrl,
    });
  } catch (cause) {
    if (cause instanceof JsonDocumentError) {
      throwMarkdownJsonError(cause);
    }
    throw cause;
  }
  const document = normalizeMarkdownDocument({
    source: sourceText,
    body: body.body,
    frontmatter: analyzedFrontmatter.document,
  });
  return Object.freeze({
    document,
    references: Object.freeze(
      analyzedFrontmatter.references.map((occurrence) =>
        Object.freeze({
          ...occurrence,
          referenceId: toMarkdownReferenceId(occurrence.referenceId),
        })
      )
    ),
  });
};

/** Assembles frontmatter references while preserving the original source and body. */
export const assembleMarkdownDocument = ({
  document: input,
  references,
}: {
  document: unknown;
  references: ReadonlyMap<string, unknown>;
}): MarkdownDocument => {
  const document = normalizeMarkdownDocument(input);
  const jsonReferences = new Map<string, unknown>();
  for (const [referenceId, value] of references) {
    jsonReferences.set(toJsonReferenceId(referenceId), value);
  }
  let frontmatter: JsonValue;
  try {
    frontmatter = assembleJsonDocument({
      document: document.frontmatter,
      references: jsonReferences,
    });
  } catch (cause) {
    if (cause instanceof JsonDocumentError) {
      throwMarkdownJsonError(cause);
    }
    throw cause;
  }
  return normalizeMarkdownDocument({ ...document, frontmatter });
};

export const selectMarkdownDocumentRepresentation = ({
  document: input,
  representation,
}: {
  document: unknown;
  representation: DocumentRepresentation;
}): JsonValue => {
  const document = normalizeMarkdownDocument(input);
  if (representation.type === "document") {
    return document.source;
  }
  if (representation.type === "markdown-body") {
    return document.body;
  }
  if (representation.type === "markdown-frontmatter") {
    return document.frontmatter;
  }
  throw new MarkdownDocumentError({
    code: "UNSUPPORTED_REPRESENTATION",
    message: `Markdown documents do not support ${representation.type}`,
  });
};
