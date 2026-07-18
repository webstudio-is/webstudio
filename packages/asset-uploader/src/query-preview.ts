import {
  computeAssetResourceQueryHash,
  computeCanonicalAssetRevision,
  executeAssetResourceQuery,
  hydrateAssetResourceResult,
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
  const response = await executeAssetResourceQuery({
    request,
    documents: entries.map(({ document }) => document),
    queryHash: await computeAssetResourceQueryHash(request.query),
    indexRevision: `metadata:${assetRevision}`,
    assetRevision,
  });
  if (request.content.mode === "none") {
    return response;
  }
  if (assetClient === undefined) {
    throw new Error("Asset client is required for content hydration");
  }
  const hydration = await hydrateAssetResourceResult({
    result: response.result,
    documents: entries.map(({ document }) => document),
    options: request.content,
    read: assetClient.readFile,
    allowProtected: true,
  });
  return {
    ...response,
    content: hydration.content,
    meta: {
      ...response.meta,
      hydratedFileCount: hydration.hydratedFileCount,
      hydratedBytes: hydration.hydratedBytes,
    },
  };
};
