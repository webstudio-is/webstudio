import {
  authorizeProject,
  type AppContext,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";
import type { Asset } from "@webstudio-is/sdk";
import { deleteAssetsWithClient } from "./asset-patch-core";

export const deleteAssets = async (
  props: {
    ids: Array<Asset["id"]>;
    projectId: string;
  },
  context: AppContext
): Promise<void> => {
  const canDelete = await authorizeProject.hasProjectPermit(
    { projectId: props.projectId, permit: "edit" },
    context
  );

  if (canDelete === false) {
    throw new AuthorizationError(
      "You don't have access to delete this project assets"
    );
  }

  await deleteAssetsWithClient(props, context.postgrest.client);
};
