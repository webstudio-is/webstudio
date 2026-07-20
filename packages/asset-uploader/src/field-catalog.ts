import {
  createAssetFieldCatalog,
  toBuilderAssetFieldCatalog,
} from "@webstudio-is/asset-resource";
import {
  authorizeProject,
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { loadCanonicalAssetFileEntries } from "./canonical-metadata-persistence";
import type { AssetClient } from "./client";
import { synchronizeCanonicalAssets } from "./canonical-metadata-backfill";

export const loadBuilderAssetFieldCatalog = async ({
  projectId,
  context,
  assetClient,
}: {
  projectId: string;
  context: AppContext;
  assetClient: Pick<AssetClient, "readFile">;
}) => {
  const canView = await authorizeProject.hasProjectPermit(
    { projectId, permit: "view" },
    context
  );
  if (canView === false) {
    throw new AuthorizationError(
      "You don't have access to this project's asset field catalog"
    );
  }

  await synchronizeCanonicalAssets({
    projectId,
    client: context.postgrest.client,
    assetClient,
  });
  const entries = await loadCanonicalAssetFileEntries({
    client: context.postgrest.client,
    projectId,
  });
  const catalog = await createAssetFieldCatalog(entries);
  return toBuilderAssetFieldCatalog(catalog);
};
