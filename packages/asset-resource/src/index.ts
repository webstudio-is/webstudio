import {
  assetResourceQueryRequest,
  type AssetResourceQueryInput,
  type ResourceRequest,
} from "@webstudio-is/sdk";
import { assetsQueryResourceUrl } from "@webstudio-is/sdk/runtime";

export * from "./markdown";
export * from "./canonical";
export * from "./field-catalog";
export * from "./resource-index";
export * from "./candidate-selection";
export * from "./index-storage";
export * from "./query-validation";
export * from "./hydration";
export * from "./query-execution";
export * from "./published-runtime";

export const createAssetResourceRequest = (
  request: AssetResourceQueryInput
): ResourceRequest => ({
  name: "assets-query",
  control: "system",
  method: "post",
  url: assetsQueryResourceUrl,
  searchParams: [],
  headers: [{ name: "content-type", value: "application/json" }],
  body: assetResourceQueryRequest.parse(request),
});
