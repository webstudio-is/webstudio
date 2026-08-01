import {
  createAssetResourceQueryFailure,
  type AssetResourceQueryFailure,
} from "./schema";
import { sha256Hex } from "./canonical-json";
import { createRuntimeContentDatabase } from "./content-database";
import { readAssetQueryRequest } from "./request";
import type { AssetRuntimeData } from "./structured-query";
import { getAssetResourceQueryError } from "./query-error";
import { contentEngineLimits } from "./limits";
import {
  createCachedDocumentSourceLoader,
  createHttpDocumentSourceLoader,
  type CachedDocumentSource,
  type DocumentSourceCache,
  type DocumentGraphRuntimeObserver,
} from "./document-graph";
import type { ContentRuntimeArtifact } from "./content-runtime-artifact";

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
    createAssetResourceQueryFailure({ code, message, retryable, details }),
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
  artifact: ContentRuntimeArtifact;
  request: Request;
}) => {
  const body = await request.clone().text();
  const cacheControl = request.headers.get("cache-control");
  const hash = await sha256Hex(
    JSON.stringify([deploymentId, artifact.revision, body, cacheControl])
  );
  const url = new URL(request.url);
  url.searchParams.set("ws-asset-resource", hash);
  return new Request(url, { method: "GET" });
};

export const createPublishedAssetResourceFetch = ({
  deploymentId,
  artifact,
  runtimeAssets,
  cache,
  baseUrl,
  fetchDocument = globalThis.fetch,
  onDocumentGraphEvent,
}: {
  deploymentId: string;
  artifact: ContentRuntimeArtifact;
  runtimeAssets: Readonly<Record<string, AssetRuntimeData>>;
  cache?: Pick<Cache, "match" | "put">;
  baseUrl: string | URL;
  fetchDocument?: typeof fetch;
  onDocumentGraphEvent?: DocumentGraphRuntimeObserver;
}) => {
  validateRuntimeAssets({ artifact, runtimeAssets });
  const documentCache = createMemoryDocumentSourceCache();
  return createPublishedAssetResourceHandler({
    deploymentId,
    artifact,
    runtimeAssets,
    cache,
    baseUrl,
    database: createRuntimeContentDatabase({ artifact }),
    fetchDocument,
    documentCache,
    onDocumentGraphEvent,
  });
};

const createMemoryDocumentSourceCache = (): DocumentSourceCache => {
  const values = new Map<string, CachedDocumentSource>();
  const maximumBytes = contentEngineLimits.hydratedTotalBytes * 4;
  let usedBytes = 0;
  return {
    get: async (key) => {
      const value = values.get(key);
      if (value !== undefined) {
        values.delete(key);
        values.set(key, value);
      }
      return value;
    },
    set: async (key, source) => {
      if (source.bytes.byteLength > maximumBytes) {
        return;
      }
      const previous = values.get(key);
      if (previous !== undefined) {
        usedBytes -= previous.bytes.byteLength;
        values.delete(key);
      }
      values.set(key, source);
      usedBytes += source.bytes.byteLength;
      while (usedBytes > maximumBytes) {
        const oldest = values.entries().next().value;
        if (oldest === undefined) {
          break;
        }
        values.delete(oldest[0]);
        usedBytes -= oldest[1].bytes.byteLength;
      }
    },
  };
};

const createPublishedDocumentLoader = ({
  baseUrl,
  runtimeAssets,
  fetchDocument,
  cache,
  onEvent,
}: {
  baseUrl: string | URL;
  runtimeAssets: Readonly<Record<string, AssetRuntimeData>>;
  fetchDocument: typeof fetch;
  cache: DocumentSourceCache;
  onEvent?: DocumentGraphRuntimeObserver;
}) =>
  createCachedDocumentSourceLoader({
    cache,
    onEvent,
    load: createHttpDocumentSourceLoader({
      fetch: fetchDocument,
      getRequest: (node) => {
        const asset = runtimeAssets[node.id];
        if (asset === undefined) {
          throw new Error(
            `Published document URL is unavailable for ${node.id}`
          );
        }
        return new URL(asset.url, baseUrl);
      },
      getMetadata: ({ node }) => ({
        format: node.format,
        revision: node.revision,
      }),
      onEvent,
    }),
  });

const validateRuntimeAssets = ({
  artifact,
  runtimeAssets,
}: {
  artifact: ContentRuntimeArtifact;
  runtimeAssets: Readonly<Record<string, AssetRuntimeData>>;
}) => {
  const missingReferencedAssetId = Object.values(artifact.assetReferences ?? {})
    .flat()
    .map(({ assetId }) => assetId)
    .find((assetId) => runtimeAssets[assetId] === undefined);
  if (missingReferencedAssetId !== undefined) {
    throw new Error(
      `Published referenced asset URL is unavailable for ${missingReferencedAssetId}`
    );
  }
  const missingDocumentId = artifact.documentGraph?.nodes.find(
    ({ id }) => runtimeAssets[id] === undefined
  )?.id;
  if (missingDocumentId !== undefined) {
    throw new Error(
      `Published document URL is unavailable for ${missingDocumentId}`
    );
  }
  const staleDocumentId = artifact.documentGraph?.nodes.find(
    ({ id, contentRef }) => runtimeAssets[id]?.contentRef !== contentRef
  )?.id;
  if (staleDocumentId !== undefined) {
    throw new Error(
      `Published document identity does not match graph node ${staleDocumentId}`
    );
  }
};

const createPublishedAssetResourceHandler = ({
  deploymentId,
  artifact,
  runtimeAssets,
  cache,
  baseUrl,
  database,
  fetchDocument,
  documentCache,
  onDocumentGraphEvent,
}: {
  deploymentId: string;
  artifact: ContentRuntimeArtifact;
  runtimeAssets: Readonly<Record<string, AssetRuntimeData>>;
  cache?: Pick<Cache, "match" | "put">;
  baseUrl: string | URL;
  database: ReturnType<typeof createRuntimeContentDatabase>;
  fetchDocument: typeof fetch;
  documentCache: DocumentSourceCache;
  onDocumentGraphEvent?: DocumentGraphRuntimeObserver;
}) => {
  const baseOrigin = new URL(baseUrl).origin;
  const loadDocument = createPublishedDocumentLoader({
    baseUrl,
    runtimeAssets,
    fetchDocument,
    cache: documentCache,
    onEvent: onDocumentGraphEvent,
  });
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
      const response = jsonResponse(
        await database.queryWithDocumentGraph({
          request: parsedRequest,
          load: loadDocument,
          runtimeAssets,
          signal: request.signal,
          onEvent: onDocumentGraphEvent,
        })
      );
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
      const queryError = getAssetResourceQueryError(error);
      if (queryError !== undefined) {
        return failure(queryError);
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

export const createGeneratedAssetResourceRuntime = ({
  deploymentId,
  artifact,
  runtimeAssets,
  // Generated projects infer this API from bundled JavaScript.
  onDocumentGraphEvent = undefined,
}: {
  deploymentId: string;
  artifact: ContentRuntimeArtifact;
  runtimeAssets: Readonly<Record<string, AssetRuntimeData>>;
  onDocumentGraphEvent?: DocumentGraphRuntimeObserver;
}) => {
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
  validateRuntimeAssets({ artifact, runtimeAssets });
  const database = createRuntimeContentDatabase({ artifact });
  const documentCache = createMemoryDocumentSourceCache();
  return async ({
    request,
    fallback,
  }: {
    request: Request;
    fallback: typeof fetch;
  }): Promise<typeof fetch> => {
    const origin = new URL(request.url).origin;
    const fetchResource = createPublishedAssetResourceHandler({
      deploymentId,
      artifact,
      runtimeAssets,
      cache,
      baseUrl: origin,
      database,
      fetchDocument: fallback,
      documentCache,
      onDocumentGraphEvent,
    });
    return async (input, init) =>
      (await fetchResource(input, init)) ?? fallback(input, init);
  };
};
