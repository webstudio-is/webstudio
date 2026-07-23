import {
  buildAssetResourceIndex,
  computeAssetResourceQueryHash,
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
  const index = await buildAssetResourceIndex({
    projectId,
    resourceId: "preview",
    query: request.query,
    entries,
  });
  return await executeAndHydrateAssetResourceQuery({
    request,
    documents: index.documents,
    queryHash: await computeAssetResourceQueryHash(request.query),
    indexRevision: `metadata:${index.integrity.checksum}`,
    assetRevision: index.assetRevision,
    read: assetClient.readFile,
  });
};
