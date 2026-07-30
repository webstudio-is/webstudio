import type { ActionFunctionArgs } from "@remix-run/server-runtime";
import { assetResourceApiOperations } from "@webstudio-is/protocol/asset-resource-api";
import { executeAssetQuery } from "../shared/$resources/assets-query.server";
import { assetRestMethodNotAllowed } from "~/services/asset-rest.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (
    request.method.toLowerCase() !==
    assetResourceApiOperations.queryAssets.method
  ) {
    return assetRestMethodNotAllowed([assetResourceApiOperations.queryAssets]);
  }
  return await executeAssetQuery({ request, resourceRequest: request });
};
