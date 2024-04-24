import { z } from "zod";
import type { ActionFunctionArgs } from "@remix-run/server-runtime";
import {
  loadResource,
  isLocalResource,
  ResourceRequest,
} from "@webstudio-is/sdk";
import { loader as siteMapLoader } from "../shared/$resources/sitemap.xml.server";

export const action = async ({ request }: ActionFunctionArgs) => {
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

  const computedResources = z
    .array(ResourceRequest)
    .parse(await request.json());
  const responses = await Promise.all(
    computedResources.map((resource) => loadResource(customFetch, resource))
  );
  const output: [ResourceRequest["id"], unknown][] = [];
  responses.forEach((response, index) => {
    const request = computedResources[index];
    output.push([request.id, response]);
  });
  return output;
};
