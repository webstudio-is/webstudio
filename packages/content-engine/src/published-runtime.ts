import {
  assetResourceQueryFailure,
  type ContentArtifactV1,
  type AssetResourceQueryFailure,
} from "./schema";
import { sha256Hex } from "@webstudio-is/project-store";
import { AssetQueryExecutionError } from "./structured-query";
import { createContentDatabase } from "./content-database";
import { AssetResourceHydrationError } from "./hydration";
import { readAssetQueryRequest } from "./request";

const assetsResourceUrl = "/$resources/assets";

const jsonResponse = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const failure = ({
  code,
  message,
  status,
  retryable = false,
  details,
}: {
  code: AssetResourceQueryFailure["error"]["code"];
  message: string;
  status: number;
  retryable?: boolean;
  details?: Record<string, string | number>;
}) =>
  jsonResponse(
    assetResourceQueryFailure.parse({
      ok: false,
      error: { code, message, retryable, details },
    }),
    status
  );

const getRequest = (
  input: RequestInfo | URL,
  baseUrl: string | URL,
  init?: RequestInit
) =>
  typeof input === "string" || input instanceof URL
    ? new Request(new URL(input, baseUrl), init)
    : new Request(input, init);

const getCacheKey = async ({
  deploymentId,
  artifact,
  request,
}: {
  deploymentId: string;
  artifact: ContentArtifactV1;
  request: Request;
}) => {
  const body = await request.clone().text();
  const cacheControl = request.headers.get("cache-control");
  const hash = await sha256Hex(
    JSON.stringify([
      deploymentId,
      artifact.integrity.checksum,
      body,
      cacheControl,
    ])
  );
  const url = new URL(request.url);
  url.searchParams.set("ws-asset-resource", hash);
  return new Request(url, { method: "GET" });
};

export const createPublishedAssetResourceFetch = ({
  deploymentId,
  artifact,
  cache,
  baseUrl,
}: {
  deploymentId: string;
  artifact: ContentArtifactV1;
  cache?: Pick<Cache, "match" | "put">;
  baseUrl: string | URL;
}) => {
  const baseOrigin = new URL(baseUrl).origin;
  const database = createContentDatabase({ artifact });
  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response | undefined> => {
    const request = getRequest(input, baseUrl, init);
    const url = new URL(request.url);
    if (
      url.origin !== baseOrigin ||
      url.pathname !== assetsResourceUrl ||
      request.method.toUpperCase() !== "POST"
    ) {
      return;
    }
    let parsedRequest;
    try {
      parsedRequest = await readAssetQueryRequest(request.clone());
    } catch {
      return failure({
        code: "INVALID_REQUEST",
        message: "Asset resource request is invalid",
        status: 400,
      });
    }
    if (
      parsedRequest.indexRevision !== undefined &&
      parsedRequest.indexRevision !== artifact.integrity.checksum
    ) {
      return failure({
        code: "STALE_INDEX",
        message: "The requested asset index revision is stale",
        status: 409,
      });
    }
    const cacheKey =
      cache === undefined || request.headers.has("cache-control") === false
        ? undefined
        : await getCacheKey({ deploymentId, artifact, request });
    if (cacheKey !== undefined && cache !== undefined) {
      const cached = await cache.match(cacheKey).catch(() => undefined);
      if (cached !== undefined) {
        return new Response(cached.body, cached);
      }
    }
    try {
      if (request.signal.aborted) {
        return failure({
          code: "REQUEST_CANCELLED",
          message: "Published asset query was cancelled",
          status: 499,
        });
      }
      const response = jsonResponse(await database.query(parsedRequest));
      if (
        cacheKey !== undefined &&
        cache !== undefined &&
        request.signal.aborted === false
      ) {
        response.headers.set(
          "cache-control",
          request.headers.get("cache-control") as string
        );
        await cache.put(cacheKey, response.clone()).catch(() => undefined);
      }
      return response;
    } catch (error) {
      if (request.signal.aborted) {
        return failure({
          code: "REQUEST_CANCELLED",
          message: "Published asset query was cancelled",
          status: 499,
        });
      }
      if (
        error instanceof AssetQueryExecutionError ||
        error instanceof AssetResourceHydrationError
      ) {
        return failure({
          code:
            error instanceof AssetResourceHydrationError
              ? error.code
              : "INVALID_REQUEST",
          message: error.message,
          details:
            error instanceof AssetResourceHydrationError
              ? error.details
              : undefined,
          status: 400,
        });
      }
      return failure({
        code: "INTERNAL_ERROR",
        message: "Published asset query failed",
        status: 500,
        retryable: true,
      });
    }
  };
};

export const createGeneratedAssetResourceFetch = async ({
  request,
  deploymentId,
  artifact,
  fallback,
}: {
  request: Request;
  deploymentId: string;
  artifact: ContentArtifactV1;
  fallback: typeof fetch;
}): Promise<typeof fetch> => {
  const cacheStorage = globalThis.caches;
  let cachePromise: Promise<Cache> | undefined;
  const getCache = () => {
    cachePromise ??= cacheStorage.open(`webstudio-assets-${deploymentId}`);
    return cachePromise;
  };
  const cache =
    cacheStorage === undefined
      ? undefined
      : {
          match: async (key: Request) => (await getCache()).match(key),
          put: async (key: Request, response: Response) =>
            (await getCache()).put(key, response),
        };
  const fetchResource = createPublishedAssetResourceFetch({
    deploymentId,
    artifact,
    cache,
    baseUrl: request.url,
  });
  return async (input, init) =>
    (await fetchResource(input, init)) ?? fallback(input, init);
};
