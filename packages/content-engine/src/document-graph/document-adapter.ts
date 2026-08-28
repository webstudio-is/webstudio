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
import type { DocumentFormat } from "./document-format";
import {
  resolveAssetValueReferences,
  type AssetRuntimeData,
  type AssetValueReference,
} from "../asset-value-references";

export type AdaptedDocument =
  | Readonly<{ format: "json"; value: JsonValue }>
  | Readonly<{
      format: "markdown" | "mdx";
      value: MarkdownDocument;
    }>;

export type AnalyzedDocument =
  | Readonly<{
      format: "json";
      value: JsonValue;
      references: readonly SourceReferenceOccurrence[];
    }>
  | Readonly<{
      format: "markdown" | "mdx";
      value: MarkdownDocument;
      references: readonly SourceReferenceOccurrence[];
    }>;

export const getAdaptedDocumentProperties = (document: AdaptedDocument) => {
  const value =
    document.format === "json" ? document.value : document.value.frontmatter;
  return isJsonObject(value) ? value : undefined;
};

/** Resolves local Asset references without changing the document format. */
export const resolveAdaptedDocumentAssetReferences = ({
  document,
  references,
  runtimeAssets,
}: {
  document: AdaptedDocument;
  references?: readonly AssetValueReference[];
  runtimeAssets?: Readonly<Record<string, AssetRuntimeData>>;
}): AdaptedDocument => {
  const properties = getAdaptedDocumentProperties(document);
  if (properties === undefined || references === undefined) {
    return document;
  }
  const resolved = resolveAssetValueReferences({
    value: { properties },
    references,
    runtimeAssets,
  }).properties;
  if (document.format === "json") {
    return Object.freeze({ ...document, value: resolved });
  }
  return Object.freeze({
    ...document,
    value: Object.freeze({ ...document.value, frontmatter: resolved }),
  });
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
  allowUnresolvedReferences,
}: {
  document: AdaptedDocument;
  references: ReadonlyMap<string, unknown>;
  allowUnresolvedReferences?: boolean;
}): AdaptedDocument => {
  if (document.format === "json") {
    return freezeDocument({
      format: document.format,
      value: assembleJsonDocument({
        document: document.value,
        references,
        allowUnresolvedReferences,
      }),
    });
  }
  return freezeDocument({
    format: document.format,
    value: assembleMarkdownDocument({
      document: document.value,
      references,
      allowUnresolvedReferences,
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
