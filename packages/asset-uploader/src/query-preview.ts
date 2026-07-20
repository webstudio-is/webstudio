import {
  computeAssetResourceQueryHash,
  computeCanonicalAssetRevision,
  executeAndHydrateAssetResourceQuery,
} from "@webstudio-is/asset-resource";
import type { AssetResourceQueryRequest } from "@webstudio-is/sdk";
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
  request: AssetResourceQueryRequest;
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
  const assetRevision = await computeCanonicalAssetRevision(entries);
  return await executeAndHydrateAssetResourceQuery({
    request,
    documents: entries.map(({ document }) => document),
    queryHash: await computeAssetResourceQueryHash(request.query),
    indexRevision: `metadata:${assetRevision}`,
    assetRevision,
    read: assetClient.readFile,
  });
};
