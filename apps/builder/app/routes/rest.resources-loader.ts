import { type ActionFunctionArgs, data, json } from "@remix-run/server-runtime";
import { isLocalResource } from "@webstudio-is/sdk/runtime";
import { parseBuilderUrl } from "@webstudio-is/protocol";
import { loader as siteMapLoader } from "../shared/$resources/sitemap.xml.server";
import { loader as currentDateLoader } from "../shared/$resources/current-date.server";
import { loader as assetsFieldCatalogLoader } from "./rest.assets.field-catalog";
import { executeAssetQuery } from "../shared/$resources/assets-query.server";
import { loader as assetsOpenApiLoader } from "./rest.assets.openapi[.]json";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { checkCsrf } from "~/services/csrf-session.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import {
  loadResourceRequestList,
  resourceRequestListSchema,
} from "~/services/resource-list-loader.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  preventCrossOriginCookie(request);
  await checkCsrf(request);
  const includeDiagnostics =
    new URL(request.url).searchParams.get("diagnostics") === "true";

  // Hope Remix will have customFetch by default, see https://kit.svelte.dev/docs/load#making-fetch-requests
  const customFetch: typeof fetch = (input, init) => {
    if (typeof input !== "string") {
      return fetch(input, init);
    }

    if (isLocalResource(input, "sitemap.xml")) {
      return siteMapLoader({ request });
    }

    if (isLocalResource(input, "current-date")) {
      return currentDateLoader({ request });
    }

    if (isLocalResource(input, "assets")) {
      const resourceRequest = new Request(new URL(input, request.url), init);
      return executeAssetQuery({
        request,
        resourceRequest,
        includeDiagnostics,
      });
    }

    if (isLocalResource(input, "assets/field-catalog")) {
      return assetsFieldCatalogLoader({ request });
    }

    if (isLocalResource(input, "assets/openapi.json")) {
      return assetsOpenApiLoader({ request });
    }

    return fetch(input, init);
  };

  const requestJson = await request.json();
  const { sourceOrigin } = parseBuilderUrl(request.url);
  const requestList = resourceRequestListSchema.safeParse(requestJson);

  if (requestList.success === false) {
    throw data(requestList.error, {
      status: 400,
      headers: privateNoStoreResponseHeaders,
    });
  }

  const output = await loadResourceRequestList({
    request,
    requestList: requestList.data,
    sourceOrigin,
    includeDiagnostics,
    customFetch,
  });

  return json(output, { headers: privateNoStoreResponseHeaders });
};
