import {
  assetResourceLimits,
  assetResourceQueryFailure,
  assetResourceQueryRequest,
  type AssetResourceQueryFailure,
} from "@webstudio-is/sdk";
import {
  assetResourceIdHeader,
  assetsQueryResourceUrl,
} from "@webstudio-is/sdk/runtime";
import {
  AssetResourceQueryExecutionError,
  executeAndHydrateAssetResourceQuery,
} from "./query-execution";
import { computeAssetResourceQueryHash } from "./resource-index";
import { AssetResourceHydrationError } from "./hydration";
import { verifyAssetResourceIndex } from "./resource-index";
import { sha256Hex } from "./sha256";

export type PublishedAssetResourceManifestEntry = {
  resourceId: string;
  revision: string;
  queryHash: string;
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
  Promise<Awaited<ReturnType<typeof verifyAssetResourceIndex>>>
>();

const getParsedIndexCacheKey = ({
  deploymentId,
  entry,
}: {
  deploymentId: string;
  entry: PublishedAssetResourceManifestEntry;
}) =>
  `${deploymentId}\n${entry.resourceId}\n${entry.revision}\n${entry.indexPath}`;

const loadIndex = ({
  deploymentId,
  entry,
  fetchAsset,
}: {
  deploymentId: string;
  entry: PublishedAssetResourceManifestEntry;
  fetchAsset: PublishedAssetFetch;
}) => {
  const cacheKey = getParsedIndexCacheKey({ deploymentId, entry });
  let pending = parsedIndexCache.get(cacheKey);
  if (pending !== undefined) {
    // Map insertion order doubles as the least-recently-used order.
    parsedIndexCache.delete(cacheKey);
    parsedIndexCache.set(cacheKey, pending);
  } else {
    pending = (async () => {
      const response = await fetchAsset(entry.indexPath);
      if (response.ok === false) {
        throw new Error("Published asset resource index was not found");
      }
      const index = await verifyAssetResourceIndex(await response.json());
      if (
        index.resourceId !== entry.resourceId ||
        index.integrity.checksum !== entry.revision ||
        index.queryHash !== entry.queryHash ||
        index.assetRevision !== entry.assetRevision
      ) {
        throw new Error("Published asset resource index identity is invalid");
      }
      return index;
    })();
    parsedIndexCache.set(cacheKey, pending);
    pending.catch(() => parsedIndexCache.delete(cacheKey));
    while (parsedIndexCache.size > assetResourceLimits.runtimeCachedIndexes) {
      const oldestKey = parsedIndexCache.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      parsedIndexCache.delete(oldestKey);
    }
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

export const getPublishedAssetResourceCacheKey = async ({
  deploymentId,
  entry,
  request,
}: {
  deploymentId: string;
  entry: PublishedAssetResourceManifestEntry;
  request: Request;
}) => {
  const body = await request.clone().text();
  const cacheControl = request.headers.get("cache-control");
  const hash = await sha256Hex(
    `${deploymentId}\n${entry.resourceId}\n${entry.revision}\n${body}\n${cacheControl}`
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
  manifest: readonly PublishedAssetResourceManifestEntry[];
  fetchAsset: PublishedAssetFetch;
  cache?: Pick<Cache, "match" | "put">;
  baseUrl: string | URL;
}) => {
  const baseOrigin = new URL(baseUrl).origin;
  const entriesByQueryHash = new Map<
    string,
    PublishedAssetResourceManifestEntry[]
  >();
  for (const entry of manifest) {
    const entries = entriesByQueryHash.get(entry.queryHash) ?? [];
    entries.push(entry);
    entriesByQueryHash.set(entry.queryHash, entries);
  }
  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response | undefined> => {
    const request = getRequest(input, baseUrl, init);
    if (new URL(request.url).origin !== baseOrigin) {
      return;
    }
    if (
      new URL(request.url).pathname !== assetsQueryResourceUrl ||
      request.method.toUpperCase() !== "POST"
    ) {
      return;
    }
    let parsedRequest;
    try {
      parsedRequest = assetResourceQueryRequest.parse(
        await request.clone().json()
      );
    } catch {
      return failure({
        code: "INVALID_REQUEST",
        message: "Asset resource request is invalid",
        status: 400,
      });
    }
    const queryHash = await computeAssetResourceQueryHash(parsedRequest.query);
    const matchingEntries = entriesByQueryHash.get(queryHash) ?? [];
    const resourceId = request.headers.get(assetResourceIdHeader);
    const entry =
      resourceId === null
        ? matchingEntries.length === 1
          ? matchingEntries[0]
          : undefined
        : matchingEntries.find((entry) => entry.resourceId === resourceId);
    if (entry === undefined) {
      return failure({
        code:
          resourceId === null && matchingEntries.length > 1
            ? "INVALID_REQUEST"
            : "INDEX_NOT_FOUND",
        message:
          resourceId === null && matchingEntries.length > 1
            ? "Asset resource identity is required for this query"
            : "No published index matches this asset resource query",
        status: resourceId === null && matchingEntries.length > 1 ? 400 : 404,
      });
    }
    if (
      parsedRequest.indexRevision !== undefined &&
      parsedRequest.indexRevision !== entry.revision
    ) {
      return failure({
        code: "STALE_INDEX",
        message: "The requested asset resource index revision is stale",
        status: 409,
      });
    }
    const selectedCache = cache;
    const cacheKey =
      selectedCache === undefined ||
      request.headers.has("cache-control") === false
        ? undefined
        : await getPublishedAssetResourceCacheKey({
            deploymentId,
            entry,
            request,
          });
    if (cacheKey !== undefined) {
      const cached = await selectedCache
        ?.match(cacheKey)
        .catch(() => undefined);
      if (cached !== undefined) {
        return new Response(cached.body, cached);
      }
    }

    try {
      if (request.signal.aborted) {
        return failure({
          code: "REQUEST_CANCELLED",
          message: "Published asset resource query was cancelled",
          status: 499,
        });
      }
      const index = await loadIndex({ deploymentId, entry, fetchAsset });
      if (request.signal.aborted) {
        return failure({
          code: "REQUEST_CANCELLED",
          message: "Published asset resource query was cancelled",
          status: 499,
        });
      }
      const result = await executeAndHydrateAssetResourceQuery({
        request: parsedRequest,
        documents: index.documents,
        queryHash: index.queryHash,
        indexRevision: entry.revision,
        assetRevision: index.assetRevision,
        read: async (contentRef, range) => {
          const headers = new Headers();
          if (range !== undefined && range.length > 0) {
            headers.set(
              "range",
              `bytes=${range.offset}-${range.offset + range.length - 1}`
            );
          }
          const assetResponse = await fetchAsset(
            `/assets/${encodeURIComponent(contentRef)}`,
            { headers, signal: request.signal }
          );
          if (assetResponse.ok === false || assetResponse.body === null) {
            throw new Error("Selected published asset content was not found");
          }
          const contentLength = assetResponse.headers.get("content-length");
          return {
            data: assetResponse.body,
            contentLength:
              contentLength === null ? undefined : Number(contentLength),
          };
        },
      });
      const resultResponse = jsonResponse(result);
      if (cacheKey !== undefined && request.signal.aborted === false) {
        resultResponse.headers.set(
          "cache-control",
          request.headers.get("cache-control") as string
        );
        await cache
          ?.put(cacheKey, resultResponse.clone())
          .catch(() => undefined);
      }
      return resultResponse;
    } catch (error) {
      if (request.signal.aborted) {
        return failure({
          code: "REQUEST_CANCELLED",
          message: "Published asset resource query was cancelled",
          status: 499,
        });
      }
      if (
        error instanceof AssetResourceQueryExecutionError ||
        error instanceof AssetResourceHydrationError
      ) {
        return failure({
          code: error.code,
          message: error.message,
          status: 400,
        });
      }
      return failure({
        code: "INTERNAL_ERROR",
        message: "Published asset resource query failed",
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
  manifest: readonly PublishedAssetResourceManifestEntry[];
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
