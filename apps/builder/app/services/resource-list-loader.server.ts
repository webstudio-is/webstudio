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
  now: () => performance.now(),
};

const getResponseBytes = (value: unknown) => {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return 0;
  }
};

const getInternalPerformance = (value: unknown) => {
  if (
    typeof value === "object" &&
    value !== null &&
    "__performance__" in value &&
    typeof value.__performance__ === "object" &&
    value.__performance__ !== null
  ) {
    return value.__performance__;
  }
  return {};
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
  dependencies: Partial<typeof defaultDependencies> = {}
) => {
  const resolvedDependencies = { ...defaultDependencies, ...dependencies };
  const assetProvider = includeDiagnostics
    ? undefined
    : createResourceFetchBatchProvider({
        baseUrl: request.url,
        shouldBatch: (input) =>
          typeof input === "string" && isLocalResource(input, "assets"),
        execute: (resourceRequests) =>
          resolvedDependencies.executeAssetQueries({
            request,
            resourceRequests,
          }),
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
    const startedAt = resolvedDependencies.now();
    const result = await resolvedDependencies.loadResource(
      providerFetch,
      resource.data,
      sourceOrigin,
      { signal: request.signal }
    );
    return [
      getResourceKey(resource.data),
      {
        ...result,
        __performance__: {
          ...getInternalPerformance(result),
          serverDurationMs: resolvedDependencies.now() - startedAt,
          responseBytes: getResponseBytes(result),
        },
      },
    ];
  });
  await assetProvider?.flush();
  return await Promise.all(output);
};
