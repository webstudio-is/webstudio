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

  const computedResourcesParsed = z
    .array(ResourceRequest)
    .safeParse(requestJson);

  if (computedResourcesParsed.success === false) {
    console.error(
      "computedResources.parse",
      computedResourcesParsed.error.toString()
    );
    console.error("data:", requestJson);

    throw data(computedResourcesParsed.error, {
      status: 400,
    });
  }

  const computedResources = computedResourcesParsed.data;

  const responses = await Promise.all(
    computedResources.map((resource) => loadResource(customFetch, resource))
  );
  const output: [string, unknown][] = [];
  responses.forEach((response, index) => {
    const request = computedResources[index];
    output.push([getResourceKey(request), response]);
  });
  return output;
};
