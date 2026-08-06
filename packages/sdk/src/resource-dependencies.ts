import { getExpressionIdentifiers } from "@webstudio-is/expression";
import { decodeDataVariableId } from "./expression";
import type { DataSource } from "./schema/data-sources";
import type { Resource } from "./schema/resources";

export const getExpressionDataSourceIds = (
  expressions: Iterable<string | undefined>
) => {
  const dataSourceIds = new Set<DataSource["id"]>();
  for (const expression of expressions) {
    if (expression === undefined) {
      continue;
    }
    for (const identifier of getExpressionIdentifiers(expression)) {
      const dataSourceId = decodeDataVariableId(identifier);
      if (dataSourceId !== undefined) {
        dataSourceIds.add(dataSourceId);
      }
    }
  }
  return dataSourceIds;
};

/** Returns data sources referenced by any expression in a resource request. */
export const getResourceDataSourceIds = (resource: Resource) => {
  return getExpressionDataSourceIds([
    resource.url,
    ...(resource.searchParams ?? []).map(({ value }) => value),
    ...resource.headers.map(({ value }) => value),
    resource.body,
  ]);
};
