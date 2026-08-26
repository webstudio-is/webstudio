import type { AssetContentRepository } from "@webstudio-is/content-engine/asset-content-repository";
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
  let repository: AssetContentRepository | undefined;
  const getRepository = () => {
    if (repository !== undefined) {
      return repository;
    }
    const requestOrigin = origin ?? globalThis.location?.origin;
    if (requestOrigin === undefined) {
      throw new Error("Asset content requests require a browser origin");
    }
    repository = createHttpAssetContentRepository({
      projectId,
      origin: requestOrigin,
      authToken: () => $authToken.get(),
      request: (input, init) =>
        getAssetContentBridge().request(String(input), init),
    });
    return repository;
  };
  return {
    readContent: (input) => getRepository().readContent(input),
    updateContent: (input) => getRepository().updateContent(input),
  };
};
