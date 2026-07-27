import type {
  ContentArtifactV1,
  AssetQueryRequestInput,
  AssetQueryResult,
  BuilderAssetFieldCatalog,
  ContentDatabaseStats,
} from "./schema";
import { serializeContentArtifact } from "./content-artifact";
import { AssetIndexRevisionError, executeAssetQuery } from "./structured-query";

export type AssetContentReader = (
  contentRef: string,
  range?: { offset: number; length: number }
) => Promise<{
  data: AsyncIterable<Uint8Array>;
  contentLength?: number;
}>;

export type ContentDatabase = {
  query(
    request: AssetQueryRequestInput,
    readContent?: AssetContentReader
  ): Promise<AssetQueryResult>;
  getFieldCatalog(): BuilderAssetFieldCatalog;
  getStats(): ContentDatabaseStats;
};

export const createContentDatabase = ({
  artifact,
  readContent,
}: {
  artifact: ContentArtifactV1;
  readContent?: AssetContentReader;
}): ContentDatabase => {
  const includedDocumentCount = artifact.documents.length;
  const sourceDocumentCount =
    artifact.database?.sourceDocumentCount ?? includedDocumentCount;
  const omittedDocumentCount = sourceDocumentCount - includedDocumentCount;
  const usedBytes = new TextEncoder().encode(
    serializeContentArtifact(artifact)
  ).byteLength;
  const stats: ContentDatabaseStats = {
    format: artifact.format,
    version: artifact.version,
    revision: artifact.integrity.checksum,
    usedBytes,
    maxBytes: artifact.database?.maxBytes ?? Number.MAX_SAFE_INTEGER,
    unboundedBytes: artifact.database?.unboundedBytes ?? usedBytes,
    includedDocumentCount,
    omittedDocumentCount,
    truncated: omittedDocumentCount > 0,
  };
  return {
    query: async (request, queryContentReader) => {
      if (
        request.indexRevision !== undefined &&
        request.indexRevision !== artifact.integrity.checksum
      ) {
        throw new AssetIndexRevisionError();
      }
      const readEmbeddedContent: AssetContentReader = async (
        contentRef,
        range
      ) => {
        const content = artifact.contents?.[contentRef];
        if (content === undefined) {
          const externalReader = queryContentReader ?? readContent;
          if (externalReader === undefined) {
            throw new Error("Content is not embedded in this database");
          }
          return await externalReader(contentRef, range);
        }
        const bytes = new TextEncoder().encode(content);
        const selected =
          range === undefined
            ? bytes
            : bytes.slice(range.offset, range.offset + range.length);
        return {
          data: (async function* () {
            yield selected;
          })(),
          contentLength: selected.byteLength,
        };
      };
      const result = await executeAssetQuery({
        query: request.query,
        catalog: artifact.fieldCatalog,
        documents: artifact.documents,
        read: readEmbeddedContent,
      });
      return { ...result, database: stats };
    },
    getFieldCatalog: () => artifact.fieldCatalog,
    getStats: () => stats,
  };
};
