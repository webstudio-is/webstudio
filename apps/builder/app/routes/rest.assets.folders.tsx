import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/server-runtime";
import {
  assetFolderCreateRequest,
  assetResourceApiOperations,
} from "@webstudio-is/sdk/asset-resource-api";
import { requiresAssetMutationCsrf } from "~/services/asset-rest-auth.server";
import {
  assetRestErrorResponse,
  assetRestMethodNotAllowed,
  createAssetRestRepository,
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
      await createAssetRestRepository(request)
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
      await createAssetRestRepository(request)
    ).createFolder(assetFolderCreateRequest.parse(await request.json()));
    return json(
      { folder },
      { status: 201, headers: privateNoStoreResponseHeaders }
    );
  } catch (error) {
    return assetRestErrorResponse(error);
  }
};
