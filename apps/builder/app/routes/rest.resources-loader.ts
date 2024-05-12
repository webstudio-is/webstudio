import { z } from "zod";
import { json, type ActionFunctionArgs } from "@remix-run/server-runtime";
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

    throw json(computedResourcesParsed.error, {
      status: 400,
    });
  }

  const computedResources = computedResourcesParsed.data;

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
