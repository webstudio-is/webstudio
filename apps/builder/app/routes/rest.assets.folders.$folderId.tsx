import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/server-runtime";
import {
  assetFolderUpdateRequest,
  assetResourceApiOperations,
} from "@webstudio-is/protocol/asset-resource-api";
import { requiresApiCsrf } from "~/services/api-auth.server";
import {
  assetRestErrorResponse,
  assetRestMethodNotAllowed,
  createAssetRestRepository,
  parseAssetRestIdentifier,
  readAssetRestJson,
} from "~/services/asset-rest.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { checkCsrf } from "~/services/csrf-session.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  preventCrossOriginCookie(request);
  if (
    request.method.toLowerCase() !==
    assetResourceApiOperations.getAssetFolder.method
  ) {
    return assetRestMethodNotAllowed(["GET"]);
  }
  try {
    const folderId = parseAssetRestIdentifier(params.folderId);
    const folder = await (
      await createAssetRestRepository(request, "view")
    ).getFolder(folderId);
    return json({ folder }, { headers: privateNoStoreResponseHeaders });
  } catch (error) {
    return assetRestErrorResponse(error);
  }
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  preventCrossOriginCookie(request);
  if (requiresApiCsrf(request)) {
    await checkCsrf(request);
  }
  try {
    const folderId = parseAssetRestIdentifier(params.folderId);
    const repository = await createAssetRestRepository(request, "edit");
    if (
      request.method.toLowerCase() ===
      assetResourceApiOperations.updateAssetFolder.method
    ) {
      const folder = await repository.updateFolder(
        folderId,
        assetFolderUpdateRequest.parse(await readAssetRestJson(request))
      );
      return json({ folder }, { headers: privateNoStoreResponseHeaders });
    }
    if (
      request.method.toLowerCase() ===
      assetResourceApiOperations.deleteAssetFolder.method
    ) {
      await repository.deleteFolder(folderId);
      return new Response(null, {
        status: 204,
        headers: privateNoStoreResponseHeaders,
      });
    }
    return assetRestMethodNotAllowed(["PATCH", "DELETE"]);
  } catch (error) {
    return assetRestErrorResponse(error);
  }
};
