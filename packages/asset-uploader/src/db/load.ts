import {
  authorizeProject,
  type AppContext,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";
import type { Asset } from "@webstudio-is/sdk";
import { loadAssetsByProjectWithClient } from "../asset-patch-core";

export const loadAssetsByProject = async (
  projectId: string,
  context: AppContext,
  { skipPermissionsCheck = false }: { skipPermissionsCheck?: boolean } = {}
): Promise<Asset[]> => {
  const canRead =
    skipPermissionsCheck ||
    (await authorizeProject.hasProjectPermit(
      { projectId, permit: "view" },
      context
    ));

  if (canRead === false) {
    throw new AuthorizationError(
      "You don't have access to this project assets"
    );
  }

  return loadAssetsByProjectWithClient(projectId, context.postgrest.client);
};
