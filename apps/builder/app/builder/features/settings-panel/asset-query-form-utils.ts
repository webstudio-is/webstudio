import {
  assetResourceParameterName,
  assetResourceContentOptions,
  assetResourceLimits,
  normalizeAssetQueryParameterName,
  type AssetResourceContentOptions,
  type AssetResourceIndexStatus,
} from "@webstudio-is/sdk";
import { validateAssetResourceQuery } from "@webstudio-is/asset-resource";
export {
  createAssetQueryResourceBody,
  parseAssetQueryResourceBody,
} from "@webstudio-is/sdk";
export type { AssetQueryParameterBinding } from "@webstudio-is/sdk";

export const getAssetIndexStatusLabel = (
  status: AssetResourceIndexStatus | undefined
) => {
  if (status === undefined) {
    return "No index has been created yet.";
  }
  if (status.state === "indexing") {
    return status.activeRevision === undefined
      ? "Building the first index…"
      : "Building a replacement index; the last active revision is preserved.";
  }
  if (status.state === "stale") {
    return "The saved query index is stale.";
  }
  if (status.state === "failed") {
    return status.activeRevision === undefined
      ? "The index build failed."
      : "The replacement build failed; the last active revision is preserved.";
  }
  return "The query index is active.";
};

export const isEmptyAssetQueryResult = (result: unknown) =>
  result === null || (Array.isArray(result) && result.length === 0);

export const getAssetFileTypeGroqPredicate = (extension: string) =>
  `extension == ${JSON.stringify(extension)}`;

export const getAssetQueryConfigurationError = ({
  query,
  parameters,
  resultLimit,
  content,
}: {
  query: string;
  parameters: readonly { name: string }[];
  resultLimit: number;
  content: AssetResourceContentOptions;
}) => {
  let referencedParameterNames: string[];
  try {
    referencedParameterNames = validateAssetResourceQuery(query).parameterNames;
  } catch {
    return "Enter a valid GROQ query.";
  }
  if (parameters.length > assetResourceLimits.parameterCount) {
    return `Use at most ${assetResourceLimits.parameterCount} runtime parameters.`;
  }
  const names = parameters.map(({ name }) =>
    normalizeAssetQueryParameterName(name)
  );
  if (
    names.some(
      (name) => assetResourceParameterName.safeParse(name).success === false
    )
  ) {
    return "Runtime parameter names must be valid identifiers.";
  }
  if (new Set(names).size !== names.length) {
    return "Runtime parameter names must be unique.";
  }
  const configuredNames = new Set(names);
  const missingName = referencedParameterNames.find(
    (name) => configuredNames.has(name) === false
  );
  if (missingName !== undefined) {
    return `Add a runtime binding for $${missingName}.`;
  }
  if (
    Number.isSafeInteger(resultLimit) === false ||
    resultLimit < 1 ||
    resultLimit > assetResourceLimits.resultCount
  ) {
    return `Result limit must be between 1 and ${assetResourceLimits.resultCount}.`;
  }
  if (assetResourceContentOptions.safeParse(content).success === false) {
    return "Selected-file content options are outside the supported limits.";
  }
};
