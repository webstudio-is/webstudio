import {
  authorizeProject,
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import type { AssetClient } from "./client";
import { synchronizeCanonicalAssets } from "./canonical-metadata-backfill";
import { loadCanonicalAssetFileEntries } from "./canonical-metadata-persistence";

export type BuilderCanonicalEntriesDependencies = {
  hasProjectPermit?: typeof authorizeProject.hasProjectPermit;
  synchronizeCanonicalAssets?: typeof synchronizeCanonicalAssets;
  loadCanonicalAssetFileEntries?: typeof loadCanonicalAssetFileEntries;
};

export const loadAuthorizedBuilderCanonicalEntries = async ({
  projectId,
  context,
  assetClient,
  authorizationError,
  dependencies = {},
}: {
  projectId: string;
  context: AppContext;
  assetClient: Pick<AssetClient, "readFile">;
  authorizationError: string;
  dependencies?: BuilderCanonicalEntriesDependencies;
}) => {
  const canView = await (
    dependencies.hasProjectPermit ?? authorizeProject.hasProjectPermit
  )({ projectId, permit: "view" }, context);
  if (canView === false) {
    throw new AuthorizationError(authorizationError);
  }
  await (dependencies.synchronizeCanonicalAssets ?? synchronizeCanonicalAssets)(
    {
      projectId,
      client: context.postgrest.client,
      assetClient,
    }
  );
  return await (
    dependencies.loadCanonicalAssetFileEntries ?? loadCanonicalAssetFileEntries
  )({
    client: context.postgrest.client,
    projectId,
  });
};
