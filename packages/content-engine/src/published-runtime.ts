import {
  createAssetResourceQueryFailure,
  type AssetResourceQueryFailure,
} from "./schema";
import { sha256Hex } from "./canonical-json";
import {
  encodeUtf8,
  readableStreamToAsyncIterable,
  selectByteRange,
} from "./byte-stream";
import { createRuntimeContentDatabase } from "./content-database";
import { readAssetQueryRequest } from "./request";
import type { AssetRuntimeData } from "./structured-query";
import {
  getAssetQueryRequestError,
  getAssetResourceQueryError,
} from "./query-error";
import {
  createCachedDocumentSourceLoader,
  createHttpDocumentSourceLoader,
  createMemoryDocumentSourceCache,
  type DocumentSourceCache,
  type DocumentGraphRuntimeObserver,
} from "./document-graph";
import type { ContentRuntimeArtifact } from "./content-runtime-artifact";

const assetsResourceUrl = "/$resources/assets";
const automationEnvironmentVariable = "WEBSTUDIO_AUTOMATION_TOKEN";

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;

const getAutomationToken = (context: unknown) => {
  // Cloudflare exposes bindings under context.cloudflare.env. The other
  // supported server adapters expose the environment directly or as env.
  const contextRecord = asRecord(context);
  const cloudflare = asRecord(contextRecord?.cloudflare);
  const environments = [
    contextRecord,
    asRecord(contextRecord?.env),
    asRecord(cloudflare?.env),
  ];
  for (const environment of environments) {
    const value = environment?.[automationEnvironmentVariable];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
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
  details,
}: {
  code: AssetResourceQueryFailure["error"]["code"];
  message: string;
  status: number;
  retryable?: boolean;
  details?: AssetResourceQueryFailure["error"]["details"];
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
  automationToken,
  fetchDocument = globalThis.fetch,
  onDocumentGraphEvent,
}: {
  deploymentId: string;
  artifact: ContentRuntimeArtifact;
  runtimeAssets: Readonly<Record<string, AssetRuntimeData>>;
  cache?: Pick<Cache, "match" | "put">;
  baseUrl: string | URL;
  automationToken?: string;
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
    automationToken,
    database: createRuntimeContentDatabase({ artifact }),
    fetchDocument,
    documentCache,
    onDocumentGraphEvent,
  });
};

const createPublishedDocumentRequest = ({
  assetId,
  baseUrl,
  runtimeAssets,
  automationToken,
  authorization,
}: {
  assetId: string;
  baseUrl: string | URL;
  runtimeAssets: Readonly<Record<string, AssetRuntimeData>>;
  automationToken?: string;
  authorization?: string;
}) => {
  const asset = runtimeAssets[assetId];
  if (asset === undefined) {
    throw new Error(`Published document URL is unavailable for ${assetId}`);
  }
  const request = new Request(new URL(asset.url, baseUrl));
  request.headers.delete("referer");
  if (automationToken !== undefined) {
    request.headers.set("x-webstudio-automation", automationToken);
  }
  // The asset proxy may require the same Basic login as the page. Never
  // forward the visitor's credentials to a different origin or copy cookies.
  if (
    authorization !== undefined &&
    /^Basic\s/i.test(authorization) &&
    new URL(request.url).origin === new URL(baseUrl).origin
  ) {
    request.headers.set("authorization", authorization);
    // Workers can forward headers when following redirects. Asset requests
    // carrying a visitor's credentials must never follow one.
    // Use manual because older Workers runtimes reject redirect: "error".
    // The document loader rejects the resulting non-OK redirect response.
    return new Request(request, { redirect: "manual" });
  }
  return request;
};

const createPublishedDocumentLoader = ({
  baseUrl,
  runtimeAssets,
  embeddedContents,
  automationToken,
  authorization,
  fetchDocument,
  cache,
  onEvent,
}: {
  baseUrl: string | URL;
  runtimeAssets: Readonly<Record<string, AssetRuntimeData>>;
  embeddedContents?: Readonly<Record<string, string>>;
  automationToken?: string;
  authorization?: string;
  fetchDocument: typeof fetch;
  cache: DocumentSourceCache;
  onEvent?: DocumentGraphRuntimeObserver;
}) => {
  const httpLoader = createHttpDocumentSourceLoader({
    fetch: fetchDocument,
    getRequest: (node) =>
      createPublishedDocumentRequest({
        assetId: node.id,
        baseUrl,
        runtimeAssets,
        automationToken,
        authorization,
      }),
    getMetadata: ({ node }) => ({
      format: node.format,
      revision: node.revision,
    }),
    onEvent,
  });

  return createCachedDocumentSourceLoader({
    cache,
    onEvent,
    load: async (node, options) => {
      const format = node.format;
      const content =
        format === undefined ? undefined : embeddedContents?.[node.contentRef];
      if (content !== undefined && format !== undefined) {
        return {
          format,
          revision: node.revision,
          source: encodeUtf8(content),
        };
      }
      return await httpLoader(node, options);
    },
  });
};

const validateRuntimeAssets = ({
  artifact,
  runtimeAssets,
}: {
  artifact: ContentRuntimeArtifact;
  runtimeAssets: Readonly<Record<string, AssetRuntimeData>>;
}) => {
  const missingReferencedAssetId = [
    artifact.assetReferences,
    artifact.assetValueReferences,
  ]
    .flatMap((references) => Object.values(references ?? {}).flat())
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
  automationToken,
  authorization,
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
  automationToken?: string;
  authorization?: string;
  database: ReturnType<typeof createRuntimeContentDatabase>;
  fetchDocument: typeof fetch;
  documentCache: DocumentSourceCache;
  onDocumentGraphEvent?: DocumentGraphRuntimeObserver;
}) => {
  const baseOrigin = new URL(baseUrl).origin;
  const documentsByContentRef = new Map(
    artifact.documents.map((document) => [document.contentRef, document])
  );
  const loadDocument = createPublishedDocumentLoader({
    baseUrl,
    runtimeAssets,
    embeddedContents: artifact.contents,
    automationToken,
    authorization,
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
    } catch (error) {
      const queryError = getAssetQueryRequestError(error);
      if (queryError !== undefined) {
        return failure(queryError);
      }
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
          // Plain text and full-file queries do not necessarily have graph
          // nodes. Resolve those files through the same asset HTTP transport.
          readContent: async (contentRef, range) => {
            const document = documentsByContentRef.get(contentRef);
            if (document === undefined) {
              throw new Error(
                `Published content reference is unavailable: ${contentRef}`
              );
            }
            const response = await fetchDocument(
              createPublishedDocumentRequest({
                assetId: document._id,
                baseUrl,
                runtimeAssets,
                automationToken,
                authorization,
              }),
              { signal: request.signal }
            );
            if (!response.ok || response.body === null) {
              throw new Error(
                `Document ${document._id} request returned status ${response.status} or no body`
              );
            }
            return {
              data: selectByteRange(
                readableStreamToAsyncIterable(response.body),
                range
              ),
            };
          },
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
    context,
    fallback,
  }: {
    request: Request;
    context?: unknown;
    fallback: typeof fetch;
  }): Promise<typeof fetch> => {
    const origin = new URL(request.url).origin;
    const fetchResource = createPublishedAssetResourceHandler({
      deploymentId,
      artifact,
      runtimeAssets,
      cache,
      baseUrl: origin,
      automationToken: getAutomationToken(context),
      authorization: request.headers.get("authorization") ?? undefined,
      database,
      fetchDocument: fallback,
      documentCache,
      onDocumentGraphEvent,
    });
    return async (input, init) =>
      (await fetchResource(input, init)) ?? fallback(input, init);
  };
};
