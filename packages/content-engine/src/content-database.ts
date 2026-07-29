import type {
  ContentArtifactV1,
  AssetQueryRequestInput,
  AssetQueryResult,
  BuilderAssetFieldCatalog,
  ContentDatabaseStats,
} from "./schema";
import { serializeContentArtifact } from "./content-artifact";
import {
  AssetIndexRevisionError,
  executeAssetQuery,
  type AssetRuntimeData,
} from "./structured-query";
import { encodeUtf8, getUtf8ByteLength } from "./byte-stream";
import type { AssetResourceContentReader } from "./hydration";

export type ContentDatabase = {
  query(
    request: AssetQueryRequestInput,
    readContent?: AssetResourceContentReader,
    runtimeAssets?: Readonly<Record<string, AssetRuntimeData>>
  ): Promise<AssetQueryResult>;
  getFieldCatalog(): BuilderAssetFieldCatalog;
  getStats(): ContentDatabaseStats;
};

export const createContentDatabase = ({
  artifact,
  readContent,
}: {
  artifact: ContentArtifactV1;
  readContent?: AssetResourceContentReader;
}): ContentDatabase => {
  const includedDocumentCount = artifact.documents.length;
  const sourceDocumentCount =
    artifact.database?.sourceDocumentCount ?? includedDocumentCount;
  const omittedDocumentCount = sourceDocumentCount - includedDocumentCount;
  const usedBytes = getUtf8ByteLength(serializeContentArtifact(artifact));
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
    query: async (request, queryContentReader, runtimeAssets) => {
      if (
        request.indexRevision !== undefined &&
        request.indexRevision !== artifact.integrity.checksum
      ) {
        throw new AssetIndexRevisionError();
      }
      const readEmbeddedContent: AssetResourceContentReader = async (
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
        const bytes = encodeUtf8(content);
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
        runtimeAssets,
        assetReferences: artifact.assetReferences,
      });
      return result;
    },
    getFieldCatalog: () => artifact.fieldCatalog,
    getStats: () => stats,
  };
};
