import { getExpressionIdentifiers } from "@webstudio-is/expression";
import { decodeDataVariableId } from "./expression";
import type { DataSource, DataSources } from "./schema/data-sources";
import type { Resource, Resources } from "./schema/resources";

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

export const getTransitiveResourceDataSourceIds = ({
  resourceId,
  resources,
  dataSources,
}: {
  resourceId: Resource["id"];
  resources: Resources;
  dataSources: DataSources;
}) => {
  const dependencies = new Set<DataSource["id"]>();
  const visitedResourceIds = new Set<Resource["id"]>();
  const visit = (currentResourceId: Resource["id"]) => {
    if (visitedResourceIds.has(currentResourceId)) {
      return;
    }
    visitedResourceIds.add(currentResourceId);
    const resource = resources.get(currentResourceId);
    if (resource === undefined) {
      return;
    }
    for (const dataSourceId of getResourceDataSourceIds(resource)) {
      dependencies.add(dataSourceId);
      const dataSource = dataSources.get(dataSourceId);
      if (dataSource?.type === "resource") {
        visit(dataSource.resourceId);
      }
    }
  };
  visit(resourceId);
  return dependencies;
};
