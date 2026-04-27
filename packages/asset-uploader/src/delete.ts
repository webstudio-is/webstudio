import {
  authorizeProject,
  type AppContext,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";
import type { Asset } from "@webstudio-is/sdk";

const throwOnError = (error: null | { message: string }) => {
  if (error) {
    throw new Error(error.message);
  }
};

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

  const assets = await context.postgrest.client
    .from("Asset")
    .select(
      `
        id,
        projectId,
        name,
        file:File!inner (*)
      `
    )
    .in("id", props.ids)
    .eq("projectId", props.projectId);
  throwOnError(assets.error);

  if ((assets.data ?? []).length === 0) {
    throw new Error("Assets not found");
  }

  const projectUpdate = await context.postgrest.client
    .from("Project")
    .update({ previewImageAssetId: null })
    .eq("id", props.projectId)
    .in("previewImageAssetId", props.ids);
  throwOnError(projectUpdate.error);

  const assetDelete = await context.postgrest.client
    .from("Asset")
    .delete()
    .in("id", props.ids)
    .eq("projectId", props.projectId);
  throwOnError(assetDelete.error);

  // find unused files
  const unusedFileNames = new Set(assets.data?.map((asset) => asset.name));
  const assetsByStillUsedFileName = await context.postgrest.client
    .from("Asset")
    .select("name")
    .in("name", Array.from(unusedFileNames));
  throwOnError(assetsByStillUsedFileName.error);

  for (const asset of assetsByStillUsedFileName.data ?? []) {
    unusedFileNames.delete(asset.name);
  }

  // delete unused files
  if (unusedFileNames.size > 0) {
    const fileUpdate = await context.postgrest.client
      .from("File")
      .update({ isDeleted: true })
      .in("name", Array.from(unusedFileNames));
    throwOnError(fileUpdate.error);
  }
};
