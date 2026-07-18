import {
  assetResourceQueryFailure,
  assetResourceQueryRequest,
  type AssetResourceQueryFailure,
  type AssetResourceQuerySuccess,
} from "@webstudio-is/sdk";
import { assetsQueryResourceUrl } from "@webstudio-is/sdk/runtime";
import {
  AssetResourceQueryExecutionError,
  computeAssetResourceQueryHash,
  executeAssetResourceQuery,
} from "./index";
import {
  AssetResourceHydrationError,
  hydrateAssetResourceResult,
} from "./hydration";
import { verifyAssetResourceIndex } from "./resource-index";

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

const parsedIndexCache = new Map<
  string,
  Promise<Awaited<ReturnType<typeof verifyAssetResourceIndex>>>
>();

const loadIndex = ({
  entry,
  fetchAsset,
}: {
  entry: PublishedAssetResourceManifestEntry;
  fetchAsset: PublishedAssetFetch;
}) => {
  let pending = parsedIndexCache.get(entry.indexPath);
  if (pending === undefined) {
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
    parsedIndexCache.set(entry.indexPath, pending);
    pending.catch(() => parsedIndexCache.delete(entry.indexPath));
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

const getRequest = (input: RequestInfo | URL, init?: RequestInit) =>
  input instanceof Request
    ? new Request(input, init)
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
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      `${deploymentId}\n${entry.resourceId}\n${entry.revision}\n${body}`
    )
  );
  const hash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  const url = new URL(request.url);
  url.searchParams.set("ws-asset-resource", hash);
  return new Request(url, { method: "GET" });
};

export const createPublishedAssetResourceFetch = ({
  deploymentId,
  manifest,
  fetchAsset,
  cache,
}: {
  deploymentId: string;
  manifest: readonly PublishedAssetResourceManifestEntry[];
  fetchAsset: PublishedAssetFetch;
  cache?: Pick<Cache, "match" | "put">;
}) => {
  const entriesByQueryHash = new Map(
    manifest.map((entry) => [entry.queryHash, entry])
  );
  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response | undefined> => {
    const request = getRequest(input, init);
    if (
      new URL(request.url).pathname !== assetsQueryResourceUrl ||
      request.method.toUpperCase() !== "POST"
    ) {
      return;
    }
    let parsedRequest;
    try {
      parsedRequest = assetResourceQueryRequest.parse(await request.json());
    } catch {
      return failure({
        code: "INVALID_REQUEST",
        message: "Asset resource request is invalid",
        status: 400,
      });
    }
    const queryHash = await computeAssetResourceQueryHash(parsedRequest.query);
    const entry = entriesByQueryHash.get(queryHash);
    if (entry === undefined) {
      return failure({
        code: "INDEX_NOT_FOUND",
        message: "No published index matches this asset resource query",
        status: 404,
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
      const cached = await selectedCache?.match(cacheKey);
      if (cached !== undefined) {
        return new Response(cached.body, cached);
      }
    }

    try {
      const index = await loadIndex({ entry, fetchAsset });
      const response = await executeAssetResourceQuery({
        request: parsedRequest,
        documents: index.documents,
        queryHash: index.queryHash,
        indexRevision: entry.revision,
        assetRevision: index.assetRevision,
      });
      const hydration = await hydrateAssetResourceResult({
        result: response.result,
        documents: index.documents,
        options: parsedRequest.content,
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
            { headers }
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
      const result: AssetResourceQuerySuccess = {
        ...response,
        content: hydration.content,
        meta: {
          ...response.meta,
          hydratedFileCount: hydration.hydratedFileCount,
          hydratedBytes: hydration.hydratedBytes,
        },
      };
      const resultResponse = jsonResponse(result);
      if (cacheKey !== undefined) {
        resultResponse.headers.set(
          "cache-control",
          request.headers.get("cache-control") as string
        );
        await cache?.put(cacheKey, resultResponse.clone());
      }
      return resultResponse;
    } catch (error) {
      if (
        error instanceof AssetResourceQueryExecutionError ||
        error instanceof AssetResourceHydrationError
      ) {
        return failure({
          code: error.code,
          message: error.message,
          status: error.code === "PROTECTED_CONTENT" ? 403 : 400,
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

export const __testing = {
  clearParsedIndexCache: () => parsedIndexCache.clear(),
};
