import { z } from "zod";
import type { ActionFunctionArgs } from "@remix-run/server-runtime";
import { loadResource, ResourceRequest } from "@webstudio-is/sdk";

export const action = async ({ request }: ActionFunctionArgs) => {
  const computedResources = z
    .array(ResourceRequest)
    .parse(await request.json());
  const responses = await Promise.all(computedResources.map(loadResource));
  const output: [ResourceRequest["id"], unknown][] = [];
  responses.forEach((response, index) => {
    const request = computedResources[index];
    output.push([request.id, response]);
  });
  return output;
};
