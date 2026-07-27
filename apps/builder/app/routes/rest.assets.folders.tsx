import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/server-runtime";
import {
  assetFolderCreateRequest,
  assetResourceApiOperations,
} from "@webstudio-is/protocol/asset-resource-api";
import { requiresAssetMutationCsrf } from "~/services/asset-rest-auth.server";
import {
  assetRestErrorResponse,
  assetRestMethodNotAllowed,
  createAssetRestRepository,
  readAssetRestJson,
} from "~/services/asset-rest.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { checkCsrf } from "~/services/csrf-session.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  preventCrossOriginCookie(request);
  if (
    request.method.toLowerCase() !==
    assetResourceApiOperations.listAssetFolders.method
  ) {
    return assetRestMethodNotAllowed(["GET"]);
  }
  try {
    const folders = await (
      await createAssetRestRepository(request, "view")
    ).listFolders();
    return json({ folders }, { headers: privateNoStoreResponseHeaders });
  } catch (error) {
    return assetRestErrorResponse(error);
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  preventCrossOriginCookie(request);
  if (requiresAssetMutationCsrf(request)) {
    await checkCsrf(request);
  }
  if (
    request.method.toLowerCase() !==
    assetResourceApiOperations.createAssetFolder.method
  ) {
    return assetRestMethodNotAllowed(["POST"]);
  }
  try {
    const folder = await (
      await createAssetRestRepository(request, "edit")
    ).createFolder(
      assetFolderCreateRequest.parse(await readAssetRestJson(request))
    );
    return json(
      { folder },
      { status: 201, headers: privateNoStoreResponseHeaders }
    );
  } catch (error) {
    return assetRestErrorResponse(error);
  }
};
