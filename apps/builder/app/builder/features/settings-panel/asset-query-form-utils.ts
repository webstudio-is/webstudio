import {
  generateObjectExpression,
  parseObjectExpression,
  type AssetResourceIndexStatus,
} from "@webstudio-is/sdk";

export type AssetQueryParameterBinding = {
  name: string;
  value: string;
};

export const parseAssetQueryResourceBody = (body: string | undefined) => {
  const fields = parseObjectExpression(body ?? "");
  const parameters = parseObjectExpression(fields.get("parameters") ?? "");
  return {
    queryExpression: fields.get("query"),
    resultLimitExpression: fields.get("resultLimit"),
    contentExpression: fields.get("content"),
    parameters: Array.from(parameters, ([name, value]) => ({ name, value })),
  };
};

export const createAssetQueryResourceBody = ({
  query,
  parameters,
  resultLimit = 100,
  contentExpression = '{ "mode": "none" }',
}: {
  query: string;
  parameters: readonly AssetQueryParameterBinding[];
  resultLimit?: number;
  contentExpression?: string;
}) =>
  generateObjectExpression(
    new Map([
      ["query", JSON.stringify(query)],
      [
        "parameters",
        generateObjectExpression(
          new Map(
            parameters
              .filter(({ name }) => name.trim().length > 0)
              .map(({ name, value }) => [name, value])
          )
        ),
      ],
      ["resultLimit", JSON.stringify(resultLimit)],
      ["content", contentExpression],
    ])
  );

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
