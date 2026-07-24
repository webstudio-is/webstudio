import type { Patch } from "immer";
import {
  type AppContext,
  authorizeProject,
} from "@webstudio-is/trpc-interface/index.server";
import { patchAssetsWithClient } from "./asset-patch-core";

/**
 * patchAssets applies asset metadata updates, deletions, and undo restores after
 * the app layer confirms project edit access.
 */
export const patchAssets = async (
  { projectId }: { projectId: string },
  patches: Array<Patch>,
  context: AppContext
): Promise<void> => {
  const canEdit = await authorizeProject.hasProjectPermit(
    { projectId, permit: "edit" },
    context
  );
  if (canEdit === false) {
    throw new Error("You don't have edit access to this project");
  }

  await patchAssetsWithClient(
    { projectId, client: context.postgrest.client },
    patches
  );
};
