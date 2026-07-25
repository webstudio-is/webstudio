import { json, type LoaderFunctionArgs } from "@remix-run/server-runtime";
import { assetResourceApiOperations } from "@webstudio-is/sdk/asset-resource-api";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import {
  assetRestErrorResponse,
  assetRestMethodNotAllowed,
  createAssetRestRepository,
} from "~/services/asset-rest.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  preventCrossOriginCookie(request);
  if (
    request.method.toLowerCase() !==
    assetResourceApiOperations.listAssets.method
  ) {
    return assetRestMethodNotAllowed(["GET"]);
  }
  try {
    const assets = await (await createAssetRestRepository(request)).list();
    return json({ assets }, { headers: privateNoStoreResponseHeaders });
  } catch (error) {
    return assetRestErrorResponse(error);
  }
};
