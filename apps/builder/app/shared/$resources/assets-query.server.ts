import { json } from "@remix-run/server-runtime";
import {
  AssetIndexRevisionError,
  AssetQueryExecutionError,
  readAssetQueryRequest,
  parseContentDatabaseMaxBytes,
  AssetResourceHydrationError,
} from "@webstudio-is/content-engine";
import { previewAssetResourceQuery } from "@webstudio-is/asset-uploader/index.server";
import {
  assetResourceQueryFailure,
  type AssetResourceErrorCode,
} from "@webstudio-is/sdk";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { authorizeAssetRestProject } from "~/services/asset-rest-auth.server";
import { getAssetRestProjectId } from "~/services/asset-rest.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { createAssetClient } from "../asset-client";

type Dependencies = {
  authorizeAssetRestProject: typeof authorizeAssetRestProject;
  createAssetClient: () => Pick<
    ReturnType<typeof createAssetClient>,
    "readFile"
  >;
  previewAssetResourceQuery: typeof previewAssetResourceQuery;
  preventCrossOriginCookie: typeof preventCrossOriginCookie;
};

const defaultDependencies: Dependencies = {
  authorizeAssetRestProject,
  createAssetClient,
  previewAssetResourceQuery,
  preventCrossOriginCookie,
};

const failure = ({
  code,
  message,
  status,
  retryable = false,
  details,
}: {
  code: AssetResourceErrorCode;
  message: string;
  status: number;
  retryable?: boolean;
  details?: Record<string, string | number>;
}) =>
  json(
    assetResourceQueryFailure.parse({
      ok: false,
      error: { code, message, retryable, details },
    }),
    { status, headers: privateNoStoreResponseHeaders }
  );

export const loader = async (
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
    return failure({
      code: "INVALID_REQUEST",
      message: "Project ID is required to preview an asset query",
      status: 400,
    });
  }

  let parsed;
  try {
    parsed = await readAssetQueryRequest(resourceRequest);
  } catch {
    return failure({
      code: "INVALID_REQUEST",
      message: "Asset query preview requires a JSON request body",
      status: 400,
    });
  }
  try {
    const context = await dependencies.authorizeAssetRestProject(
      request,
      projectId,
      "view"
    );
    const result = await dependencies.previewAssetResourceQuery({
      projectId,
      request: parsed,
      context,
      assetClient: dependencies.createAssetClient(),
      contentDatabaseMaxBytes: parseContentDatabaseMaxBytes(
        process.env.CONTENT_DATABASE_MAX_BYTES
      ),
    });
    return json(result, { headers: privateNoStoreResponseHeaders });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return failure({
        code: "FORBIDDEN",
        message: "You don't have access to preview this asset resource",
        status: 403,
      });
    }
    if (error instanceof AssetIndexRevisionError) {
      return failure({
        code: "STALE_INDEX",
        message: error.message,
        status: 409,
      });
    }
    if (error instanceof AssetQueryExecutionError) {
      return failure({
        code: "INVALID_REQUEST",
        message: error.message,
        status: 400,
      });
    }
    if (error instanceof AssetResourceHydrationError) {
      return failure({
        code: error.code,
        message: error.message,
        details: error.details,
        status: 400,
      });
    }
    return failure({
      code: "INTERNAL_ERROR",
      message: "Asset query preview failed",
      status: 500,
      retryable: true,
    });
  }
};
