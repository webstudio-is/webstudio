import { type ResourceRequest, resourceRequest } from "@webstudio-is/sdk";
import { isLocalResource, loadResource } from "@webstudio-is/sdk/runtime";
import { executeAssetQueries } from "~/shared/$resources/assets-query.server";
import { getResourceKey } from "~/shared/resource-utils";

const createAssetQueryBatchProvider = ({
  request,
  execute,
}: {
  request: Request;
  execute: typeof executeAssetQueries;
}) => {
  const pending: Array<{
    request: Request;
    resolve: (response: Response) => void;
    reject: (error: unknown) => void;
  }> = [];
  let didFlush = false;
  return {
    fetch: (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> | undefined => {
      if (
        didFlush ||
        typeof input !== "string" ||
        isLocalResource(input, "assets") === false
      ) {
        return;
      }
      return new Promise<Response>((resolve, reject) => {
        pending.push({
          request: new Request(new URL(input, request.url), init),
          resolve,
          reject,
        });
      });
    },
    flush: async () => {
      didFlush = true;
      if (pending.length === 0) {
        return;
      }
      try {
        const responses = await execute({
          request,
          resourceRequests: pending.map(({ request }) => request),
        });
        if (responses.length !== pending.length) {
          throw new Error(
            "Assets batch response count does not match requests"
          );
        }
        for (const [index, response] of responses.entries()) {
          pending[index].resolve(response);
        }
      } catch (error) {
        for (const item of pending) {
          item.reject(error);
        }
      }
    },
  };
};

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
    : createAssetQueryBatchProvider({
        request,
        execute: dependencies.executeAssetQueries,
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
