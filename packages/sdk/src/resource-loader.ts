import hash from "@emotion/hash";
import type { ResourceRequest } from "./schema/resources";
import { serializeValue } from "./to-string";

const LOCAL_RESOURCE_PREFIX = "$resources";

/**
 * Prevents fetch cycles by prefixing local resources.
 */
export const isLocalResource = (pathname: string, resourceName?: string) => {
  const pathEnd = [pathname.indexOf("?"), pathname.indexOf("#")]
    .filter((index) => index !== -1)
    .reduce((first, index) => Math.min(first, index), pathname.length);
  const path = pathname.slice(0, pathEnd);
  if (path.startsWith("//")) {
    return false;
  }
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const segments = normalizedPath.split("/");

  if (resourceName === undefined) {
    return segments[0] === LOCAL_RESOURCE_PREFIX;
  }

  return segments.join("/") === `${LOCAL_RESOURCE_PREFIX}/${resourceName}`;
};

export const sitemapResourceUrl = `/${LOCAL_RESOURCE_PREFIX}/sitemap.xml`;
export const currentDateResourceUrl = `/${LOCAL_RESOURCE_PREFIX}/current-date`;
export const assetsResourceUrl = `/${LOCAL_RESOURCE_PREFIX}/assets`;

// Direct HTTP endpoints described by the Assets OpenAPI document. These are
// separate from the virtual System resource URLs above, which are resolved
// only inside Builder's batched resource loader.
export const assetsApiUrl = "/rest/assets";
export const assetsUploadsApiUrl = `${assetsApiUrl}/uploads`;
export const assetsFoldersApiUrl = `${assetsApiUrl}/folders`;
export const getAssetUploadApiUrl = (name: string) =>
  `${assetsUploadsApiUrl}/${encodeURIComponent(name)}`;
export const getAssetContentApiUrl = (assetId: string) =>
  `${assetsApiUrl}/${encodeURIComponent(assetId)}/content`;
export const getAssetApiUrl = (assetId: string) =>
  `${assetsApiUrl}/${encodeURIComponent(assetId)}`;
export const getAssetFolderApiUrl = (folderId: string) =>
  `${assetsFoldersApiUrl}/${encodeURIComponent(folderId)}`;
export const assetsQueryApiUrl = `${assetsApiUrl}/query`;
export const assetsIndexRefreshApiUrl = `${assetsApiUrl}/index/refresh`;
export const assetsFieldCatalogApiUrl = `${assetsApiUrl}/field-catalog`;
export const assetsOpenApiUrl = `${assetsApiUrl}/openapi.json`;
export const assetsQuerySchemaApiUrl = `${assetsApiUrl}/query-schema.json`;

export type ResourceLoadOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export const createResourceFetchBatchProvider = ({
  baseUrl,
  shouldBatch,
  execute,
}: {
  baseUrl: string | URL;
  shouldBatch: (input: RequestInfo | URL, init?: RequestInit) => boolean;
  execute: (requests: readonly Request[]) => Promise<readonly Response[]>;
}) => {
  const pending: Array<{
    request: Request;
    resolve: (response: Response) => void;
    reject: (error: unknown) => void;
  }> = [];
  let didFlush = false;
  let flushPromise: Promise<void> | undefined;

  return {
    fetch: (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> | undefined => {
      if (didFlush || shouldBatch(input, init) === false) {
        return;
      }
      const request =
        typeof input === "string"
          ? new Request(new URL(input, baseUrl), init)
          : new Request(input, init);
      return new Promise<Response>((resolve, reject) => {
        pending.push({ request, resolve, reject });
      });
    },
    flush: () => {
      if (flushPromise !== undefined) {
        return flushPromise;
      }
      didFlush = true;
      const batch = pending.splice(0);
      flushPromise = Promise.resolve().then(async () => {
        if (batch.length === 0) {
          return;
        }
        try {
          const responses = await execute(batch.map(({ request }) => request));
          if (responses.length !== batch.length) {
            throw new Error(
              "Resource batch response count does not match requests"
            );
          }
          for (const [index, response] of responses.entries()) {
            batch[index].resolve(response);
          }
        } catch (error) {
          for (const item of batch) {
            item.reject(error);
          }
        }
      });
      return flushPromise;
    },
  };
};

export const isAssetsResourceRequest = (request: ResourceRequest) =>
  request.method === "post" && isLocalResource(request.url, "assets");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && Array.isArray(value) === false;

// Assets expose one ID-keyed resource contract. Query execution uses an array
// internally for ordering and pagination.
const includesAssetId = (body: unknown) => {
  if (isRecord(body) === false || isRecord(body.query) === false) {
    return false;
  }
  const { output } = body.query;
  if (isRecord(output) === false) {
    return false;
  }
  if (output.includeMetadata === true) {
    return true;
  }
  return (
    output.mode === "fields" &&
    Array.isArray(output.fields) &&
    output.fields.some(
      (field) => Array.isArray(field) && field.length === 1 && field[0] === "id"
    )
  );
};

const formatAssetsResourceResult = (value: unknown, body: unknown) => {
  const preview =
    isRecord(value) && isRecord(value.data) ? value.data : undefined;
  const collection = preview ?? value;
  const resultMode =
    isRecord(body) &&
    isRecord(body.query) &&
    typeof body.query.result === "string"
      ? body.query.result
      : "many";
  const diagnostics = isRecord(value) ? value.__diagnostics__ : undefined;
  const performance = isRecord(value) ? value.__performance__ : undefined;
  const internalMetadata = {
    ...(preview === undefined || diagnostics === undefined
      ? {}
      : { __diagnostics__: diagnostics }),
    ...(performance === undefined ? {} : { __performance__: performance }),
  };
  if (
    resultMode !== "many" &&
    isRecord(collection) &&
    Object.hasOwn(collection, "item") &&
    (collection.item === null || isRecord(collection.item)) &&
    typeof collection.totalCount === "number"
  ) {
    return {
      data: collection.item,
      meta: { totalCount: collection.totalCount },
      ...internalMetadata,
    };
  }
  if (
    isRecord(collection) === false ||
    Array.isArray(collection.items) === false ||
    typeof collection.totalCount !== "number" ||
    typeof collection.hasMore !== "boolean"
  ) {
    return;
  }
  const includeId = includesAssetId(body);
  const entries: Array<[string, Record<string, unknown>]> = [];
  for (const item of collection.items) {
    if (isRecord(item) === false || typeof item.id !== "string") {
      return;
    }
    const { id, ...fields } = item;
    entries.push([id, includeId ? item : fields]);
  }
  return {
    data: Object.fromEntries(entries),
    meta: {
      totalCount: collection.totalCount,
      hasMore: collection.hasMore,
    },
    ...internalMetadata,
  };
};

const transportFailure = ({
  code,
  message,
  retryable,
  status,
}: {
  code: "REQUEST_CANCELLED" | "REQUEST_TIMEOUT" | "NETWORK_ERROR";
  message: string;
  retryable: boolean;
  status: number;
}) => ({
  ok: false,
  data: { ok: false, error: { code, message, retryable } },
  status,
  statusText: message,
});

export const loadResource = async (
  customFetch: typeof fetch,
  resourceRequest: ResourceRequest,
  baseUrl?: string | URL,
  options: ResourceLoadOptions = {}
) => {
  const controller = new AbortController();
  let didTimeout = false;
  const cancel = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) {
    cancel();
  } else {
    options.signal?.addEventListener("abort", cancel, { once: true });
  }
  const timeoutId =
    options.timeoutMs === undefined
      ? undefined
      : setTimeout(() => {
          didTimeout = true;
          controller.abort();
        }, options.timeoutMs);

  try {
    const { method, searchParams, headers, body } = resourceRequest;
    let href = resourceRequest.url;
    try {
      // cloudflare workers fail when fetching url contains spaces
      // even though new URL suppose to trim them on parsing by spec
      const sourceUrl = resourceRequest.url.trim();
      const local = isLocalResource(sourceUrl);
      const resolutionBase = local
        ? new URL("https://webstudio.local")
        : baseUrl === undefined
          ? undefined
          : new URL("/", baseUrl);
      const url = new URL(sourceUrl, resolutionBase);
      if (searchParams) {
        for (const { name, value } of searchParams) {
          url.searchParams.append(name, serializeValue(value));
        }
      }
      href = local ? `${url.pathname}${url.search}` : url.href;
    } catch {
      // empty block
    }
    const requestHeaders = new Headers(
      headers.map(({ name, value }): [string, string] => [
        name,
        serializeValue(value),
      ])
    );
    const requestInit: RequestInit = {
      method,
      headers: requestHeaders,
    };
    if (options.signal !== undefined || options.timeoutMs !== undefined) {
      requestInit.signal = controller.signal;
    }
    if (method !== "get" && body !== undefined) {
      requestInit.body = serializeValue(body);
    }
    const response = await customFetch(href, requestInit);

    let data = await response.text();

    try {
      // If it looks like JSON and quacks like JSON, then it probably is JSON.
      data = JSON.parse(data);
    } catch {
      // ignore, leave data as text
    }

    if (!response.ok) {
      console.error(`Failed to load resource request: ${response.status}`);
    }

    const result = {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
    };
    if (response.ok && isAssetsResourceRequest(resourceRequest)) {
      const formatted = formatAssetsResourceResult(data, resourceRequest.body);
      if (formatted !== undefined) {
        return { ...result, ...formatted };
      }
    }
    return result;
  } catch (error) {
    if (didTimeout) {
      return transportFailure({
        code: "REQUEST_TIMEOUT",
        message: `Resource request exceeded ${options.timeoutMs}ms`,
        retryable: true,
        status: 504,
      });
    }
    if (options.signal?.aborted) {
      return transportFailure({
        code: "REQUEST_CANCELLED",
        message: "Resource request was cancelled",
        retryable: false,
        status: 499,
      });
    }
    console.error("Resource request failed");
    return transportFailure({
      code: "NETWORK_ERROR",
      message: "Resource request failed",
      retryable: true,
      status: 502,
    });
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    options.signal?.removeEventListener("abort", cancel);
  }
};

export const loadResources = async (
  customFetch: typeof fetch,
  requests: Map<string, ResourceRequest>,
  baseUrl?: string | URL,
  options?: ResourceLoadOptions
) => {
  return Object.fromEntries(
    await Promise.all(
      Array.from(
        requests,
        async ([name, request]) =>
          [
            name,
            await loadResource(customFetch, request, baseUrl, options),
          ] as const
      )
    )
  );
};

/**
 * cache api supports only get method
 * put hash of method and body into url
 * to support for example graphql queries
 */
export const getResourceCacheKey = async (request: Request) => {
  const url = new URL(request.url);
  const method = request.method;
  const body = await request.clone().text();
  // invalidate cache when cache-control is changed
  const cacheControl = request.headers.get("Cache-Control");
  const resourceHash = hash(`${method}:${body}:${cacheControl}`);
  url.searchParams.set("ws-resource-hash", resourceHash);
  return url;
};

export const cachedFetch = async (
  namespace: string,
  input: RequestInfo | URL,
  init?: RequestInit
) => {
  if (globalThis.caches) {
    const request = new Request(input, init);
    const requestCacheControl = request.headers.get("Cache-Control");
    // make cache opt in with cache-control header
    if (!requestCacheControl) {
      return fetch(input, init);
    }
    const cache = await caches.open(namespace);
    const cacheKey = await getResourceCacheKey(request);
    let response = await cache.match(cacheKey);
    if (response) {
      // avoid mutating cached response
      return new Response(response.body, response);
    }
    // load response when missing in cache
    response = await fetch(request);
    // avoid caching failed responses
    if (!response.ok) {
      return response;
    }
    // put Cache-Control from request into response
    // https://developers.cloudflare.com/workers/reference/how-the-cache-works/#cache-api
    // response.clone() does not remove read-only constraint from headers
    response = new Response(response.body, response);
    response.headers.set("Cache-Control", requestCacheControl);
    // avoid mutating cached response
    await cache.put(cacheKey, response.clone());
    return response;
  }
  return fetch(input, init);
};
