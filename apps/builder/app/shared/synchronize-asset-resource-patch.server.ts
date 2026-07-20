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
    const addedAssetIds = [
      ...new Set(
        directAssetChanges.flatMap(({ patches }) =>
          patches.flatMap(({ op, path }) =>
            op === "add" && path.length === 1 && typeof path[0] === "string"
              ? [path[0]]
              : []
          )
        )
      ),
    ];
    for (const assetId of addedAssetIds) {
      await synchronizeCanonicalAsset({
        client: context.postgrest.client,
        assetClient,
        projectId,
        assetId,
      });
    }
    const changedAssetIds = [
      ...new Set(
        directAssetChanges.flatMap(({ patches }) =>
          patches
            .map(({ path }) => path[0])
            .filter((id): id is string => typeof id === "string")
        )
      ),
    ];
    await updateAssetResourceIndexesAfterCanonicalChange({
      client: context.postgrest.client,
      store: assetClient.resourceIndexStore,
      projectId,
      changedAssetIds:
        changedAssetIds.length === 0 ? ["project-assets"] : changedAssetIds,
    });
  } catch (error) {
    console.error("Asset resource index maintenance failed", error);
  }
};
