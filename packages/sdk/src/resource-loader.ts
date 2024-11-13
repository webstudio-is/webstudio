import type { ResourceRequest } from "./schema/resources";

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
  const { url, method, headers, body } = resourceRequest;
  const requestHeaders = new Headers(
    headers.map(({ name, value }): [string, string] => [name, value])
  );
  const requestInit: RequestInit = {
    method,
    headers: requestHeaders,
  };
  if (method !== "get" && body !== undefined) {
    if (typeof body === "string") {
      requestInit.body = body;
    }
    if (typeof body === "object") {
      requestInit.body = JSON.stringify(body);
    }
  }
  try {
    // cloudflare workers fail when fetching url contains spaces
    // even though new URL suppose to trim them on parsing by spec
    const response = await customFetch(url.trim(), requestInit);

    let data = await response.text();

    try {
      // If it looks like JSON and quacks like JSON, then it probably is JSON.
      data = JSON.parse(data);
    } catch {
      // ignore, leave data as text
    }

    if (!response.ok) {
      console.error(
        `Failed to load resource: ${url} - ${response.status}: ${JSON.stringify(data).slice(0, 300)}`
      );
    }

    return {
      ok: response.ok,
      data,
      status: response.status,
      statusText: response.statusText,
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
