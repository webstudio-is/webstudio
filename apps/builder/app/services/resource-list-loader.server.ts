import { type ResourceRequest, resourceRequest } from "@webstudio-is/sdk";
import {
  createResourceFetchBatchProvider,
  isLocalResource,
  loadResource,
} from "@webstudio-is/sdk/runtime";
import { executeAssetQueries } from "~/shared/$resources/assets-query.server";
import { getResourceKey } from "~/shared/resource-utils";

const defaultDependencies = {
  executeAssetQueries,
  loadResource,
};

export const loadResourceRequestList = async (
  {
    request,
    requestList,
    sourceOrigin,
    includeDiagnostics,
    customFetch,
  }: {
    request: Request;
    requestList: readonly unknown[];
    sourceOrigin: string;
    includeDiagnostics: boolean;
    customFetch: typeof fetch;
  },
  dependencies = defaultDependencies
) => {
  const assetProvider = includeDiagnostics
    ? undefined
    : createResourceFetchBatchProvider({
        baseUrl: request.url,
        shouldBatch: (input) =>
          typeof input === "string" && isLocalResource(input, "assets"),
        execute: (resourceRequests) =>
          dependencies.executeAssetQueries({ request, resourceRequests }),
      });
  const providerFetch: typeof fetch = (input, init) =>
    assetProvider?.fetch(input, init) ?? customFetch(input, init);
  const output = requestList.map(async (item) => {
    const resource = resourceRequest.safeParse(item);
    if (resource.success === false) {
      return [
        getResourceKey(item as ResourceRequest),
        {
          ok: false,
          data: resource.error.format(),
          status: 403,
          statusText: "Resource validation error",
        },
      ];
    }
    return [
      getResourceKey(resource.data),
      await dependencies.loadResource(
        providerFetch,
        resource.data,
        sourceOrigin,
        { signal: request.signal }
      ),
    ];
  });
  await assetProvider?.flush();
  return await Promise.all(output);
};
