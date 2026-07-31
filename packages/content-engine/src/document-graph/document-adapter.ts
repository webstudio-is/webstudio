import type { ByteSource } from "../byte-stream";
import type { JsonValue } from "../canonical-json";
import { contentEngineLimits } from "../limits";
import {
  analyzeJsonDocumentSource,
  assembleJsonDocument,
  parseJsonDocumentSource,
  selectJsonDocumentRepresentation,
} from "./json-document";
import {
  analyzeMarkdownDocument,
  assembleMarkdownDocument,
  parseMarkdownDocumentSource,
  selectMarkdownDocumentRepresentation,
  type MarkdownDocument,
} from "./markdown-document";
import type { DocumentRepresentation } from "./reference";
import type { SourceReferenceOccurrence } from "./reference-codec";
import { isJsonObject } from "./document-utils";

export type DocumentFormat = "json" | "markdown";

export type AdaptedDocument =
  | Readonly<{ format: "json"; value: JsonValue }>
  | Readonly<{ format: "markdown"; value: MarkdownDocument }>;

export type AnalyzedDocument =
  | Readonly<{
      format: "json";
      value: JsonValue;
      references: readonly SourceReferenceOccurrence[];
    }>
  | Readonly<{
      format: "markdown";
      value: MarkdownDocument;
      references: readonly SourceReferenceOccurrence[];
    }>;

export const getAdaptedDocumentProperties = (document: AdaptedDocument) => {
  const value =
    document.format === "markdown"
      ? document.value.frontmatter
      : document.value;
  return isJsonObject(value) ? value : undefined;
};

const freezeDocument = <Document extends AdaptedDocument | AnalyzedDocument>(
  document: Document
) => Object.freeze(document);

/** Parses a bounded source without resolving its reference syntax. */
export const parseDocumentSource = async ({
  format,
  source,
  maximumBytes = contentEngineLimits.hydratedFileBytes,
}: {
  format: DocumentFormat;
  source: ByteSource;
  maximumBytes?: number;
}): Promise<AdaptedDocument> => {
  if (format === "json") {
    return freezeDocument({
      format,
      value: await parseJsonDocumentSource({ source, maximumBytes }),
    });
  }
  return freezeDocument({
    format,
    value: await parseMarkdownDocumentSource({ source, maximumBytes }),
  });
};

/** Parses a bounded source through its format-specific adapter. */
export const analyzeDocumentSource = async ({
  format,
  source,
  sourceDocumentId,
  documentUrl,
  maximumBytes = contentEngineLimits.hydratedFileBytes,
}: {
  format: DocumentFormat;
  source: ByteSource;
  sourceDocumentId: string;
  documentUrl: string | URL;
  maximumBytes?: number;
}): Promise<AnalyzedDocument> => {
  if (format === "json") {
    const analyzed = await analyzeJsonDocumentSource({
      source,
      sourceDocumentId,
      documentUrl,
      maximumBytes,
    });
    return freezeDocument({
      format,
      value: analyzed.document,
      references: analyzed.references,
    });
  }
  const analyzed = await analyzeMarkdownDocument({
    source,
    sourceDocumentId,
    documentUrl,
    maximumBytes,
  });
  return freezeDocument({
    format,
    value: analyzed.document,
    references: analyzed.references,
  });
};

export const assembleDocument = ({
  document,
  references,
}: {
  document: AdaptedDocument;
  references: ReadonlyMap<string, unknown>;
}): AdaptedDocument => {
  if (document.format === "json") {
    return freezeDocument({
      format: document.format,
      value: assembleJsonDocument({
        document: document.value,
        references,
      }),
    });
  }
  return freezeDocument({
    format: document.format,
    value: assembleMarkdownDocument({
      document: document.value,
      references,
    }),
  });
};

export const selectDocumentRepresentation = ({
  document,
  representation,
}: {
  document: AdaptedDocument;
  representation: DocumentRepresentation;
}): JsonValue => {
  if (document.format === "json") {
    return selectJsonDocumentRepresentation({
      document: document.value,
      representation,
    });
  }
  return selectMarkdownDocumentRepresentation({
    document: document.value,
    representation,
  });
};
