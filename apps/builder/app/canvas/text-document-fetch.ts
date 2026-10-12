import {
  getPagePath,
  normalizeStringExpression,
  SYSTEM_VARIABLE_ID,
  type DataSources,
  type Pages,
  type ResourceRequest,
  type Resources,
} from "@webstudio-is/sdk";
import { computeExpression } from "@webstudio-is/project-build/runtime";
import { matchPathnameRoutes } from "@webstudio-is/wsauth";
import { toWebstudioParams } from "@webstudio-is/react-sdk";
import { computeResourceRequest } from "~/shared/resources";

const withFetchMetadata = (
  response: Response,
  metadata: {
    url: string;
    redirected: boolean;
    type: ResponseType;
  }
): Response => {
  const clone = response.clone.bind(response);
  Object.defineProperties(response, {
    url: { value: metadata.url },
    redirected: { value: metadata.redirected },
    type: { value: metadata.type },
    clone: {
      value: () => withFetchMetadata(clone(), metadata),
    },
  });
  return response;
};

export const createCanvasTextDocumentFetch = ({
  fetch,
  getBaseUrl,
  getData,
  loadResource,
}: {
  fetch: typeof globalThis.fetch;
  getBaseUrl: () => string;
  getData: () => {
    pages: Pages | undefined;
    dataSources: DataSources;
    resources: Resources;
  };
  loadResource: (
    request: ResourceRequest,
    signal: AbortSignal
  ) => Promise<unknown>;
}): typeof globalThis.fetch => {
  const fetchNative = async ({
    input,
    init,
    url,
    redirects,
  }: {
    input: RequestInfo | URL;
    init: RequestInit | undefined;
    url: URL;
    redirects: number;
  }) => {
    const response = await fetch(input, init);
    if (
      redirects === 0 ||
      response.type === "opaque" ||
      response.type === "opaqueredirect" ||
      response.type === "error"
    ) {
      return response;
    }
    return withFetchMetadata(response, {
      url: response.url || url.href,
      redirected: true,
      type: response.type,
    });
  };
  const requestFetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
    redirects = 0
  ): Promise<Response> => {
    const baseUrl = getBaseUrl();
    const url = new URL(
      input instanceof Request ? input.url : input.toString(),
      baseUrl
    );
    url.hash = "";
    const nativeInput =
      input instanceof Request || input instanceof URL ? input : url;
    const { pages, dataSources, resources } = getData();
    if (pages === undefined || url.origin !== new URL(baseUrl).origin) {
      return fetchNative({ input: nativeInput, init, url, redirects });
    }
    const method = (
      init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    if (method !== "GET" && method !== "HEAD") {
      return fetch(nativeInput, init);
    }
    const match = matchPathnameRoutes(
      Array.from(pages.pages.values(), (page) => ({
        pattern: getPagePath(page.id, pages),
        value: page,
      })),
      url.pathname
    );
    const page = match?.value;
    if (page?.meta.documentType !== "text" || match === undefined) {
      return fetchNative({ input: nativeInput, init, url, redirects });
    }
    const request = new Request(input instanceof Request ? input : url, init);
    request.signal.throwIfAborted();
    const system = {
      params: toWebstudioParams(getPagePath(page.id, pages), match.params),
      search: Object.fromEntries(url.searchParams),
      pathname: url.pathname,
      origin: url.origin,
    };
    const values = new Map<string, unknown>([[SYSTEM_VARIABLE_ID, system]]);
    if (page.systemDataSourceId !== undefined) {
      values.set(page.systemDataSourceId, system);
    }
    for (const source of dataSources.values()) {
      if (source.type === "variable") {
        values.set(source.id, source.value.value);
      }
    }
    const pending = new Map<string, Promise<unknown>>();
    const resolve = (
      id: string,
      ancestors = new Set<string>()
    ): unknown | Promise<unknown> => {
      if (values.has(id)) {
        return values.get(id);
      }
      const source = dataSources.get(id);
      if (source?.type !== "resource" || ancestors.has(source.resourceId)) {
        return;
      }
      const resource = resources.get(source.resourceId);
      if (resource === undefined) {
        return;
      }
      let result = pending.get(resource.id);
      if (result === undefined) {
        const nextAncestors = new Set(ancestors).add(resource.id);
        result = computeResourceRequest(resource, values, (dependencyId) =>
          resolve(dependencyId, nextAncestors)
        ).then((resourceRequest) =>
          loadResource(resourceRequest, request.signal)
        );
        pending.set(resource.id, result);
      }
      return result;
    };
    const [content, status, redirect] = await Promise.all([
      computeExpression(
        normalizeStringExpression(page.meta.content ?? "undefined"),
        values,
        (id) => resolve(id)
      ),
      computeExpression(page.meta.status ?? "undefined", values, (id) =>
        resolve(id)
      ),
      computeExpression(
        normalizeStringExpression(page.meta.redirect ?? "undefined"),
        values,
        (id) => resolve(id)
      ),
    ]);
    request.signal.throwIfAborted();
    if (redirect) {
      const target = new URL(String(redirect), url);
      if (request.redirect === "manual") {
        return withFetchMetadata(Response.error(), {
          url: url.href,
          redirected: false,
          type: "opaqueredirect",
        });
      }
      if (request.redirect === "error" || redirects >= 20) {
        throw new TypeError("Failed to fetch");
      }
      const headers = new Headers(request.headers);
      if (target.origin !== url.origin) {
        headers.delete("authorization");
      }
      return requestFetch(
        new Request(new Request(target, request), { headers }),
        undefined,
        redirects + 1
      );
    }
    return withFetchMetadata(
      new Response(request.method === "HEAD" ? null : String(content ?? ""), {
        status: typeof status === "number" ? status : undefined,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }),
      { url: url.href, redirected: redirects > 0, type: "basic" }
    );
  };
  return requestFetch;
};
