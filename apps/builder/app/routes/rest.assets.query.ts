import type { ActionFunctionArgs } from "@remix-run/server-runtime";
import { assetResourceApiOperations } from "@webstudio-is/protocol/asset-resource-api";
import { loader as queryAssets } from "../shared/$resources/assets-query.server";

// Adapt the direct REST action to the shared System resource executor.

export const action = async ({ request }: ActionFunctionArgs) => {
  if (
    request.method.toLowerCase() !==
    assetResourceApiOperations.queryAssets.method
  ) {
    return new Response("Method not allowed", { status: 405 });
  }
  return await queryAssets({ request, resourceRequest: request });
};
