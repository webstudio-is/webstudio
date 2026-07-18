import { createAssetResourceRequest } from "@webstudio-is/asset-resource";
import type {
  AssetResourceQueryInput,
  ResourceRequest,
} from "@webstudio-is/sdk";
import {
  assetsFieldCatalogResourceUrl,
  assetsIndexStatusResourceUrl,
} from "@webstudio-is/sdk/runtime";
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

export const previewBuilderAssetQuery = async (
  input: AssetResourceQueryInput
) =>
  await loadBuilderAssetResource({
    request: createAssetResourceRequest(input),
  });

export const loadBuilderAssetIndexStatus = async (resourceId: string) =>
  await loadBuilderAssetResource({
    request: {
      name: "assets-index-status",
      control: "system",
      method: "get",
      url: assetsIndexStatusResourceUrl,
      searchParams: [{ name: "resourceId", value: resourceId }],
      headers: [],
    },
  });

export const loadBuilderAssetFieldCatalog = async () =>
  await loadBuilderAssetResource({
    request: {
      name: "assets-field-catalog",
      control: "system",
      method: "get",
      url: assetsFieldCatalogResourceUrl,
      searchParams: [],
      headers: [],
    },
  });
