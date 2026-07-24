import {
  createAssetFieldCatalog,
  toBuilderAssetFieldCatalog,
} from "@webstudio-is/asset-resource";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import type { AssetClient } from "./client";
import {
  loadAuthorizedBuilderCanonicalEntries,
  type BuilderCanonicalEntriesDependencies,
} from "./builder-canonical-entries";

export const loadBuilderAssetFieldCatalog = async ({
  projectId,
  context,
  assetClient,
  dependencies = {},
}: {
  projectId: string;
  context: AppContext;
  assetClient: Pick<AssetClient, "readFile">;
  dependencies?: BuilderCanonicalEntriesDependencies;
}) => {
  const entries = await loadAuthorizedBuilderCanonicalEntries({
    projectId,
    context,
    assetClient,
    authorizationError:
      "You don't have access to this project's asset field catalog",
    dependencies,
  });
  const catalog = await createAssetFieldCatalog(entries);
  return toBuilderAssetFieldCatalog(catalog);
};
