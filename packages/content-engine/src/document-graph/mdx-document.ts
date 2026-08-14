import type { ByteSource } from "../byte-stream";
import type { MdxDocument } from "../mdx";
import { parseMdxDocument } from "../mdx";
import { contentEngineLimits } from "../limits";
import {
  analyzeMarkdownDocument,
  assembleMarkdownDocument,
  parseMarkdownDocumentSource,
  selectMarkdownDocumentRepresentation,
  type MarkdownDocument,
} from "./markdown-document";
import type { DocumentRepresentation } from "./reference";
import type { SourceReferenceOccurrence } from "./reference-codec";

export type MdxAdaptedDocument = MarkdownDocument &
  Readonly<{ authored: MdxDocument }>;

const toMarkdownDocument = ({
  source,
  body,
  frontmatter,
}: MdxAdaptedDocument): MarkdownDocument => ({ source, body, frontmatter });

const createMdxAdaptedDocument = ({
  markdown,
  authored,
}: {
  markdown: MarkdownDocument;
  authored: MdxDocument;
}): MdxAdaptedDocument =>
  Object.freeze({
    ...markdown,
    authored: Object.freeze({
      ...authored,
      frontmatter: Object.freeze({
        ...authored.frontmatter,
        properties: markdown.frontmatter,
      }),
    }),
  });

const parseAuthoredDocument = async (
  markdown: MarkdownDocument,
  maximumBytes: number
) =>
  createMdxAdaptedDocument({
    markdown,
    authored: await parseMdxDocument({ source: markdown.source, maximumBytes }),
  });

export const parseMdxDocumentSource = async ({
  source,
  maximumBytes = contentEngineLimits.hydratedFileBytes,
}: {
  source: ByteSource;
  maximumBytes?: number;
}) =>
  parseAuthoredDocument(
    await parseMarkdownDocumentSource({ source, maximumBytes }),
    maximumBytes
  );

export const analyzeMdxDocument = async ({
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
    document: MdxAdaptedDocument;
    references: readonly SourceReferenceOccurrence[];
  }>
> => {
  const analyzed = await analyzeMarkdownDocument({
    source,
    sourceDocumentId,
    documentUrl,
    maximumBytes,
  });
  return Object.freeze({
    document: await parseAuthoredDocument(analyzed.document, maximumBytes),
    references: analyzed.references,
  });
};

export const assembleMdxDocument = ({
  document,
  references,
  allowUnresolvedReferences,
}: {
  document: MdxAdaptedDocument;
  references: ReadonlyMap<string, unknown>;
  allowUnresolvedReferences?: boolean;
}) =>
  createMdxAdaptedDocument({
    markdown: assembleMarkdownDocument({
      document: toMarkdownDocument(document),
      references,
      allowUnresolvedReferences,
    }),
    authored: document.authored,
  });

export const selectMdxDocumentRepresentation = ({
  document,
  representation,
}: {
  document: MdxAdaptedDocument;
  representation: DocumentRepresentation;
}) =>
  selectMarkdownDocumentRepresentation({
    document: toMarkdownDocument(document),
    representation,
  });
