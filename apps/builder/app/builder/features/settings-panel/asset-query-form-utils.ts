import {
  assetObservedFieldType,
  assetQueryStandardFields,
  assetQueryStandardFieldTypes,
  assetResourceLimits,
  createStructuredAssetQueryResourceBody,
  parseStructuredAssetQueryResourceBody,
  type AssetObservedFieldType,
  type BuilderAssetFieldCatalog,
  type StructuredAssetQueryResourceConfiguration,
} from "@webstudio-is/sdk";
import { getExpressionErrorMessages } from "@webstudio-is/project-build/runtime";

export {
  createStructuredAssetQueryResourceBody,
  parseStructuredAssetQueryResourceBody,
};
export type { StructuredAssetQueryResourceConfiguration };

export type AssetQueryFieldOption = {
  path: string[];
  label: string;
  types: AssetObservedFieldType[];
};

const standardFieldLabels: Record<
  (typeof assetQueryStandardFields)[number],
  string
> = {
  id: "ID",
  name: "Name",
  path: "Path",
  key: "Key",
  folderId: "Folder ID",
  extension: "Extension",
  mimeType: "MIME type",
  size: "Size",
  revision: "Revision",
  excerpt: "Excerpt",
};

const fieldKey = (path: readonly string[]) => JSON.stringify(path);

export const getAssetQueryFieldOptions = ({
  catalog,
  configuredPaths,
}: {
  catalog?: BuilderAssetFieldCatalog;
  configuredPaths: readonly string[][];
}): AssetQueryFieldOption[] => {
  const options = new Map<string, AssetQueryFieldOption>(
    assetQueryStandardFields.map((field) => [
      fieldKey([field]),
      {
        path: [field],
        label: standardFieldLabels[field],
        types: [...assetQueryStandardFieldTypes[field]],
      },
    ])
  );
  for (const field of Object.values(catalog?.fields ?? {})) {
    if (field.queryPath?.[0] !== "properties") {
      continue;
    }
    options.set(fieldKey(field.queryPath), {
      path: field.queryPath,
      label: field.queryPath.join(" / "),
      types: field.types,
    });
  }
  for (const path of configuredPaths) {
    if (options.has(fieldKey(path))) {
      continue;
    }
    options.set(fieldKey(path), {
      path,
      label: path.join(" / "),
      // The catalog is advisory and may temporarily stop observing a saved
      // schemaless field. Keep every operator available until types reappear.
      types: [...assetObservedFieldType.options],
    });
  }
  return [...options.values()];
};

export const getAssetQueryFieldKey = fieldKey;

export const isEmptyAssetQueryResult = (result: unknown) =>
  typeof result === "object" &&
  result !== null &&
  "items" in result &&
  Array.isArray(result.items) &&
  result.items.length === 0;

export const getAssetQueryConfigurationError = (
  configuration: StructuredAssetQueryResourceConfiguration
) => {
  if (configuration.filters.length > assetResourceLimits.filterCount) {
    return `Use at most ${assetResourceLimits.filterCount} filters.`;
  }
  if (configuration.sort.length > assetResourceLimits.sortCount) {
    return `Use at most ${assetResourceLimits.sortCount} sort fields.`;
  }
  const expressions = [
    ...configuration.filters.map(({ value }) => value),
    configuration.limit,
    configuration.offset,
  ];
  if (
    expressions.some(
      (expression) => getExpressionErrorMessages({ expression }).length > 0
    )
  ) {
    return "Enter a valid Webstudio expression for every query value.";
  }
  try {
    createStructuredAssetQueryResourceBody(configuration);
  } catch {
    return "Complete every Assets query field.";
  }
};
