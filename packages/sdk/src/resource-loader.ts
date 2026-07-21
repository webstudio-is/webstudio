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
export const assetsQueryResourceUrl = `/${LOCAL_RESOURCE_PREFIX}/assets/query`;
export const assetsFieldCatalogResourceUrl = `/${LOCAL_RESOURCE_PREFIX}/assets/field-catalog`;
export const assetsIndexStatusResourceUrl = `/${LOCAL_RESOURCE_PREFIX}/assets/index-status`;
export const assetResourceIdHeader = "x-webstudio-resource-id";

export type ResourceLoadOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
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
    if (
      resourceRequest.resourceId !== undefined &&
      resourceRequest.control === "system" &&
      isLocalResource(href, "assets/query")
    ) {
      requestHeaders.set(assetResourceIdHeader, resourceRequest.resourceId);
    }
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

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
    };
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
