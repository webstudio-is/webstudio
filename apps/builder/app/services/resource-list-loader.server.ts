import { type ResourceRequest, resourceRequest } from "@webstudio-is/sdk";
import {
  createResourceFetchBatchProvider,
  isLocalResource,
  loadResource,
} from "@webstudio-is/sdk/runtime";
import { getZodValidationIssues } from "@webstudio-is/project-build/runtime";
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

const separateInternalPerformance = (value: unknown) => {
  if (typeof value !== "object" || value === null) {
    return { result: value, performance: {} };
  }
  const { __performance__, ...result } = value as Record<string, unknown>;
  return {
    result,
    performance:
      typeof __performance__ === "object" && __performance__ !== null
        ? __performance__
        : {},
  };
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
          data: {
            error: {
              code: "INVALID_REQUEST",
              message: "Resource request is invalid",
              retryable: false,
              details: { issues: getZodValidationIssues(resource.error) },
            },
          },
          status: 400,
          statusText: "Bad Request",
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
    const separated = separateInternalPerformance(result);
    return [
      getResourceKey(resource.data),
      {
        ...result,
        __performance__: {
          ...separated.performance,
          serverDurationMs: Math.max(0, resolvedDependencies.now() - startedAt),
          responseBytes: getResponseBytes(separated.result),
        },
      },
    ];
  });
  await assetProvider?.flush();
  return await Promise.all(output);
};
