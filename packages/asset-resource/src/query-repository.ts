import type {
  AssetIndexV1,
  AssetQueryRequestInput,
  AssetQueryResult,
} from "@webstudio-is/sdk";
import { AssetIndexRevisionError, executeAssetQuery } from "./structured-query";

export type AssetContentReader = (
  contentRef: string,
  range?: { offset: number; length: number }
) => Promise<{
  data: AsyncIterable<Uint8Array>;
  contentLength?: number;
}>;

/**
 * Storage-neutral query boundary shared by hosted PostgreSQL metadata and
 * database-free filesystem or object-storage publications.
 */
export const createAssetQueryRepository = ({
  loadIndex,
  readContent,
}: {
  loadIndex: () => Promise<AssetIndexV1>;
  readContent: AssetContentReader;
}) => ({
  query: async (request: AssetQueryRequestInput): Promise<AssetQueryResult> => {
    const index = await loadIndex();
    if (
      request.indexRevision !== undefined &&
      request.indexRevision !== index.integrity.checksum
    ) {
      throw new AssetIndexRevisionError();
    }
    return await executeAssetQuery({
      query: request.query,
      catalog: index.fieldCatalog,
      documents: index.documents,
      read: readContent,
    });
  },
});
