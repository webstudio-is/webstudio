import { json, type LoaderFunctionArgs } from "@remix-run/server-runtime";
import { assetResourceApiOperations } from "@webstudio-is/protocol/asset-resource-api";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { createAssetAction } from "~/services/asset-rest-route-handlers.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import {
  assetRestErrorResponse,
  assetRestMethodNotAllowed,
  createAssetRestRepository,
  parseAssetRestIdentifier,
} from "~/services/asset-rest.server";

export const action = createAssetAction();

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  preventCrossOriginCookie(request);
  if (
    request.method.toLowerCase() !== assetResourceApiOperations.getAsset.method
  ) {
    return assetRestMethodNotAllowed(["GET"]);
  }
  try {
    const assetId = parseAssetRestIdentifier(params.assetId);
    const asset = await (await createAssetRestRepository(request)).get(assetId);
    return json({ asset }, { headers: privateNoStoreResponseHeaders });
  } catch (error) {
    return assetRestErrorResponse(error);
  }
};
