import type { ResourceRequest } from "@webstudio-is/sdk";
import { restResourcesLoader } from "./router-utils/path-utils";

export const requestResourceList = async (
  requests: readonly ResourceRequest[],
  requestFetch: typeof fetch,
  signal?: AbortSignal
) => {
  const response = await requestFetch(restResourcesLoader(), {
    method: "POST",
    body: JSON.stringify(requests),
    signal,
  });
  if (response.ok === false) {
    return;
  }
  return new Map<string, unknown>(await response.json());
};
