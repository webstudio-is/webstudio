import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import type { AssetObjectReader } from "./client";
import {
  type AssetRepository,
  PostgresAssetRepository,
} from "./asset-repository";

export type BuilderAssetRepositoryDependencies = {
  createRepository?: (input: {
    projectId: string;
    context: AppContext;
    assetClient: AssetObjectReader;
  }) => Pick<AssetRepository, "readFieldCatalog" | "query">;
};

export const createBuilderAssetRepository = ({
  projectId,
  context,
  assetClient,
  dependencies = {},
  contentDatabaseMaxBytes,
}: {
  projectId: string;
  context: AppContext;
  assetClient: AssetObjectReader;
  dependencies?: BuilderAssetRepositoryDependencies;
  contentDatabaseMaxBytes?: number;
}) =>
  (
    dependencies.createRepository ??
    (({ projectId, context, assetClient }) =>
      new PostgresAssetRepository({
        projectId,
        context,
        assetStore: assetClient,
        contentDatabaseMaxBytes,
      }))
  )({ projectId, context, assetClient });
