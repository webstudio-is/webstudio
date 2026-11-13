import {
  createHttpAssetContentRepository as createSharedRepository,
  type AssetContentRepository,
} from "@webstudio-is/content-engine/asset-content-repository";
import { createProjectAssetContentTransport } from "@webstudio-is/http-client";

type HttpAssetContentRepositoryDependencies = Readonly<{
  projectId: string;
  origin: string;
  authToken?: () => string | undefined;
  request?: typeof fetch;
}>;

export const createHttpAssetContentRepository = ({
  projectId,
  origin,
  authToken = () => undefined,
  request = fetch,
}: HttpAssetContentRepositoryDependencies): AssetContentRepository =>
  createSharedRepository({
    projectId,
    ...createProjectAssetContentTransport({
      projectId,
      origin,
      authToken,
      request,
    }),
  });
