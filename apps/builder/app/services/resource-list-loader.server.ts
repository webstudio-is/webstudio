import { z } from "zod";
import { type ResourceRequest, resourceRequest } from "@webstudio-is/sdk";
import {
  createResourceFetchBatchProvider,
  isLocalResource,
  loadResource,
  resourceLoadConcurrency,
} from "@webstudio-is/sdk/runtime";
import { getZodValidationIssues } from "@webstudio-is/project-build/runtime";
import { executeAssetQueries } from "~/shared/$resources/assets-query.server";
import { getResourceKey } from "~/shared/resource-utils";
import { capturePreviewResourceExchange } from "~/services/preview-resource-inspection.server";
import type { PreviewResourceExchange } from "~/shared/preview-resource-inspection";

const defaultDependencies = {
  executeAssetQueries,
  loadResource,
  now: () => performance.now(),
};

export const resourceRequestListSchema = z
  .array(z.unknown())
  .max(resourceLoadConcurrency);

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

type LoadResourceRequestListInput = {
  request: Request;
  requestList: readonly unknown[];
  sourceOrigin: string;
  includeDiagnostics: boolean;
  customFetch: typeof fetch;
  inspectResourceKey?: string;
};
type LoadedResourceList = Array<[string, unknown]>;
type InspectedResourceList = {
  resources: LoadedResourceList;
  inspection?: PreviewResourceExchange;
};

export function loadResourceRequestList(
  input: LoadResourceRequestListInput & { inspectResourceKey?: undefined },
  dependencies?: Partial<typeof defaultDependencies>
): Promise<LoadedResourceList>;
export function loadResourceRequestList(
  input: LoadResourceRequestListInput & { inspectResourceKey: string },
  dependencies?: Partial<typeof defaultDependencies>
): Promise<InspectedResourceList>;
export async function loadResourceRequestList(
  {
    request,
    requestList,
    sourceOrigin,
    includeDiagnostics,
    customFetch,
    inspectResourceKey,
  }: LoadResourceRequestListInput,
  dependencies: Partial<typeof defaultDependencies> = {}
): Promise<LoadedResourceList | InspectedResourceList> {
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
  let inspection: PreviewResourceExchange | undefined;
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
    const resourceKey = getResourceKey(resource.data);
    const result = await resolvedDependencies.loadResource(
      providerFetch,
      resource.data,
      sourceOrigin,
      {
        signal: request.signal,
        ...(resourceKey === inspectResourceKey
          ? {
              onExchange: async (exchange) => {
                inspection = await capturePreviewResourceExchange(
                  resourceKey,
                  exchange,
                  {
                    resourceName: resource.data.name,
                    publicValues: new Set(),
                    privateValues: new Set(),
                    allowRequestBody: true,
                    allowCustomHeaders: true,
                  }
                );
              },
            }
          : {}),
      }
    );
    const separated = separateInternalPerformance(result);
    return [
      resourceKey,
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
  const resources = await Promise.all(output);
  return inspectResourceKey === undefined
    ? (resources as LoadedResourceList)
    : { resources: resources as LoadedResourceList, inspection };
}
