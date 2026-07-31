import type { ByteSource } from "../byte-stream";
import type { JsonValue } from "../canonical-json";
import { contentEngineLimits } from "../limits";
import {
  analyzeJsonDocumentSource,
  assembleJsonDocument,
  selectJsonDocumentRepresentation,
} from "./json-document";
import {
  analyzeMarkdownDocument,
  assembleMarkdownDocument,
  selectMarkdownDocumentRepresentation,
  type MarkdownDocument,
} from "./markdown-document";
import type { DocumentRepresentation } from "./reference";
import type { SourceReferenceOccurrence } from "./reference-codec";

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

const createAdaptedDocument = <Document extends AdaptedDocument>(
  document: Document
) => Object.freeze(document);

const createAnalyzedDocument = <Document extends AnalyzedDocument>(
  document: Document
) => Object.freeze(document);

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
    return createAnalyzedDocument({
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
  return createAnalyzedDocument({
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
    return createAdaptedDocument({
      format: document.format,
      value: assembleJsonDocument({
        document: document.value,
        references,
      }),
    });
  }
  return createAdaptedDocument({
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
