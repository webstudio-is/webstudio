import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/server-runtime";
import {
  assetFolderUpdateRequest,
  assetResourceApiOperations,
} from "@webstudio-is/protocol/asset-resource-api";
import { ensureApiCsrf } from "~/services/api-auth.server";
import {
  assetRestErrorResponse,
  assetRestMethodNotAllowed,
  createAssetRestRepository,
  parseAssetRestIdentifier,
  readAssetRestJson,
} from "~/services/asset-rest.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  preventCrossOriginCookie(request);
  if (
    request.method.toLowerCase() !==
    assetResourceApiOperations.getAssetFolder.method
  ) {
    return assetRestMethodNotAllowed([
      assetResourceApiOperations.getAssetFolder,
    ]);
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
  const method = request.method.toLowerCase();
  if (
    method !== assetResourceApiOperations.updateAssetFolder.method &&
    method !== assetResourceApiOperations.deleteAssetFolder.method
  ) {
    return assetRestMethodNotAllowed([
      assetResourceApiOperations.updateAssetFolder,
      assetResourceApiOperations.deleteAssetFolder,
    ]);
  }
  await ensureApiCsrf(request);
  try {
    const folderId = parseAssetRestIdentifier(params.folderId);
    const repository = await createAssetRestRepository(request, "edit");
    if (method === assetResourceApiOperations.updateAssetFolder.method) {
      const folder = await repository.updateFolder(
        folderId,
        assetFolderUpdateRequest.parse(await readAssetRestJson(request))
      );
      return json({ folder }, { headers: privateNoStoreResponseHeaders });
    }
    await repository.deleteFolder(folderId);
    return new Response(null, {
      status: 204,
      headers: privateNoStoreResponseHeaders,
    });
  } catch (error) {
    return assetRestErrorResponse(error);
  }
};
