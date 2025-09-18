import { z } from "zod";
import { type ActionFunctionArgs, data } from "@remix-run/server-runtime";
import { ResourceRequest } from "@webstudio-is/sdk";
import { isLocalResource, loadResource } from "@webstudio-is/sdk/runtime";
import { loader as siteMapLoader } from "../shared/$resources/sitemap.xml.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { checkCsrf } from "~/services/csrf-session.server";
import { getResourceKey } from "~/shared/resources";

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

    return fetch(input, init);
  };

  const requestJson = await request.json();
  const requestList = z.array(z.unknown()).safeParse(requestJson);

  if (requestList.success === false) {
    console.error("data:", requestJson);
    throw data(requestList.error, {
      status: 400,
    });
  }

  const output = await Promise.all(
    requestList.data.map(async (item) => {
      const resource = ResourceRequest.safeParse(item);
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
        await loadResource(customFetch, resource.data),
      ];
    })
  );

  return output;
};
