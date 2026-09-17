import {
  getContentArtifactRuntimeAssetIds,
  type ContentCompilationPlan,
  type ContentArtifactV1,
} from "@webstudio-is/content-engine";
import { serializeJsonDeterministically } from "@webstudio-is/content-engine/compiler";
import type { Asset } from "@webstudio-is/sdk";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { PostgresAssetRepository } from "./asset-repository";
import type { AssetObjectStore } from "./client";
import { getCollectionReservedAssetIds } from "./collection-persistence";
import { loadAssetDataByProject } from "./db";

const defaultDependencies = {
  createRepository: (
    options: ConstructorParameters<typeof PostgresAssetRepository>[0]
  ) => new PostgresAssetRepository(options),
  loadAssetDataByProject,
};

const getOmittedCollectionAssetIds = async ({
  assets,
  assetStore,
  context,
}: {
  assets: readonly Asset[];
  assetStore: AssetObjectStore;
  context: AppContext;
}) => {
  // CLI bundles are authenticated, lossless exports that may be imported
  // again. Public and service publication bundles do not expose collection
  // configuration or templates.
  if (context.apiClient?.type === "cli") {
    return new Set<string>();
  }
  return await getCollectionReservedAssetIds({ assets, assetStore });
};

const prepareStablePublishedAssetData = async <Result>({
  projectId,
  context,
  assetStore,
  validateCollections,
  prepare,
  dependencies,
}: {
  projectId: string;
  context: AppContext;
  assetStore: AssetObjectStore;
  validateCollections: (assets: readonly Asset[]) => Promise<void>;
  prepare: () => Promise<Result>;
  dependencies: typeof defaultDependencies;
}) => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const assetDataBefore = await dependencies.loadAssetDataByProject(
      projectId,
      context
    );
    await validateCollections(assetDataBefore.assets);
    const result = await prepare();
    const omittedCollectionAssetIds = await getOmittedCollectionAssetIds({
      assets: assetDataBefore.assets,
      assetStore,
      context,
    });
    const assetDataAfter = await dependencies.loadAssetDataByProject(
      projectId,
      context
    );
    if (
      serializeJsonDeterministically(assetDataBefore) ===
      serializeJsonDeterministically(assetDataAfter)
    ) {
      return {
        result,
        assetData: {
          ...assetDataAfter,
          assets: assetDataAfter.assets.filter(
            (asset: Asset) => omittedCollectionAssetIds.has(asset.id) === false
          ),
        },
      };
    }
    if (attempt === 0) {
      continue;
    }
    throw new Error("Assets changed while preparing publication; retry");
  }
  throw new Error("Asset data was not prepared");
};

export const validatePublishedAssetCollections = async (
  {
    projectId,
    context,
    assetStore,
  }: {
    projectId: string;
    context: AppContext;
    assetStore: AssetObjectStore;
  },
  dependencies = defaultDependencies
) => {
  const repository = dependencies.createRepository({
    projectId,
    context,
    assetStore,
  });
  const { assetData } = await prepareStablePublishedAssetData({
    projectId,
    context,
    assetStore,
    validateCollections: (assets) => repository.validateCollections(assets),
    prepare: async () => undefined,
    dependencies,
  });
  return assetData;
};

export const preparePublishedAssetData = async (
  {
    projectId,
    context,
    assetStore,
    contentDatabaseMaxBytes,
    plan,
    retainedAssetIds,
    resolvePlan,
  }: {
    projectId: string;
    context: AppContext;
    assetStore: AssetObjectStore;
    contentDatabaseMaxBytes: number;
    plan: ContentCompilationPlan;
    retainedAssetIds: Iterable<string>;
    resolvePlan?: (
      artifact: ContentArtifactV1
    ) => ContentCompilationPlan | Promise<ContentCompilationPlan>;
  },
  dependencies = defaultDependencies
) => {
  const repository = dependencies.createRepository({
    projectId,
    context,
    assetStore,
    contentDatabaseMaxBytes,
  });
  const { result: artifact, assetData } = await prepareStablePublishedAssetData(
    {
      projectId,
      context,
      assetStore,
      validateCollections: (assets) => repository.validateCollections(assets),
      prepare: async () => {
        let artifact = await repository.prepareIndex(plan);
        if (resolvePlan !== undefined) {
          let resolvedPlan = await resolvePlan(artifact);
          for (
            let dependencyPass = 0;
            dependencyPass < 20;
            dependencyPass += 1
          ) {
            artifact = await repository.prepareIndex(resolvedPlan);
            const validatedPlan = await resolvePlan(artifact);
            if (
              serializeJsonDeterministically(resolvedPlan) ===
              serializeJsonDeterministically(validatedPlan)
            ) {
              break;
            }
            if (dependencyPass === 19) {
              throw new Error(
                "Dynamic MDX dependency closure exceeds the safe publication depth"
              );
            }
            resolvedPlan = validatedPlan;
          }
        }
        return artifact;
      },
      dependencies,
    }
  );
  const runtimeAssetIds = new Set(retainedAssetIds);
  for (const assetId of getContentArtifactRuntimeAssetIds({
    artifact,
    includeDocuments: true,
  })) {
    runtimeAssetIds.add(assetId);
  }
  return {
    artifact,
    assets: assetData.assets.filter(
      (asset: Asset) => asset.type !== "font" || runtimeAssetIds.has(asset.id)
    ),
    assetFolders: assetData.assetFolders,
  };
};
