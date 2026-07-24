import {
  createAssetIndex,
  executeAssetQuery,
} from "@webstudio-is/asset-resource";
import { type AssetQueryRequestInput } from "@webstudio-is/sdk";
import type { AssetClient } from "./client";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import {
  loadAuthorizedBuilderCanonicalEntries,
  type BuilderCanonicalEntriesDependencies,
} from "./builder-canonical-entries";

export const previewAssetResourceQuery = async ({
  projectId,
  request,
  context,
  assetClient,
  dependencies = {},
}: {
  projectId: string;
  request: AssetQueryRequestInput;
  context: AppContext;
  assetClient: Pick<AssetClient, "readFile">;
  dependencies?: BuilderCanonicalEntriesDependencies;
}) => {
  const entries = await loadAuthorizedBuilderCanonicalEntries({
    projectId,
    context,
    assetClient,
    authorizationError:
      "You don't have access to preview this project's asset resources",
    dependencies,
  });
  const index = await createAssetIndex({
    projectId,
    entries,
  });
  return await executeAssetQuery({
    query: request.query,
    documents: index.documents,
    read: assetClient.readFile,
  });
};
