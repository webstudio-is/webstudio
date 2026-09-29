import {
  contentEngineLimits,
  getContentArtifactRuntimeAssetIds,
  type ContentCompilationPlan,
  type ContentArtifactV1,
} from "@webstudio-is/content-engine";
import {
  compileContentUntilPlanIsStable,
  decodeUtf8,
  readBoundedBytes,
  serializeJsonDeterministically,
} from "@webstudio-is/content-engine/compiler";
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
      artifact: ContentArtifactV1,
      loadDocumentSource: (input: {
        id: string;
        revision: string;
        contentRef: string;
      }) => Promise<string>
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
  const documentSources = new Map<string, Promise<string>>();
  const loadDocumentSource = (input: {
    id: string;
    revision: string;
    contentRef: string;
  }) => {
    const key = JSON.stringify([input.id, input.revision, input.contentRef]);
    const cached = documentSources.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const source = (async () => {
      const { data } = await assetStore.readFile(input.contentRef);
      return decodeUtf8(
        await readBoundedBytes(data, contentEngineLimits.hydratedFileBytes)
      );
    })();
    documentSources.set(key, source);
    return source;
  };
  const { result: artifact, assetData } = await prepareStablePublishedAssetData(
    {
      projectId,
      context,
      assetStore,
      validateCollections: (assets) => repository.validateCollections(assets),
      prepare: async () =>
        await repository.withIndexPreparationSession(async (prepareIndex) => {
          // Keep hydrated bytes local to one stability attempt. Dependency
          // convergence can reuse them, while a retry starts from a clean cache.
          return resolvePlan === undefined
            ? await prepareIndex(plan)
            : await compileContentUntilPlanIsStable({
                plan,
                compile: prepareIndex,
                resolvePlan: (artifact) =>
                  resolvePlan(artifact, loadDocumentSource),
              });
        }),
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
