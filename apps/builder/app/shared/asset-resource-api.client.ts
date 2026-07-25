import type { ResourceRequest } from "@webstudio-is/sdk";
import { assetsQueryCapabilitiesApiUrl } from "@webstudio-is/sdk/runtime";
import { fetch as builderFetch } from "./fetch.client";
import { restResourcesLoader } from "./router-utils";

export type BuilderResourceResult = {
  ok: boolean;
  status: number;
  statusText: string;
  data: unknown;
};

export const loadBuilderAssetResource = async ({
  request,
  fetcher = builderFetch,
}: {
  request: ResourceRequest;
  fetcher?: typeof globalThis.fetch;
}): Promise<BuilderResourceResult> => {
  const response = await fetcher(restResourcesLoader(), {
    method: "POST",
    body: JSON.stringify([request]),
  });
  if (response.ok === false) {
    throw new Error("Builder asset resource request failed");
  }
  const entries: unknown = await response.json();
  if (
    Array.isArray(entries) === false ||
    entries.length !== 1 ||
    Array.isArray(entries[0]) === false ||
    typeof entries[0][1] !== "object" ||
    entries[0][1] === null
  ) {
    throw new Error("Builder asset resource response is invalid");
  }
  return entries[0][1] as BuilderResourceResult;
};

export const loadBuilderAssetQueryCapabilities = async (
  fetcher?: typeof globalThis.fetch
) => {
  const response = await (fetcher ?? builderFetch)(
    assetsQueryCapabilitiesApiUrl
  );
  if (response.ok === false) {
    throw new Error("Builder asset query capabilities request failed");
  }
  return {
    ok: true,
    status: response.status,
    statusText: response.statusText,
    data: await response.json(),
  } satisfies BuilderResourceResult;
};
