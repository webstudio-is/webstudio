import { getExpressionIdentifiers } from "@webstudio-is/expression";
import { decodeDataVariableId } from "./expression";
import { findTreeInstanceIds } from "./instances-utils";
import type { DataSource, DataSources } from "./schema/data-sources";
import type { Instances } from "./schema/instances";
import type { Page } from "./schema/pages";
import type { Props } from "./schema/props";
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

export const getPageResourceRootIds = ({
  page,
  instances,
  props,
  dataSources,
}: {
  page: Pick<Page, "rootInstanceId" | "title" | "meta">;
  instances: Instances;
  props: Props;
  dataSources: DataSources;
}) => {
  const instanceIds = findTreeInstanceIds(instances, page.rootInstanceId);
  const expressions: Array<string | undefined> = [
    page.title,
    page.meta?.description,
    page.meta?.excludePageFromSearch,
    page.meta?.language,
    page.meta?.socialImageUrl,
    page.meta?.status,
    page.meta?.redirect,
    page.meta?.content,
    ...(page.meta?.custom ?? []).map(({ content }) => content),
  ];
  for (const prop of props.values()) {
    if (instances.size > 0 && instanceIds.has(prop.instanceId) === false) {
      continue;
    }
    if (prop.type === "expression") {
      expressions.push(prop.value);
    }
    if (prop.type === "action") {
      for (const action of prop.value) {
        expressions.push(action.code);
      }
    }
  }
  for (const instanceId of instanceIds) {
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      continue;
    }
    for (const child of instance.children) {
      if (child.type === "expression") {
        expressions.push(child.value);
      }
    }
  }
  const resourceIds = new Set<Resource["id"]>();
  for (const dataSourceId of getExpressionDataSourceIds(expressions)) {
    const dataSource = dataSources.get(dataSourceId);
    if (dataSource?.type === "resource") {
      resourceIds.add(dataSource.resourceId);
    }
  }
  return resourceIds;
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
      const dataSource = dataSources.get(dataSourceId);
      if (dataSource?.type !== "resource") {
        continue;
      }
      dependencies.add(dataSourceId);
      visit(dataSource.resourceId);
    }
  };
  visit(resourceId);
  return dependencies;
};
