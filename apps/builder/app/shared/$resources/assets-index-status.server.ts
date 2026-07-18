import { json } from "@remix-run/server-runtime";
import { loadAssetResourceIndexStatus } from "@webstudio-is/asset-uploader/index.server";
import { parseBuilderUrl } from "@webstudio-is/protocol";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { createContext } from "../context.server";
import { isBuilder } from "../router-utils";

const failure = ({
  code,
  message,
  status,
  retryable = false,
}: {
  code: "FORBIDDEN" | "INVALID_REQUEST" | "NOT_FOUND" | "INTERNAL_ERROR";
  message: string;
  status: number;
  retryable?: boolean;
}) =>
  json(
    { ok: false, error: { code, message, retryable } },
    { status, headers: privateNoStoreResponseHeaders }
  );

export const loader = async ({
  request,
  resourceRequest,
}: {
  request: Request;
  resourceRequest: Request;
}) => {
  if (isBuilder(request) === false) {
    return failure({
      code: "FORBIDDEN",
      message: "Asset index status can only be accessed from the builder",
      status: 403,
    });
  }
  const { projectId } = parseBuilderUrl(request.url);
  const resourceId = new URL(resourceRequest.url).searchParams.get(
    "resourceId"
  );
  if (
    projectId === undefined ||
    resourceId === null ||
    resourceId.length === 0
  ) {
    return failure({
      code: "INVALID_REQUEST",
      message: "Project ID and resource ID are required to load index status",
      status: 400,
    });
  }

  try {
    const context = await createContext(request);
    const status = await loadAssetResourceIndexStatus({
      projectId,
      resourceId,
      context,
    });
    if (status === undefined) {
      return failure({
        code: "NOT_FOUND",
        message: "Asset resource index status was not found",
        status: 404,
      });
    }
    return json(
      { ok: true, status },
      { headers: privateNoStoreResponseHeaders }
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return failure({
        code: "FORBIDDEN",
        message: "You don't have access to this asset resource index",
        status: 403,
      });
    }
    return failure({
      code: "INTERNAL_ERROR",
      message: "Asset resource index status failed",
      status: 500,
      retryable: true,
    });
  }
};
