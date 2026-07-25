import { json, type ActionFunctionArgs } from "@remix-run/server-runtime";
import { PostgresAssetRepository } from "@webstudio-is/asset-uploader/index.server";
import isValidFilename from "valid-filename";
import {
  assetResourceApiOperations,
  assetUploadReservationRequest,
} from "@webstudio-is/sdk/asset-resource-api";
import { createContext } from "~/shared/context.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { checkCsrf } from "~/services/csrf-session.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { requiresAssetMutationCsrf } from "~/services/asset-rest-auth.server";
import {
  AssetRestRequestError,
  assetRestErrorResponse,
  assetRestMethodNotAllowed,
} from "~/services/asset-rest.server";
import { createAssetClient } from "~/shared/asset-client";

// Keep upload commands under an explicit collection so read-only Assets API
// operations can use stable names without colliding with uploaded filenames.

export const loader = async () => {
  return assetRestMethodNotAllowed(["POST"]);
};

export const action = async (props: ActionFunctionArgs) => {
  try {
    preventCrossOriginCookie(props.request);
    if (requiresAssetMutationCsrf(props.request)) {
      await checkCsrf(props.request);
    }

    const { request } = props;

    const context = await createContext(request);

    if (
      request.method.toLowerCase() ===
      assetResourceApiOperations.reserveAssetUpload.method
    ) {
      const contentType = request.headers.get("content-type") ?? "";
      const rawInput = contentType.includes("application/json")
        ? await request.json()
        : Object.fromEntries(await request.formData());
      const input = assetUploadReservationRequest.parse(rawInput);
      if (
        input.displayFilename !== undefined &&
        isValidFilename(input.displayFilename) === false
      ) {
        throw new AssetRestRequestError(
          "Project id, type or filename are invalid"
        );
      }
      const ticket = await new PostgresAssetRepository({
        projectId: input.projectId,
        context,
        assetClient: createAssetClient(),
      }).createUploadTicket({
        type: input.type,
        filename: input.filename,
        displayFilename: input.displayFilename,
        description: input.description,
        folderId: input.folderId,
        contentHash: input.contentHash,
      });
      return json(ticket, { headers: privateNoStoreResponseHeaders });
    }

    return assetRestMethodNotAllowed(["POST"]);
  } catch (error) {
    return assetRestErrorResponse(error);
  }
};
