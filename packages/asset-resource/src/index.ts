import {
  assetQueryRequest,
  type AssetQueryRequestInput,
  type ResourceRequest,
} from "@webstudio-is/sdk";
import { assetsResourceUrl } from "@webstudio-is/sdk/runtime";

export * from "./markdown";
export * from "./json";
export * from "./canonical";
export * from "./field-catalog";
export * from "./hydration";
export * from "./published-runtime";
export * from "./structured-query";
export * from "./asset-index";

export const createAssetResourceRequest = (
  request: AssetQueryRequestInput
): ResourceRequest => ({
  name: "assets",
  control: "system",
  method: "post",
  url: assetsResourceUrl,
  searchParams: [],
  headers: [{ name: "content-type", value: "application/json" }],
  body: assetQueryRequest.parse(request),
});
