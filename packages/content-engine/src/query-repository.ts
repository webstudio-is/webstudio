import type {
  ContentArtifactV1,
  AssetQueryRequestInput,
  AssetQueryResult,
} from "./schema";
import {
  createContentDatabase,
  type AssetContentReader,
} from "./content-database";

export type { AssetContentReader } from "./content-database";

/**
 * Storage-neutral query boundary shared by hosted PostgreSQL metadata and
 * database-free filesystem or object-storage publications.
 */
export const createAssetQueryRepository = ({
  loadIndex,
  readContent,
}: {
  loadIndex: () => Promise<ContentArtifactV1>;
  readContent?: AssetContentReader;
}) => ({
  query: async (request: AssetQueryRequestInput): Promise<AssetQueryResult> => {
    const index = await loadIndex();
    return await createContentDatabase({
      artifact: index,
      readContent,
    }).query(request);
  },
});
