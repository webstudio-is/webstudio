import { json } from "@remix-run/server-runtime";
import {
  getAssetResourceQueryError,
  readAssetQueryRequest,
  type DocumentGraphRuntimeObserver,
} from "@webstudio-is/content-engine";
import type { AssetQueryPerformanceObserver } from "@webstudio-is/asset-uploader/server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import {
  authorizeApiProject,
  getApiAuthorizationFailure,
} from "~/services/api-auth.server";
import { getAssetRestProjectId } from "~/services/asset-rest.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import {
  previewProjectAssetQueries,
  previewProjectAssetQuery,
} from "~/services/asset-query-preview.server";
import { createAssetResourceFailureResponse } from "./assets-response.server";

type Dependencies = {
  authorizeApiProject: typeof authorizeApiProject;
  previewProjectAssetQueries: typeof previewProjectAssetQueries;
  previewProjectAssetQuery: typeof previewProjectAssetQuery;
  preventCrossOriginCookie: typeof preventCrossOriginCookie;
  now: () => number;
};

const defaultDependencies: Dependencies = {
  authorizeApiProject,
  previewProjectAssetQueries,
  previewProjectAssetQuery,
  preventCrossOriginCookie,
  now: () => performance.now(),
};

const phaseKeys = {
  "build-plan": "buildPlan",
  "repository-authorization": "repositoryAuthorization",
  "source-snapshot": "sourceSnapshot",
  "canonical-metadata": "canonicalMetadata",
  "compiler-entries": "compilerEntries",
  "document-graph": "documentGraph",
  "asset-references": "assetReferences",
  "source-validation": "sourceValidation",
  "artifact-compilation": "artifactCompilation",
  "index-preparation": "indexPreparation",
  "diagnostics-preparation": "diagnosticsPreparation",
  "runtime-assets": "runtimeAssets",
  "document-resolution": "documentResolution",
} as const;

type PerformancePhaseKey =
  | (typeof phaseKeys)[keyof typeof phaseKeys]
  | "authorization"
  | "compilerContentRead"
  | "documentGraphContentRead";

const compilationCacheRank = {
  hit: 0,
  coalesced: 1,
  disabled: 2,
  miss: 3,
} as const;

const createPerformanceCollector = () => {
  const phases: Partial<Record<PerformancePhaseKey, number>> = {};
  let compilationCache: "hit" | "coalesced" | "miss" | "disabled" | undefined;
  let resolvedDocumentCount = 0;
  let documentFetchCount = 0;
  let compilerContentFetchCount = 0;
  let compilerContentBytes = 0;
  let documentGraphContentFetchCount = 0;
  let documentGraphContentBytes = 0;
  const onPerformanceEvent: AssetQueryPerformanceObserver = (event) => {
    if (event.type === "phase-completed") {
      const key = phaseKeys[event.phase];
      phases[key] = (phases[key] ?? 0) + event.durationMs;
      return;
    }
    if (event.type === "content-read") {
      if (event.purpose === "compiler-entry") {
        compilerContentFetchCount += 1;
        compilerContentBytes += event.byteLength;
        phases.compilerContentRead =
          (phases.compilerContentRead ?? 0) + event.durationMs;
      } else {
        documentGraphContentFetchCount += 1;
        documentGraphContentBytes += event.byteLength;
        phases.documentGraphContentRead =
          (phases.documentGraphContentRead ?? 0) + event.durationMs;
      }
      return;
    }
    if (
      compilationCache === undefined ||
      compilationCacheRank[event.status] >
        compilationCacheRank[compilationCache]
    ) {
      compilationCache = event.status;
    }
  };
  const onDocumentGraphEvent: DocumentGraphRuntimeObserver = (event) => {
    if (event.type === "resolution-started") {
      resolvedDocumentCount += event.documentCount;
    }
    if (event.type === "document-fetch-started") {
      documentFetchCount += 1;
    }
  };
  return {
    onPerformanceEvent,
    onDocumentGraphEvent,
    addPhase: (key: PerformancePhaseKey, durationMs: number) => {
      phases[key] = (phases[key] ?? 0) + durationMs;
    },
    getMetrics: () => ({
      phases,
      ...(compilationCache === undefined ? {} : { compilationCache }),
      resolvedDocumentCount,
      documentFetchCount,
      compilerContentFetchCount,
      compilerContentBytes,
      documentGraphContentFetchCount,
      documentGraphContentBytes,
    }),
  };
};

const createFailureResponse = (error: unknown, request: Request) => {
  if (request.signal.aborted) {
    return createAssetResourceFailureResponse({
      code: "REQUEST_CANCELLED",
      message: "Asset query preview was cancelled",
      status: 499,
    });
  }
  const authorizationFailure = getApiAuthorizationFailure(error);
  if (authorizationFailure !== undefined) {
    return createAssetResourceFailureResponse(authorizationFailure);
  }
  const queryError = getAssetResourceQueryError(error, {
    includeSourceDetails: true,
  });
  if (queryError !== undefined) {
    return createAssetResourceFailureResponse(queryError);
  }
  return createAssetResourceFailureResponse({
    code: "INTERNAL_ERROR",
    message: "Asset query preview failed",
    status: 500,
    retryable: true,
  });
};

const finalizeResponses = (
  responses: readonly (Response | undefined)[],
  request: Request
) =>
  responses.map(
    (response) =>
      response ??
      createFailureResponse(
        new Error("Asset query batch response is missing"),
        request
      )
  );

export const executeAssetQueries = async (
  {
    request,
    resourceRequests,
    includeDiagnostics = false,
  }: {
    request: Request;
    resourceRequests: readonly Request[];
    includeDiagnostics?: boolean;
  },
  dependencies: Partial<Dependencies> = {}
) => {
  const resolvedDependencies = { ...defaultDependencies, ...dependencies };
  const performanceCollector = createPerformanceCollector();
  resolvedDependencies.preventCrossOriginCookie(request);
  if (request.signal.aborted) {
    return resourceRequests.map(() =>
      createFailureResponse(request.signal.reason, request)
    );
  }
  let projectId: string;
  try {
    projectId = getAssetRestProjectId(request);
  } catch {
    return resourceRequests.map(() =>
      createAssetResourceFailureResponse({
        code: "INVALID_REQUEST",
        message: "Project ID is required to preview an asset query",
        status: 400,
      })
    );
  }

  const responses: Array<Response | undefined> = resourceRequests.map(
    () => undefined
  );
  const parsedRequests: Array<{
    index: number;
    request: Awaited<ReturnType<typeof readAssetQueryRequest>>;
  }> = [];
  await Promise.all(
    resourceRequests.map(async (resourceRequest, index) => {
      try {
        parsedRequests.push({
          index,
          request: await readAssetQueryRequest(resourceRequest),
        });
      } catch {
        responses[index] = createAssetResourceFailureResponse({
          code: "INVALID_REQUEST",
          message: "Asset query preview requires a JSON request body",
          status: 400,
        });
      }
    })
  );
  parsedRequests.sort((left, right) => left.index - right.index);
  if (parsedRequests.length === 0) {
    return finalizeResponses(responses, request);
  }

  let context: Awaited<ReturnType<typeof authorizeApiProject>>;
  try {
    const startedAt = resolvedDependencies.now();
    try {
      context = await resolvedDependencies.authorizeApiProject(
        request,
        projectId,
        "view"
      );
    } finally {
      performanceCollector.addPhase(
        "authorization",
        Math.max(0, resolvedDependencies.now() - startedAt)
      );
    }
  } catch (error) {
    for (const { index } of parsedRequests) {
      responses[index] = createFailureResponse(error, request);
    }
    return finalizeResponses(responses, request);
  }

  let results: PromiseSettledResult<unknown>[];
  try {
    if (includeDiagnostics) {
      results = await Promise.allSettled(
        parsedRequests.map(({ request: parsed }) =>
          resolvedDependencies.previewProjectAssetQuery({
            projectId,
            request: parsed,
            context,
            includeDiagnostics: true,
            includeUnresolvedDiagnostics: true,
            signal: request.signal,
            onPerformanceEvent: performanceCollector.onPerformanceEvent,
            onDocumentGraphEvent: performanceCollector.onDocumentGraphEvent,
          })
        )
      );
    } else {
      results = await resolvedDependencies.previewProjectAssetQueries({
        projectId,
        requests: parsedRequests.map(({ request }) => request),
        context,
        signal: request.signal,
        onPerformanceEvent: performanceCollector.onPerformanceEvent,
        onDocumentGraphEvent: performanceCollector.onDocumentGraphEvent,
      });
    }
  } catch (error) {
    results = parsedRequests.map(() => ({ status: "rejected", reason: error }));
  }
  for (const [resultIndex, { index }] of parsedRequests.entries()) {
    const result = results[resultIndex];
    if (result === undefined) {
      responses[index] = createFailureResponse(
        new Error("Asset query batch result is missing"),
        request
      );
    } else if (result.status === "fulfilled") {
      const value =
        typeof result.value === "object" && result.value !== null
          ? {
              ...result.value,
              __performance__: {
                assetQuery: performanceCollector.getMetrics(),
              },
            }
          : result.value;
      responses[index] = json(value, {
        headers: privateNoStoreResponseHeaders,
      });
    } else {
      responses[index] = createFailureResponse(result.reason, request);
    }
  }
  return finalizeResponses(responses, request);
};

export const executeAssetQuery = async (
  {
    request,
    resourceRequest,
    includeDiagnostics = true,
  }: {
    request: Request;
    resourceRequest: Request;
    includeDiagnostics?: boolean;
  },
  dependencies: Partial<Dependencies> = {}
) =>
  (
    await executeAssetQueries(
      { request, resourceRequests: [resourceRequest], includeDiagnostics },
      dependencies
    )
  )[0];
