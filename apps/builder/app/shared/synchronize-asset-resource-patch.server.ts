import {
  type AssetMaintenanceRepository,
  PostgresAssetRepository,
} from "@webstudio-is/asset-uploader/index.server";
import type { BuildPatchChange } from "@webstudio-is/project/index.server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { isConfiguredAssetsResource, type Resource } from "@webstudio-is/sdk";
import { createAssetClient } from "./asset-client";

type Dependencies = {
  createAssetClient: typeof createAssetClient;
  createRepository: (
    input: ConstructorParameters<typeof PostgresAssetRepository>[0]
  ) => Pick<AssetMaintenanceRepository, "synchronizeBuildChanges">;
};

const defaultDependencies: Dependencies = {
  createAssetClient,
  createRepository: (
    input: ConstructorParameters<typeof PostgresAssetRepository>[0]
  ) => new PostgresAssetRepository(input),
};

const parseResources = (value: string | undefined) =>
  value === undefined ? [] : (JSON.parse(value) as Resource[]);

const hasConfiguredAssetsResource = (resources: readonly Resource[]) =>
  resources.some(isConfiguredAssetsResource);

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
  dependencies: Dependencies = defaultDependencies
) => {
  try {
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

    const assetClient = dependencies.createAssetClient();
    await dependencies
      .createRepository({ projectId, context, assetStore: assetClient })
      .synchronizeBuildChanges({
        changes: assetChanges,
        force: mustSynchronizeAll,
      });
  } catch (error) {
    console.error("Asset metadata synchronization failed", error);
  }
};
