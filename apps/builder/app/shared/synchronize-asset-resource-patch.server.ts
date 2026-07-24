import {
  synchronizeCanonicalAssets,
  synchronizeAllCanonicalAssetStandardMetadata,
  synchronizeAssetResourceIndexQueries,
  synchronizeCanonicalAsset,
  updateAssetResourceIndexesAfterCanonicalChange,
} from "@webstudio-is/asset-uploader/index.server";
import type { BuildPatchChange } from "@webstudio-is/project/index.server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { getAssetResourceQuery, type Resource } from "@webstudio-is/sdk";
import { createAssetClientWithResourceIndexStore } from "./asset-client";

const defaultDependencies = {
  createAssetClient: createAssetClientWithResourceIndexStore,
  synchronizeCanonicalAssets,
  synchronizeAllCanonicalAssetStandardMetadata,
  synchronizeAssetResourceIndexQueries,
  synchronizeCanonicalAsset,
  updateAssetResourceIndexesAfterCanonicalChange,
};

const parseResources = (value: string) => JSON.parse(value) as Resource[];

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
      // Asset patching already synchronizes filename and folder metadata.
      // Adds, deletes, and file swaps still require reading or removing the
      // canonical content entry.
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
    buildId,
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
  const hasResourceChanges =
    previousResources !== undefined &&
    resources !== undefined &&
    previousResources !== resources;
  const assetChanges = changes.filter(
    ({ namespace }) => namespace === "assets" || namespace === "assetFolders"
  );
  if (
    hasResourceChanges === false &&
    assetChanges.length === 0 &&
    replaceAllAssets === false
  ) {
    return;
  }
  let assetClient: ReturnType<typeof dependencies.createAssetClient>;
  try {
    assetClient = dependencies.createAssetClient();
  } catch (error) {
    console.error("Asset resource client initialization failed", error);
    return;
  }
  let canonicalAlreadySynchronized = false;
  let updatedResourceIds: string[] = [];
  if (
    (hasResourceChanges || replaceAllAssets) &&
    previousResources !== undefined &&
    resources !== undefined
  ) {
    try {
      const result = await dependencies.synchronizeAssetResourceIndexQueries({
        client: context.postgrest.client,
        assetClient,
        projectId,
        previousResources: parseResources(previousResources),
        resources: parseResources(resources),
        source: { buildId, resources },
      });
      updatedResourceIds = result.updatedResourceIds;
      canonicalAlreadySynchronized = updatedResourceIds.length > 0;
    } catch (error) {
      console.error("Asset resource index synchronization failed", error);
    }
  }

  if (assetChanges.length === 0 && replaceAllAssets === false) {
    return;
  }

  try {
    if (replaceAllAssets) {
      if (
        resources !== undefined &&
        parseResources(resources).some(
          (resource) => getAssetResourceQuery(resource) !== undefined
        ) === false
      ) {
        return;
      }
      if (canonicalAlreadySynchronized === false) {
        await dependencies.synchronizeCanonicalAssets({
          client: context.postgrest.client,
          assetClient,
          projectId,
        });
      }
      await dependencies.updateAssetResourceIndexesAfterCanonicalChange({
        client: context.postgrest.client,
        store: assetClient.resourceIndexStore,
        projectId,
        changedAssetIds: ["project-assets"],
        excludedResourceIds: updatedResourceIds,
      });
      return;
    }
    const hasFolderChanges = assetChanges.some(
      ({ namespace }) => namespace === "assetFolders"
    );
    const { changedAssetIds, contentAssetIds } =
      getCanonicalAssetChanges(assetChanges);
    if (canonicalAlreadySynchronized === false && hasFolderChanges) {
      await dependencies.synchronizeAllCanonicalAssetStandardMetadata({
        client: context.postgrest.client,
        projectId,
      });
    }
    if (canonicalAlreadySynchronized === false) {
      for (const assetId of contentAssetIds) {
        await dependencies.synchronizeCanonicalAsset({
          client: context.postgrest.client,
          assetClient,
          projectId,
          assetId,
        });
      }
    }
    if (hasFolderChanges === false && changedAssetIds.length === 0) {
      return;
    }
    await dependencies.updateAssetResourceIndexesAfterCanonicalChange({
      client: context.postgrest.client,
      store: assetClient.resourceIndexStore,
      projectId,
      changedAssetIds: hasFolderChanges ? ["project-assets"] : changedAssetIds,
      excludedResourceIds: updatedResourceIds,
    });
  } catch (error) {
    console.error("Asset resource index maintenance failed", error);
  }
};
