import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import type { Asset } from "@webstudio-is/sdk";
import { loadAssetsByProjectWithClient } from "../asset-patch-core";
import { assertAssetReadPermission } from "../read-permission";

export const loadAssetsByProject = async (
  projectId: string,
  context: AppContext,
  { skipPermissionsCheck = false }: { skipPermissionsCheck?: boolean } = {}
): Promise<Asset[]> => {
  await assertAssetReadPermission(projectId, context, skipPermissionsCheck);
  return loadAssetsByProjectWithClient(projectId, context.postgrest.client);
};
