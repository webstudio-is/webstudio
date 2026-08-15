import type { AssetContentRepository } from "@webstudio-is/asset-uploader/content-repository";
import { createHttpAssetContentRepository as createSharedRepository } from "@webstudio-is/project-build/runtime";
import {
  readProjectAssetContent,
  updateProjectAssetContent,
} from "@webstudio-is/http-client";
import { assetContentDescriptor } from "@webstudio-is/protocol/asset-resource-api";
import { fetch as builderFetch } from "~/shared/fetch.client";
import { $authToken } from "~/shared/nano-states";

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
    read: ({ assetId, range }) =>
      readProjectAssetContent({
        projectId,
        origin,
        requestOrigin: origin,
        authToken: authToken(),
        request,
        assetId,
        range,
      }),
    update: async ({ assetId, expectedName, data }) => {
      const bytes = Uint8Array.from(data);
      const { asset } = await updateProjectAssetContent({
        projectId,
        origin,
        requestOrigin: origin,
        authToken: authToken(),
        request,
        assetId,
        expectedName,
        readAssetData: async () => bytes,
      });
      return assetContentDescriptor.parse(asset);
    },
  });

export const createBuilderHttpAssetContentRepository = ({
  projectId,
  origin,
}: {
  projectId: string;
  origin?: string;
}): AssetContentRepository => {
  const getRepository = () => {
    const requestOrigin = origin ?? globalThis.location?.origin;
    if (requestOrigin === undefined) {
      throw new Error("Asset content requests require a browser origin");
    }
    return createHttpAssetContentRepository({
      projectId,
      origin: requestOrigin,
      authToken: () => $authToken.get(),
      request: builderFetch,
    });
  };
  return {
    readContent: (input) => getRepository().readContent(input),
    updateContent: (input) => getRepository().updateContent(input),
  };
};
