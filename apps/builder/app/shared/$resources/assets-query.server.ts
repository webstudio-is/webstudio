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
import { previewProjectAssetQuery } from "~/services/asset-query-preview.server";
import { createAssetResourceFailureResponse } from "./assets-response.server";

type Dependencies = {
  authorizeApiProject: typeof authorizeApiProject;
  previewProjectAssetQuery: typeof previewProjectAssetQuery;
  preventCrossOriginCookie: typeof preventCrossOriginCookie;
};

const defaultDependencies: Dependencies = {
  authorizeApiProject,
  previewProjectAssetQuery,
  preventCrossOriginCookie,
};

export const executeAssetQuery = async (
  {
    request,
    resourceRequest,
  }: {
    request: Request;
    resourceRequest: Request;
  },
  dependencies = defaultDependencies
) => {
  dependencies.preventCrossOriginCookie(request);
  let projectId: string;
  try {
    projectId = getAssetRestProjectId(request);
  } catch {
    return createAssetResourceFailureResponse({
      code: "INVALID_REQUEST",
      message: "Project ID is required to preview an asset query",
      status: 400,
    });
  }

  let parsed;
  try {
    parsed = await readAssetQueryRequest(resourceRequest);
  } catch {
    return createAssetResourceFailureResponse({
      code: "INVALID_REQUEST",
      message: "Asset query preview requires a JSON request body",
      status: 400,
    });
  }
  try {
    const context = await dependencies.authorizeApiProject(
      request,
      projectId,
      "view"
    );
    const result = await dependencies.previewProjectAssetQuery({
      projectId,
      request: parsed,
      context,
      includeUnresolvedDiagnostics: true,
    });
    return json(result, { headers: privateNoStoreResponseHeaders });
  } catch (error) {
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
  }
};
