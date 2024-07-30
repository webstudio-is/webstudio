import type { ResourceRequest } from "./schema/resources";

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
    let data;
    if (
      response.ok &&
      // accept json by default and when specified explicitly
      (response.headers.has("content-type") === false ||
        response.headers.get("content-type")?.includes("application/json"))
    ) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    return {
      ok: response.ok,
      data,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error) {
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
