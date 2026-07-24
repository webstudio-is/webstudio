import {
  synchronizeCanonicalAssets,
  synchronizeAllCanonicalAssetStandardMetadata,
  synchronizeCanonicalAsset,
  synchronizeCanonicalAssetStandardMetadata,
} from "@webstudio-is/asset-uploader/index.server";
import type { BuildPatchChange } from "@webstudio-is/project/index.server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { isConfiguredAssetsResource, type Resource } from "@webstudio-is/sdk";
import { createAssetClient } from "./asset-client";

const defaultDependencies = {
  createAssetClient,
  synchronizeCanonicalAssets,
  synchronizeAllCanonicalAssetStandardMetadata,
  synchronizeCanonicalAsset,
  synchronizeCanonicalAssetStandardMetadata,
};

const parseResources = (value: string | undefined) =>
  value === undefined ? [] : (JSON.parse(value) as Resource[]);

const hasConfiguredAssetsResource = (resources: readonly Resource[]) =>
  resources.some(isConfiguredAssetsResource);

const getCanonicalAssetChanges = (changes: readonly BuildPatchChange[]) => {
  const changedAssetIds = new Set<string>();
  const contentAssetIds = new Set<string>();
  for (const { namespace, patches } of changes) {
    if (namespace !== "assets") {
      continue;
    }
    for (const { path } of patches) {
      const assetId = path[0];
      if (typeof assetId !== "string") {
        continue;
      }
      const field = path[1];
      if (
        path.length !== 1 &&
        field !== "name" &&
        field !== "filename" &&
        field !== "folderId"
      ) {
        continue;
      }
      changedAssetIds.add(assetId);
      if (path.length === 1 || field === "name") {
        contentAssetIds.add(assetId);
      }
    }
  }
  return {
    changedAssetIds: [...changedAssetIds],
    contentAssetIds: [...contentAssetIds],
  };
};

export const synchronizeAssetResourcesAfterBuildPatch = async (
  {
    context,
    projectId,
    previousResources,
    resources,
    changes,
    replaceAllAssets = false,
  }: {
    context: AppContext;
    buildId: string;
    projectId: string;
    previousResources?: string;
    resources?: string;
    changes: readonly BuildPatchChange[];
    replaceAllAssets?: boolean;
  },
  dependencies = defaultDependencies
) => {
  const currentResources = parseResources(resources);
  if (hasConfiguredAssetsResource(currentResources) === false) {
    return;
  }

  const assetChanges = changes.filter(
    ({ namespace }) => namespace === "assets" || namespace === "assetFolders"
  );
  const queryWasEnabled = hasConfiguredAssetsResource(
    parseResources(previousResources)
  );
  const mustSynchronizeAll =
    replaceAllAssets ||
    (resources !== previousResources && queryWasEnabled === false);
  if (mustSynchronizeAll === false && assetChanges.length === 0) {
    return;
  }

  try {
    const assetClient = dependencies.createAssetClient();
    if (mustSynchronizeAll) {
      await dependencies.synchronizeCanonicalAssets({
        client: context.postgrest.client,
        assetClient,
        projectId,
      });
      return;
    }

    const hasFolderChanges = assetChanges.some(
      ({ namespace }) => namespace === "assetFolders"
    );
    if (hasFolderChanges) {
      await dependencies.synchronizeAllCanonicalAssetStandardMetadata({
        client: context.postgrest.client,
        projectId,
      });
    }
    const { changedAssetIds, contentAssetIds } =
      getCanonicalAssetChanges(assetChanges);
    if (hasFolderChanges === false) {
      const contentAssetIdSet = new Set(contentAssetIds);
      const standardMetadataAssetIds = changedAssetIds.filter(
        (assetId) => contentAssetIdSet.has(assetId) === false
      );
      if (standardMetadataAssetIds.length > 0) {
        await dependencies.synchronizeCanonicalAssetStandardMetadata({
          client: context.postgrest.client,
          projectId,
          assetIds: standardMetadataAssetIds,
        });
      }
    }
    for (const assetId of contentAssetIds) {
      await dependencies.synchronizeCanonicalAsset({
        client: context.postgrest.client,
        assetClient,
        projectId,
        assetId,
      });
    }
  } catch (error) {
    console.error("Asset metadata synchronization failed", error);
  }
};
