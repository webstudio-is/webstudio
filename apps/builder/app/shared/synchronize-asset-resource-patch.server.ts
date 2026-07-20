import {
  synchronizeAllCanonicalAssetStandardMetadata,
  synchronizeAssetResourceIndexQueries,
  synchronizeCanonicalAsset,
  updateAssetResourceIndexesAfterCanonicalChange,
} from "@webstudio-is/asset-uploader/index.server";
import type { BuildPatchChange } from "@webstudio-is/project/index.server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import type { Resource } from "@webstudio-is/sdk";
import { createAssetClient } from "./asset-client";

const parseResources = (value: string) => JSON.parse(value) as Resource[];

export const synchronizeAssetResourcesAfterBuildPatch = async ({
  context,
  projectId,
  previousResources,
  resources,
  changes,
}: {
  context: AppContext;
  projectId: string;
  previousResources?: string;
  resources?: string;
  changes: readonly BuildPatchChange[];
}) => {
  const hasResourceChanges =
    previousResources !== undefined &&
    resources !== undefined &&
    previousResources !== resources;
  const assetChanges = changes.filter(
    ({ namespace }) => namespace === "assets" || namespace === "assetFolders"
  );
  if (hasResourceChanges === false && assetChanges.length === 0) {
    return;
  }
  let assetClient: ReturnType<typeof createAssetClient>;
  try {
    assetClient = createAssetClient();
  } catch (error) {
    console.error("Asset resource client initialization failed", error);
    return;
  }
  if (hasResourceChanges) {
    try {
      await synchronizeAssetResourceIndexQueries({
        client: context.postgrest.client,
        assetClient,
        projectId,
        previousResources: parseResources(previousResources),
        resources: parseResources(resources),
      });
    } catch (error) {
      console.error("Asset resource index synchronization failed", error);
    }
  }

  if (assetChanges.length === 0) {
    return;
  }

  try {
    if (assetChanges.some(({ namespace }) => namespace === "assetFolders")) {
      await synchronizeAllCanonicalAssetStandardMetadata({
        client: context.postgrest.client,
        projectId,
      });
    }
    const directAssetChanges = assetChanges.filter(
      ({ namespace }) => namespace === "assets"
    );
    const canonicalAssetIds = [
      ...new Set(
        directAssetChanges.flatMap(({ patches }) =>
          patches.flatMap(({ path }) =>
            typeof path[0] === "string" &&
            (path.length === 1 ||
              path[1] === "name" ||
              path[1] === "filename" ||
              path[1] === "folderId")
              ? [path[0]]
              : []
          )
        )
      ),
    ];
    for (const assetId of canonicalAssetIds) {
      await synchronizeCanonicalAsset({
        client: context.postgrest.client,
        assetClient,
        projectId,
        assetId,
      });
    }
    const hasFolderChanges = assetChanges.some(
      ({ namespace }) => namespace === "assetFolders"
    );
    if (hasFolderChanges === false && canonicalAssetIds.length === 0) {
      return;
    }
    await updateAssetResourceIndexesAfterCanonicalChange({
      client: context.postgrest.client,
      store: assetClient.resourceIndexStore,
      projectId,
      changedAssetIds: hasFolderChanges
        ? ["project-assets"]
        : canonicalAssetIds,
    });
  } catch (error) {
    console.error("Asset resource index maintenance failed", error);
  }
};
