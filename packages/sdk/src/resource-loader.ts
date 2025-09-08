import hash from "@emotion/hash";
import type { ResourceRequest } from "./schema/resources";
import { serializeValue } from "./to-string";

const LOCAL_RESOURCE_PREFIX = "$resources";

/**
 * Prevents fetch cycles by prefixing local resources.
 */
export const isLocalResource = (pathname: string, resourceName?: string) => {
  const segments = pathname.split("/").filter(Boolean);

  if (resourceName === undefined) {
    return segments[0] === LOCAL_RESOURCE_PREFIX;
  }

  return segments.join("/") === `${LOCAL_RESOURCE_PREFIX}/${resourceName}`;
};

export const sitemapResourceUrl = `/${LOCAL_RESOURCE_PREFIX}/sitemap.xml`;

export const loadResource = async (
  customFetch: typeof fetch,
  resourceRequest: ResourceRequest
) => {
  try {
    const { method, searchParams, headers, body } = resourceRequest;
    let href = resourceRequest.url;
    try {
      // cloudflare workers fail when fetching url contains spaces
      // even though new URL suppose to trim them on parsing by spec
      const url = new URL(resourceRequest.url.trim());
      if (searchParams) {
        for (const { name, value } of searchParams) {
          url.searchParams.append(name, serializeValue(value));
        }
      }
      href = url.href;
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
      console.error(
        `Failed to load resource: ${href} - ${response.status}: ${JSON.stringify(data).slice(0, 300)}`
      );
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
    };
  } catch (error) {
    console.error(error);
    const message = (error as unknown as Error).message;
    return {
      ok: false,
      data: undefined,
      status: 500,
      statusText: message,
    };
  }
};

export const loadResources = async (
  customFetch: typeof fetch,
  requests: Map<string, ResourceRequest>
) => {
  return Object.fromEntries(
    await Promise.all(
      Array.from(
        requests,
        async ([name, request]) =>
          [name, await loadResource(customFetch, request)] as const
      )
    )
  );
};

/**
 * cache api supports only get method
 * put hash of method and body into url
 * to support for example graphql queries
 */
const getCacheKey = async (request: Request) => {
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
    const cacheKey = await getCacheKey(request);
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
