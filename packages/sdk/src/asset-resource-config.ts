import { createQuerySourceCodec } from "@webstudio-is/query-builder";
import { createAssetQueryCapabilities } from "./asset-query-capabilities";
import { assetsResourceUrl } from "./resource-loader";
import {
  assetResourceContentOptions,
  type AssetObservedFieldType,
  type AssetQueryFieldPath,
  type AssetQueryFilter,
  type AssetQuerySort,
  type AssetResourceContentOptions,
  type AssetResourceOutputSelection,
} from "./schema/asset-resource";
import type { Resource } from "./schema/resources";

const getStaticStringLiteral = (expression: string) => {
  try {
    const value = JSON.parse(expression);
    return typeof value === "string" && JSON.stringify(value) === expression
      ? value
      : undefined;
  } catch {
    return;
  }
};

export const isAssetsResource = (resource: Resource) =>
  resource.control === "system" &&
  (resource.method === "get" || resource.method === "post") &&
  getStaticStringLiteral(resource.url) === assetsResourceUrl;

export type StructuredAssetQueryFilterBinding = {
  field: AssetQueryFieldPath;
  operator: AssetQueryFilter["operator"];
  value: string;
};

export type StructuredAssetQueryWhereBinding =
  | StructuredAssetQueryFilterBinding
  | { all: StructuredAssetQueryWhereBinding[] }
  | { any: StructuredAssetQueryWhereBinding[] };

export type StructuredAssetQueryResourceConfiguration = {
  where: StructuredAssetQueryWhereBinding;
  sort: AssetQuerySort[];
  limit: string;
  offset: string;
  output: AssetResourceOutputSelection;
  content: AssetResourceContentOptions;
};

export const isConfiguredAssetsResource = (resource: Resource) =>
  resource.control === "system" &&
  resource.method === "post" &&
  getStaticStringLiteral(resource.url) === assetsResourceUrl;

const assetQuerySourceCodec = createQuerySourceCodec<
  AssetObservedFieldType,
  AssetQueryFilter["operator"],
  StructuredAssetQueryResourceConfiguration
>(createAssetQueryCapabilities({}));

export const parseStructuredAssetQueryResourceBody = (
  body: string | undefined
): StructuredAssetQueryResourceConfiguration | undefined => {
  const parsed = assetQuerySourceCodec.parse(body ?? "");
  if (parsed.success === false) {
    return;
  }
  return parsed.value;
};

export const createStructuredAssetQueryResourceBody = ({
  where,
  sort,
  limit,
  offset,
  output = { mode: "all" },
  content,
}: StructuredAssetQueryResourceConfiguration) =>
  assetQuerySourceCodec.format({
    where,
    sort,
    limit,
    offset,
    output,
    content: assetResourceContentOptions.parse(content),
  });
