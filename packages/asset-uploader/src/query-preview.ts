import {
  computeAssetResourceQueryHash,
  computeCanonicalAssetRevision,
  executeAndHydrateAssetResourceQuery,
} from "@webstudio-is/asset-resource";
import type { AssetResourceQueryRequest } from "@webstudio-is/sdk";
import type { AssetClient } from "./client";
import {
  authorizeProject,
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { loadCanonicalAssetFileEntries } from "./canonical-metadata-persistence";

export const previewAssetResourceQuery = async ({
  projectId,
  request,
  context,
  assetClient,
}: {
  projectId: string;
  request: AssetResourceQueryRequest;
  context: AppContext;
  assetClient?: Pick<AssetClient, "readFile">;
}) => {
  const canView = await authorizeProject.hasProjectPermit(
    { projectId, permit: "view" },
    context
  );
  if (canView === false) {
    throw new AuthorizationError(
      "You don't have access to preview this project's asset resources"
    );
  }
  const entries = await loadCanonicalAssetFileEntries({
    client: context.postgrest.client,
    projectId,
  });
  const assetRevision = await computeCanonicalAssetRevision(entries);
  return await executeAndHydrateAssetResourceQuery({
    request,
    documents: entries.map(({ document }) => document),
    queryHash: await computeAssetResourceQueryHash(request.query),
    indexRevision: `metadata:${assetRevision}`,
    assetRevision,
    read: assetClient?.readFile,
  });
};
