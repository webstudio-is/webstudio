import type { AssetContentRepository } from "@webstudio-is/asset-uploader/content-repository";
import { getAssetContentBridge } from "~/shared/asset-content-bridge.client";
import { $authToken } from "~/shared/nano-states";
import { createHttpAssetContentRepository } from "./mdx-content-repository";

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
      request: (input, init) =>
        getAssetContentBridge().request(String(input), init),
    });
  };
  return {
    readContent: (input) => getRepository().readContent(input),
    updateContent: (input) => getRepository().updateContent(input),
  };
};
