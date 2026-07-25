import { json } from "@remix-run/server-runtime";
import {
  AssetIndexRevisionError,
  AssetQueryExecutionError,
  readAssetQueryRequest,
  AssetResourceHydrationError,
} from "@webstudio-is/asset-resource";
import { previewAssetResourceQuery } from "@webstudio-is/asset-uploader/index.server";
import { parseBuilderUrl } from "@webstudio-is/protocol";
import {
  assetResourceQueryFailure,
  type AssetResourceErrorCode,
} from "@webstudio-is/sdk";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { createAssetRestContext } from "~/services/asset-rest-auth.server";
import { isBuilder } from "../router-utils";
import { createAssetClient } from "../asset-client";

type Dependencies = {
  createAssetRestContext: typeof createAssetRestContext;
  createAssetClient: () => Pick<
    ReturnType<typeof createAssetClient>,
    "readFile"
  >;
  previewAssetResourceQuery: typeof previewAssetResourceQuery;
};

const defaultDependencies: Dependencies = {
  createAssetRestContext,
  createAssetClient,
  previewAssetResourceQuery,
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
  if (isBuilder(request) === false) {
    return failure({
      code: "FORBIDDEN",
      message: "Asset query preview can only be accessed from the builder",
      status: 403,
    });
  }
  const { projectId } = parseBuilderUrl(request.url);
  if (projectId === undefined) {
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
    const context = await dependencies.createAssetRestContext(request);
    const result = await dependencies.previewAssetResourceQuery({
      projectId,
      request: parsed,
      context,
      assetClient: dependencies.createAssetClient(),
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
