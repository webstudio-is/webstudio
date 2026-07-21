import { z } from "zod";
import { type ActionFunctionArgs, data, json } from "@remix-run/server-runtime";
import { type ResourceRequest, resourceRequest } from "@webstudio-is/sdk";
import { isLocalResource, loadResource } from "@webstudio-is/sdk/runtime";
import { parseBuilderUrl } from "@webstudio-is/protocol";
import { loader as siteMapLoader } from "../shared/$resources/sitemap.xml.server";
import { loader as currentDateLoader } from "../shared/$resources/current-date.server";
import { loader as assetsLoader } from "../shared/$resources/assets.server";
import { loader as assetsFieldCatalogLoader } from "../shared/$resources/assets-field-catalog.server";
import { loader as assetsQueryLoader } from "../shared/$resources/assets-query.server";
import { loader as assetsIndexStatusLoader } from "../shared/$resources/assets-index-status.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { checkCsrf } from "~/services/csrf-session.server";
import { getResourceKey } from "~/shared/resources";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { createLocalResourceRequest } from "./rest.resources-loader-utils";

export const action = async ({ request }: ActionFunctionArgs) => {
  preventCrossOriginCookie(request);
  await checkCsrf(request);

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
      return assetsLoader({ request });
    }

    if (isLocalResource(input, "assets/field-catalog")) {
      return assetsFieldCatalogLoader({ request });
    }

    if (isLocalResource(input, "assets/query")) {
      return assetsQueryLoader({
        request,
        resourceRequest: createLocalResourceRequest(request, input, init),
      });
    }

    if (isLocalResource(input, "assets/index-status")) {
      return assetsIndexStatusLoader({
        request,
        resourceRequest: createLocalResourceRequest(request, input, init),
      });
    }

    return fetch(input, init);
  };

  const requestJson = await request.json();
  const { sourceOrigin } = parseBuilderUrl(request.url);
  const requestList = z.array(z.unknown()).safeParse(requestJson);

  if (requestList.success === false) {
    console.error("data:", requestJson);
    throw data(requestList.error, {
      status: 400,
      headers: privateNoStoreResponseHeaders,
    });
  }

  const output = await Promise.all(
    requestList.data.map(async (item) => {
      const resource = resourceRequest.safeParse(item);
      if (resource.success === false) {
        return [
          getResourceKey(item as ResourceRequest),
          {
            ok: false,
            data: resource.error.format(),
            status: 403,
            statusText: "Resource validation error",
          },
        ];
      }
      return [
        getResourceKey(resource.data),
        await loadResource(customFetch, resource.data, sourceOrigin),
      ];
    })
  );

  return json(output, { headers: privateNoStoreResponseHeaders });
};
