declare module "__ASSET_QUERY_MANIFEST__" {
  import type { ContentArtifactV1 } from "@webstudio-is/content-engine";

  export const assetQueryDeploymentId: string;
  export const assetQueryDatabase: ContentArtifactV1 | undefined;
}

declare module "__ASSET_QUERY_RUNTIME__" {
  export const createGeneratedAssetResourceFetch: (options: {
    request: Request;
    context: unknown;
    fallback: typeof fetch;
  }) => Promise<typeof fetch>;
}

declare module "__ASSET_RESOURCE_FETCH__" {
  import type { ContentArtifactV1 } from "@webstudio-is/content-engine";

  export const createSsgAssetResourceFetch: (options: {
    deploymentId: string;
    artifact: ContentArtifactV1;
  }) => (
    input: RequestInfo | URL,
    init?: RequestInit
  ) => Promise<Response | undefined>;
}
