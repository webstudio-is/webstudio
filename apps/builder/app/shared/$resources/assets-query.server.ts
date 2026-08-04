import { json } from "@remix-run/server-runtime";
import {
  getAssetResourceQueryError,
  readAssetQueryRequest,
} from "@webstudio-is/content-engine";
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
};

const defaultDependencies: Dependencies = {
  authorizeApiProject,
  previewProjectAssetQueries,
  previewProjectAssetQuery,
  preventCrossOriginCookie,
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
  const queryError = getAssetResourceQueryError(error);
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
  dependencies = defaultDependencies
) => {
  dependencies.preventCrossOriginCookie(request);
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
    context = await dependencies.authorizeApiProject(
      request,
      projectId,
      "view"
    );
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
          dependencies.previewProjectAssetQuery({
            projectId,
            request: parsed,
            context,
            includeDiagnostics: true,
            includeUnresolvedDiagnostics: true,
            signal: request.signal,
          })
        )
      );
    } else {
      results = await dependencies.previewProjectAssetQueries({
        projectId,
        requests: parsedRequests.map(({ request }) => request),
        context,
        signal: request.signal,
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
      responses[index] = json(result.value, {
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
  dependencies = defaultDependencies
) =>
  (
    await executeAssetQueries(
      { request, resourceRequests: [resourceRequest], includeDiagnostics },
      dependencies
    )
  )[0];
