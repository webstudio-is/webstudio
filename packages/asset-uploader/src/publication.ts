import {
  getContentArtifactRuntimeAssetIds,
  type ContentCompilationPlan,
} from "@webstudio-is/content-engine";
import type { Asset } from "@webstudio-is/sdk";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { PostgresAssetRepository } from "./asset-repository";
import type { AssetObjectStore } from "./client";
import { loadAssetDataByProject } from "./db";

const defaultDependencies = {
  createRepository: (
    options: ConstructorParameters<typeof PostgresAssetRepository>[0]
  ) => new PostgresAssetRepository(options),
  loadAssetDataByProject,
};

export const preparePublishedAssetData = async (
  {
    projectId,
    context,
    assetStore,
    contentDatabaseMaxBytes,
    plan,
    retainedAssetIds,
  }: {
    projectId: string;
    context: AppContext;
    assetStore: AssetObjectStore;
    contentDatabaseMaxBytes: number;
    plan: ContentCompilationPlan;
    retainedAssetIds: Iterable<string>;
  },
  dependencies = defaultDependencies
) => {
  const repository = dependencies.createRepository({
    projectId,
    context,
    assetStore,
    contentDatabaseMaxBytes,
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const assetDataBefore = await dependencies.loadAssetDataByProject(
      projectId,
      context
    );
    const artifact = await repository.prepareIndex(plan);
    const assetDataAfter = await dependencies.loadAssetDataByProject(
      projectId,
      context
    );
    if (JSON.stringify(assetDataBefore) !== JSON.stringify(assetDataAfter)) {
      if (attempt === 0) {
        continue;
      }
      throw new Error("Assets changed while preparing publication; retry");
    }

    const runtimeAssetIds = new Set(retainedAssetIds);
    for (const assetId of getContentArtifactRuntimeAssetIds({
      artifact,
      includeDocuments: true,
    })) {
      runtimeAssetIds.add(assetId);
    }
    return {
      artifact,
      assets: assetDataAfter.assets.filter(
        (asset: Asset) => asset.type !== "font" || runtimeAssetIds.has(asset.id)
      ),
      assetFolders: assetDataAfter.assetFolders,
    };
  }
  throw new Error("Asset index was not prepared");
};
