import hash from "@emotion/hash";
import {
  awaitWithSignal,
  resolveResources as resolveResourceGraph,
  type Resource,
} from "@webstudio-is/content-engine";
import type { ResourceRequest } from "./schema/resources";
import { validateEmailSubject } from "./email-resource";
import { isPlainObject, serializeValue } from "./to-string";

const LOCAL_RESOURCE_PREFIX = "$resources";
const RESOURCE_ERROR_DETAIL_LIMIT = 2000;
export const resourceLoadConcurrency = 20;

const formatResourceErrorDetail = (data: unknown) => {
  let detail = "";
  if (typeof data === "string") {
    detail = data;
  } else if (
    typeof data === "object" &&
    data !== null &&
    Array.isArray(data) === false
  ) {
    const record = data as Record<string, unknown>;
    const structuredDetail: Record<string, unknown> = {};
    for (const key of ["code", "message", "issues"]) {
      if (record[key] !== undefined) {
        structuredDetail[key] = record[key];
      }
    }
    if (Object.keys(structuredDetail).length > 0) {
      detail = JSON.stringify(structuredDetail, undefined, 2);
    }
  }
  return detail.length > RESOURCE_ERROR_DETAIL_LIMIT
    ? `${detail.slice(0, RESOURCE_ERROR_DETAIL_LIMIT)}\n…truncated`
    : detail;
};

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

const containsFile = (value: unknown): boolean => {
  if (
    (typeof File !== "undefined" && value instanceof File) ||
    (typeof Blob !== "undefined" && value instanceof Blob)
  ) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some(containsFile);
  }
  if (isPlainObject(value)) {
    return Object.values(value).some(containsFile);
  }
  return false;
};

const toMultipartFormData = (value: object) => {
  const formData = new FormData();
  const append = (name: string, item: unknown) => {
    if (item === undefined || item === null) {
      return;
    }
    if (typeof File !== "undefined" && item instanceof File) {
      formData.append(name, item, item.name);
      return;
    }
    if (typeof Blob !== "undefined" && item instanceof Blob) {
      formData.append(name, item);
      return;
    }
    if (Array.isArray(item)) {
      for (const value of item) {
        append(name, value);
      }
      return;
    }
    if (isPlainObject(item) && containsFile(item)) {
      for (const [key, value] of Object.entries(item)) {
        append(`${name}[${key}]`, value);
      }
      return;
    }
    formData.append(name, serializeValue(item));
  };
  for (const [name, fieldValue] of Object.entries(value)) {
    append(name, fieldValue);
  }
  return formData;
};

export const getResourceBodyFormatError = (request: ResourceRequest) => {
  if (
    request.control === "email" ||
    request.method === "get" ||
    request.bodyFormat === undefined ||
    request.bodyFormat === "auto"
  ) {
    return;
  }
  if (request.body instanceof FormData) {
    return request.bodyFormat === "json"
      ? "JSON body cannot include form data"
      : undefined;
  }
  if (request.bodyFormat === "json" && containsFile(request.body)) {
    return "JSON body cannot include uploaded files";
  }
  if (request.bodyFormat === "json") {
    if (isPlainObject(request.body) === false && !Array.isArray(request.body)) {
      return "JSON body expects an object or array";
    }
  } else if (isPlainObject(request.body) === false) {
    return "Multipart body expects an object of fields";
  }
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

export type ResourceExchange = {
  request: Request | ResourceRequest;
  response: {
    status: number;
    statusText: string;
    headers: Headers;
    data: unknown;
    url?: string;
  };
};

export type ResourceLoadOptions = {
  /** Private, opt-in inspection of the same transport attempt; never replays it. */
  onExchange?: (exchange: ResourceExchange) => void | Promise<void>;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Supplied only by the published site's server runtime. */
  sendEmail?: (
    request: ResourceRequest,
    options: ResourceLoadOptions
  ) => Promise<{
    ok: boolean;
    status: number;
    statusText: string;
    data: unknown;
  }>;
};

export type ResourceGraphLoadOptions = ResourceLoadOptions & {
  onResourceExchange?: (
    resourceId: string,
    exchange: ResourceExchange
  ) => void | Promise<void>;
  /** Retry a failed selected root once, without resolving its dependencies again. */
  retryFailedRoots?: boolean;
  requestOverrides?: ReadonlyMap<
    string,
    Partial<ResourceRequest> & { fetch?: typeof fetch }
  >;
};

export type ResourceRequestResource = Readonly<{
  id: string;
  outputName: string;
  name?: string;
  dependencies: readonly string[];
  control?: ResourceRequest["control"];
  /** Trusted, published team-recipient count for an Email destination. */
  emailRecipientCount?: number;
  /** Visitor-directed email failure is reported but does not fail the Form. */
  nonfatal?: boolean;
  usesDefaultFormBody?: boolean;
  bodyFormat?: ResourceRequest["bodyFormat"];
  createRequest: (documents: ReadonlyMap<string, unknown>) => ResourceRequest;
}>;

export type ResourceRequestGraph = Readonly<{
  resources: readonly ResourceRequestResource[];
  rootIds: readonly string[];
}>;

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
  const observe = async (exchange: ResourceExchange) => {
    try {
      await options.onExchange?.(exchange);
    } catch {
      /* Inspection must not change delivery outcomes. */
    }
  };
  if (resourceRequest.control === "email") {
    validateEmailSubject(resourceRequest.email?.subject);
    if (options.sendEmail !== undefined) {
      const result = await options.sendEmail(resourceRequest, options);
      await observe({
        request: resourceRequest,
        response: { ...result, headers: new Headers() },
      });
      return result;
    }
    return {
      ok: false,
      status: 501,
      statusText: "Email delivery requires Webstudio Cloud",
      data: {
        ok: false,
        error: {
          code: "EMAIL_NOT_CONFIGURED",
          message: "Email delivery requires Webstudio Cloud",
          retryable: false,
        },
      },
    };
  }
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
          if (controller.signal.aborted) {
            return;
          }
          didTimeout = true;
          controller.abort();
        }, options.timeoutMs);

  let inspectionRequest: Request | undefined;
  let inspectionResponse: ResourceExchange["response"] | undefined;
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
      headers
        .filter(({ value }) => value !== undefined)
        .map(({ name, value }): [string, string] => [
          name,
          serializeValue(value),
        ])
    );
    const bodyFormatError = getResourceBodyFormatError(resourceRequest);
    if (bodyFormatError !== undefined) {
      return {
        ok: false,
        data: {
          ok: false,
          error: {
            code: "INVALID_BODY_FORMAT",
            message: bodyFormatError,
            retryable: false,
          },
        },
        status: 400,
        statusText: bodyFormatError,
      };
    }
    const requestInit: RequestInit = {
      method,
      headers: requestHeaders,
    };
    let signal: AbortSignal | undefined;
    if (options.signal !== undefined || options.timeoutMs !== undefined) {
      signal = controller.signal;
      requestInit.signal = signal;
    }
    if (method !== "get" && body !== undefined) {
      if (body instanceof FormData) {
        // Fetch must generate the Content-Type boundary for this FormData.
        requestHeaders.delete("Content-Type");
        requestInit.body = body;
      } else if (isPlainObject(body)) {
        if (resourceRequest.bodyFormat === "multipart" || containsFile(body)) {
          // Form data is JSON by default; preserve upload bytes and repeated
          // values as multipart whenever the body contains a file.
          requestHeaders.delete("Content-Type");
          requestInit.body = toMultipartFormData(body);
        } else {
          if (resourceRequest.bodyFormat === "json") {
            requestHeaders.set("Content-Type", "application/json");
          } else if (requestHeaders.has("Content-Type") === false) {
            requestHeaders.set("Content-Type", "application/json");
          }
          requestInit.body = serializeValue(body);
        }
      } else if (resourceRequest.bodyFormat === "json" && Array.isArray(body)) {
        requestHeaders.set("Content-Type", "application/json");
        requestInit.body = serializeValue(body);
      } else {
        requestInit.body = serializeValue(body);
      }
    }
    const outgoing =
      options.onExchange && !isLocalResource(href)
        ? new Request(href, requestInit)
        : undefined;
    inspectionRequest = outgoing?.clone();
    const response = await awaitWithSignal(
      outgoing === undefined
        ? customFetch(href, requestInit)
        : customFetch(outgoing),
      signal
    );

    let data = await awaitWithSignal(response.text(), signal);

    try {
      // If it looks like JSON and quacks like JSON, then it probably is JSON.
      data = JSON.parse(data);
    } catch {
      // ignore, leave data as text
    }

    if (!response.ok) {
      const detail = formatResourceErrorDetail(data);
      console.error(
        `Failed to load resource request: ${response.status}${detail === "" ? "" : `\n${detail}`}`
      );
    }

    inspectionResponse = {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers),
      data,
      url: response.url || undefined,
    };
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
    const failure = didTimeout
      ? transportFailure({
          code: "REQUEST_TIMEOUT",
          message: `Resource request exceeded ${options.timeoutMs}ms`,
          retryable: true,
          status: 504,
        })
      : options.signal?.aborted
        ? transportFailure({
            code: "REQUEST_CANCELLED",
            message: "Resource request was cancelled",
            retryable: false,
            status: 499,
          })
        : transportFailure({
            code: "NETWORK_ERROR",
            message: "Resource request failed",
            retryable: true,
            status: 502,
          });
    if (!didTimeout && !options.signal?.aborted) {
      console.error("Resource request failed");
    }
    inspectionResponse = { ...failure, headers: new Headers() };
    return failure;
  } finally {
    if (inspectionRequest && inspectionResponse) {
      await observe({
        request: inspectionRequest,
        response: inspectionResponse,
      });
    }
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    options.signal?.removeEventListener("abort", cancel);
  }
};

export const loadResources = async (
  customFetch: typeof fetch,
  requests: Map<string, ResourceRequest> | ResourceRequestGraph,
  baseUrl?: string | URL,
  options?: ResourceGraphLoadOptions
) => {
  const isLegacyMap = requests instanceof Map;
  const graph: ResourceRequestGraph = isLegacyMap
    ? {
        resources: Array.from(requests, ([name, request]) => ({
          id: name,
          outputName: name,
          dependencies: [],
          createRequest: () => request,
        })),
        rootIds: Array.from(requests.keys()),
      }
    : requests;
  const rootIds = new Set(graph.rootIds);
  const resources: Resource<unknown>[] = graph.resources.map((resource) => ({
    id: resource.id,
    dependencies: resource.dependencies,
    resolve: ({ documents, signal }) => {
      const {
        requestOverrides,
        retryFailedRoots,
        onResourceExchange,
        ...loadOptions
      } = options ?? {};
      const { fetch: requestFetch = customFetch, ...overrides } =
        requestOverrides?.get(resource.id) ?? {};
      const request = resource.createRequest(documents);
      const resolvedRequest = {
        ...request,
        ...overrides,
      };
      const load = () =>
        loadResource(requestFetch, resolvedRequest, baseUrl, {
          ...loadOptions,
          onExchange: onResourceExchange
            ? (exchange) => onResourceExchange(resource.id, exchange)
            : loadOptions.onExchange,
          signal: signal ?? options?.signal,
        });
      return load().then((result) =>
        retryFailedRoots === true &&
        rootIds.has(resource.id) &&
        result.ok === false &&
        // A per-site Email Service quota rejection cannot succeed on an
        // immediate retry; preserve the result for the Form error UI.
        !(resolvedRequest.control === "email" && result.status === 429) &&
        !signal?.aborted &&
        !options?.signal?.aborted
          ? load()
          : result
      );
    },
  }));
  const resolved = await resolveResourceGraph({
    resources,
    rootIds: graph.rootIds,
    concurrency: resourceLoadConcurrency,
    // Legacy maps expose cancellation as a structured transport document.
    // Graph callers use resolver-level cancellation instead.
    signal: isLegacyMap ? undefined : options?.signal,
  });
  const resourcesById = new Map(
    graph.resources.map((resource) => [resource.id, resource])
  );
  const output = new Map<string, unknown>();
  for (const resourceId of graph.rootIds) {
    const resource = resourcesById.get(resourceId);
    if (resource !== undefined && resolved.documents.has(resourceId)) {
      output.set(resource.outputName, resolved.documents.get(resourceId));
    }
  }
  return Object.fromEntries(output);
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
