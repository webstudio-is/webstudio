import { generateObjectExpression, parseObjectExpression } from "./expression";
import { assetsQueryResourceUrl, assetsResourceUrl } from "./resource-loader";
import type { Resource } from "./schema/resources";

export type AssetQueryParameterBinding = {
  name: string;
  value: string;
};

export const normalizeAssetQueryParameterName = (name: string) => name.trim();

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
              .map(({ name, value }) => ({
                name: normalizeAssetQueryParameterName(name),
                value,
              }))
              .filter(({ name }) => name.length > 0)
              .map(({ name, value }) => [name, value])
          )
        ),
      ],
      ["resultLimit", JSON.stringify(resultLimit)],
      ["content", contentExpression],
    ])
  );

export const isStoredAssetQueryResource = (resource: Resource) =>
  resource.control === "system" &&
  resource.method === "post" &&
  getStaticStringLiteral(resource.url) === assetsQueryResourceUrl;

export const isAssetsResource = (resource: Resource) =>
  isStoredAssetQueryResource(resource) ||
  (resource.control === "system" &&
    resource.method === "get" &&
    getStaticStringLiteral(resource.url) === assetsResourceUrl);

export const getAssetResourceQuery = (resource: Resource) => {
  if (isStoredAssetQueryResource(resource) === false) {
    return;
  }
  const { queryExpression } = parseAssetQueryResourceBody(resource.body);
  if (queryExpression === undefined) {
    return;
  }
  try {
    const query = JSON.parse(queryExpression);
    return typeof query === "string" && query.trim() !== "" ? query : undefined;
  } catch {
    return;
  }
};
