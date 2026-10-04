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

declare module "__MANAGED_FORM_FETCH__" {
  export const createManagedFormEmailSender: (options: {
    context: unknown;
    formData: FormData;
  }) => import("@webstudio-is/sdk/runtime").ResourceLoadOptions["sendEmail"];
  export const validateManagedFormEmail: (
    request: import("@webstudio-is/sdk/runtime").ResourceRequest,
    formData: FormData
  ) => void;
  import type { ProtectedResourceFetch } from "@webstudio-is/sdk/protected-resource-fetch";

  export const createManagedFormResourceFetch: (options: {
    request: Request;
    context: unknown;
    projectDomain?: string;
  }) => ProtectedResourceFetch;
}

declare module "__ASSET_RESOURCE_FETCH__" {
  import type { ContentArtifactV1 } from "@webstudio-is/content-engine";

  export const createSsgAssetResourceFetch: (options: {
    deploymentId: string;
    artifact: ContentArtifactV1;
    runtimeAssets: Record<
      string,
      { url: string; width?: number; height?: number }
    >;
  }) => (
    input: RequestInfo | URL,
    init?: RequestInit
  ) => Promise<Response | undefined>;
}
