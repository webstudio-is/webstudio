import { json, type ActionFunctionArgs } from "@remix-run/server-runtime";
import isValidFilename from "valid-filename";
import {
  assetResourceApiOperations,
  assetUploadReservationRequest,
} from "@webstudio-is/protocol/asset-resource-api";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { ensureApiCsrf } from "~/services/api-auth.server";
import {
  AssetRestRequestError,
  assetRestErrorResponse,
  assetRestMethodNotAllowed,
  createAssetRestRepositoryForProject,
  readAssetRestFormData,
  readAssetRestJson,
} from "~/services/asset-rest.server";

// Keep upload commands under an explicit collection so read-only Assets API
// operations can use stable names without colliding with uploaded filenames.

export const loader = async () => {
  return assetRestMethodNotAllowed([
    assetResourceApiOperations.reserveAssetUpload,
  ]);
};

export const action = async (props: ActionFunctionArgs) => {
  const { request } = props;
  preventCrossOriginCookie(request);
  if (
    request.method.toLowerCase() !==
    assetResourceApiOperations.reserveAssetUpload.method
  ) {
    return assetRestMethodNotAllowed([
      assetResourceApiOperations.reserveAssetUpload,
    ]);
  }
  await ensureApiCsrf(request);
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const rawInput = contentType.includes("application/json")
      ? await readAssetRestJson(request)
      : Object.fromEntries(await readAssetRestFormData(request));
    const input = assetUploadReservationRequest.parse(rawInput);
    if (
      input.displayFilename !== undefined &&
      isValidFilename(input.displayFilename) === false
    ) {
      throw new AssetRestRequestError(
        "Project id, type or filename are invalid"
      );
    }
    const repository = await createAssetRestRepositoryForProject(
      request,
      input.projectId,
      "edit"
    );
    const ticket = await repository.createUploadTicket({
      type: input.type,
      filename: input.filename,
      displayFilename: input.displayFilename,
      description: input.description,
      folderId: input.folderId,
      contentHash: input.contentHash,
    });
    return json(ticket, { headers: privateNoStoreResponseHeaders });
  } catch (error) {
    return assetRestErrorResponse(error);
  }
};
