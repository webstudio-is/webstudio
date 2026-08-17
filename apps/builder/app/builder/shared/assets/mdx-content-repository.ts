import {
  createHttpAssetContentRepository as createSharedRepository,
  type AssetContentRepository,
} from "@webstudio-is/asset-uploader/content-repository";
import {
  readProjectAssetContent,
  updateProjectAssetContent,
} from "@webstudio-is/http-client";
import {
  assetContentDescriptor,
  assetContentDescriptorHeader,
  parseAssetContentDescriptor,
} from "@webstudio-is/protocol/asset-resource-api";

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
    parseAsset: (response) =>
      parseAssetContentDescriptor(
        response.headers.get(assetContentDescriptorHeader)
      ),
  });
