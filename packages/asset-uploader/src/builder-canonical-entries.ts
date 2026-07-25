import {
  authorizeProject,
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import type { AssetObjectReader } from "./client";
import {
  type AssetRepository,
  PostgresAssetRepository,
} from "./asset-repository";

export type BuilderAssetIndexDependencies = {
  hasProjectPermit?: typeof authorizeProject.hasProjectPermit;
  createRepository?: (input: {
    projectId: string;
    context: AppContext;
    assetClient: AssetObjectReader;
  }) => Pick<AssetRepository, "readIndex" | "query">;
};

export const loadAuthorizedBuilderAssetRepository = async ({
  projectId,
  context,
  assetClient,
  authorizationError,
  dependencies = {},
}: {
  projectId: string;
  context: AppContext;
  assetClient: AssetObjectReader;
  authorizationError: string;
  dependencies?: BuilderAssetIndexDependencies;
}) => {
  const canView = await (
    dependencies.hasProjectPermit ?? authorizeProject.hasProjectPermit
  )({ projectId, permit: "view" }, context);
  if (canView === false) {
    throw new AuthorizationError(authorizationError);
  }
  const repository = (
    dependencies.createRepository ??
    ((input) => new PostgresAssetRepository(input))
  )({ projectId, context, assetClient });
  return repository;
};
