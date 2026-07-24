declare module "__ASSET_QUERY_MANIFEST__" {
  import type { PublishedAssetIndexManifest } from "@webstudio-is/asset-resource/runtime";

  export const assetQueryDeploymentId: string;
  export const assetQueryManifest: PublishedAssetIndexManifest | undefined;
}

declare module "__ASSET_QUERY_RUNTIME__" {
  export const createGeneratedAssetResourceFetch: (options: {
    request: Request;
    context: unknown;
    fallback: typeof fetch;
  }) => Promise<typeof fetch>;
}

declare module "__ASSET_RESOURCE_FETCH__" {
  import type { PublishedAssetIndexManifest } from "@webstudio-is/asset-resource/runtime";

  export const createSsgAssetResourceFetch: (options: {
    deploymentId: string;
    manifest: PublishedAssetIndexManifest;
  }) => (
    input: RequestInfo | URL,
    init?: RequestInit
  ) => Promise<Response | undefined>;
}
