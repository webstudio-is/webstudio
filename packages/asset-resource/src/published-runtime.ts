import {
  assetQueryRequest,
  assetResourceQueryFailure,
  type AssetResourceQueryFailure,
} from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import { assetsResourceUrl } from "@webstudio-is/sdk/runtime";
import { sha256Hex, validateStorageKey } from "@webstudio-is/project-store";
import { verifyAssetIndex } from "./asset-index";
import {
  AssetQueryExecutionError,
  executeAssetQuery,
} from "./structured-query";
import { AssetResourceHydrationError } from "./hydration";

export type PublishedAssetIndexManifest = {
  revision: string;
  assetRevision: string;
  indexPath: string;
};

export type PublishedAssetFetch = (
  path: string,
  init?: RequestInit
) => Promise<Response>;

type AssetBinding = {
  fetch: (request: Request) => Promise<Response>;
};

const parsedIndexCache = new Map<
  string,
  Promise<Awaited<ReturnType<typeof verifyAssetIndex>>>
>();

const loadIndex = ({
  deploymentId,
  manifest,
  fetchAsset,
}: {
  deploymentId: string;
  manifest: PublishedAssetIndexManifest;
  fetchAsset: PublishedAssetFetch;
}) => {
  const cacheKey = JSON.stringify([
    deploymentId,
    manifest.revision,
    manifest.indexPath,
  ]);
  let pending = parsedIndexCache.get(cacheKey);
  if (pending !== undefined) {
    parsedIndexCache.delete(cacheKey);
    parsedIndexCache.set(cacheKey, pending);
    return pending;
  }
  pending = (async () => {
    const response = await fetchAsset(manifest.indexPath);
    if (response.ok === false) {
      throw new Error("Published asset index was not found");
    }
    const index = await verifyAssetIndex(await response.json());
    if (
      index.integrity.checksum !== manifest.revision ||
      index.assetRevision !== manifest.assetRevision
    ) {
      throw new Error("Published asset index identity is invalid");
    }
    return index;
  })();
  parsedIndexCache.set(cacheKey, pending);
  pending.catch(() => {
    if (parsedIndexCache.get(cacheKey) === pending) {
      parsedIndexCache.delete(cacheKey);
    }
  });
  while (parsedIndexCache.size > assetResourceLimits.runtimeCachedIndexes) {
    const oldestKey = parsedIndexCache.keys().next().value;
    if (oldestKey === undefined) {
      break;
    }
    parsedIndexCache.delete(oldestKey);
  }
  return pending;
};

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
}: {
  code: AssetResourceQueryFailure["error"]["code"];
  message: string;
  status: number;
  retryable?: boolean;
}) =>
  jsonResponse(
    assetResourceQueryFailure.parse({
      ok: false,
      error: { code, message, retryable },
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

const encodePublicAssetPathSegment = (value: string) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );

/**
 * Asset content references are logical storage paths. Preserve their `/`
 * separators so filesystem and object-storage adapters address the same
 * hierarchy, while encoding every segment for safe use in an HTTP path.
 */
export const getPublishedAssetContentPath = (contentRef: string) => {
  validateStorageKey(contentRef);
  return `/assets/${contentRef
    .split("/")
    .map(encodePublicAssetPathSegment)
    .join("/")}`;
};

export const getPublishedAssetResourceCacheKey = async ({
  deploymentId,
  manifest,
  request,
}: {
  deploymentId: string;
  manifest: PublishedAssetIndexManifest;
  request: Request;
}) => {
  const body = await request.clone().text();
  const cacheControl = request.headers.get("cache-control");
  const hash = await sha256Hex(
    JSON.stringify([deploymentId, manifest.revision, body, cacheControl])
  );
  const url = new URL(request.url);
  url.searchParams.set("ws-asset-resource", hash);
  return new Request(url, { method: "GET" });
};

export const createPublishedAssetResourceFetch = ({
  deploymentId,
  manifest,
  fetchAsset,
  cache,
  baseUrl,
}: {
  deploymentId: string;
  manifest: PublishedAssetIndexManifest;
  fetchAsset: PublishedAssetFetch;
  cache?: Pick<Cache, "match" | "put">;
  baseUrl: string | URL;
}) => {
  const baseOrigin = new URL(baseUrl).origin;
  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response | undefined> => {
    const request = getRequest(input, baseUrl, init);
    if (
      new URL(request.url).origin !== baseOrigin ||
      new URL(request.url).pathname !== assetsResourceUrl ||
      request.method.toUpperCase() !== "POST"
    ) {
      return;
    }
    let parsedRequest;
    try {
      parsedRequest = assetQueryRequest.parse(await request.clone().json());
    } catch {
      return failure({
        code: "INVALID_REQUEST",
        message: "Asset resource request is invalid",
        status: 400,
      });
    }
    if (
      parsedRequest.indexRevision !== undefined &&
      parsedRequest.indexRevision !== manifest.revision
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
        : await getPublishedAssetResourceCacheKey({
            deploymentId,
            manifest,
            request,
          });
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
      const index = await loadIndex({ deploymentId, manifest, fetchAsset });
      const result = await executeAssetQuery({
        query: parsedRequest.query,
        documents: index.documents,
        read: async (contentRef, range) => {
          const headers = new Headers();
          if (range !== undefined && range.length > 0) {
            headers.set(
              "range",
              `bytes=${range.offset}-${range.offset + range.length - 1}`
            );
          }
          const response = await fetchAsset(
            getPublishedAssetContentPath(contentRef),
            { headers, signal: request.signal }
          );
          if (response.ok === false || response.body === null) {
            throw new Error("Selected published asset content was not found");
          }
          const contentLength = response.headers.get("content-length");
          return {
            data: response.body,
            contentLength:
              contentLength === null ? undefined : Number(contentLength),
          };
        },
      });
      const response = jsonResponse(result);
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

const getAssetBinding = (context: unknown): AssetBinding | undefined => {
  if (typeof context !== "object" || context === null) {
    return;
  }
  const cloudflare = Reflect.get(context, "cloudflare");
  if (typeof cloudflare !== "object" || cloudflare === null) {
    return;
  }
  const env = Reflect.get(cloudflare, "env");
  if (typeof env !== "object" || env === null) {
    return;
  }
  const assets = Reflect.get(env, "ASSETS");
  if (
    typeof assets === "object" &&
    assets !== null &&
    typeof Reflect.get(assets, "fetch") === "function"
  ) {
    return assets as AssetBinding;
  }
};

export const createGeneratedAssetResourceFetch = async ({
  request,
  context,
  deploymentId,
  manifest,
  fallback,
}: {
  request: Request;
  context: unknown;
  deploymentId: string;
  manifest: PublishedAssetIndexManifest;
  fallback: typeof fetch;
}): Promise<typeof fetch> => {
  const binding = getAssetBinding(context);
  const fetchAsset = (path: string, init?: RequestInit) => {
    const assetRequest = new Request(new URL(path, request.url), init);
    return binding?.fetch(assetRequest) ?? fetch(assetRequest);
  };
  const cache = await globalThis.caches
    ?.open(`webstudio-assets-${deploymentId}`)
    .catch(() => undefined);
  const fetchResource = createPublishedAssetResourceFetch({
    deploymentId,
    manifest,
    fetchAsset,
    cache,
    baseUrl: request.url,
  });
  return async (input, init) =>
    (await fetchResource(input, init)) ?? fallback(input, init);
};

export const __testing = {
  clearParsedIndexCache: () => parsedIndexCache.clear(),
  getParsedIndexCacheSize: () => parsedIndexCache.size,
};
