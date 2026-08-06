import type { DataSources } from "./schema/data-sources";
import type { Page } from "./schema/pages";
import type { Resource, Resources } from "./schema/resources";
import type { Props } from "./schema/props";
import type { Instance, Instances } from "./schema/instances";
import type { Scope } from "./scope";
import { generateExpression, SYSTEM_VARIABLE_ID } from "./expression";
import {
  getExpressionDataSourceIds,
  getResourceDataSourceIds,
} from "./resource-dependencies";

const generateResourceRequestFields = ({
  resource,
  indent,
  dataSources,
  usedDataSources,
  scope,
}: {
  resource: Resource;
  indent: string;
  dataSources: DataSources;
  usedDataSources: DataSources;
  scope: Scope;
}) => {
  let generated = "";
  generated += `${indent}name: ${JSON.stringify(resource.name)},\n`;
  if (resource.control !== undefined) {
    generated += `${indent}control: "${resource.control}",\n`;
  }
  const url = generateExpression({
    expression: resource.url,
    dataSources,
    usedDataSources,
    scope,
  });
  generated += `${indent}url: ${url},\n`;
  generated += `${indent}searchParams: [\n`;
  for (const searchParam of resource.searchParams ?? []) {
    const value = generateExpression({
      expression: searchParam.value,
      dataSources,
      usedDataSources,
      scope,
    });
    generated += `${indent}  { name: "${searchParam.name}", value: ${value} },\n`;
  }
  generated += `${indent}],\n`;
  generated += `${indent}method: "${resource.method}",\n`;
  generated += `${indent}headers: [\n`;
  for (const header of resource.headers) {
    const value = generateExpression({
      expression: header.value,
      dataSources,
      usedDataSources,
      scope,
    });
    generated += `${indent}  { name: "${header.name}", value: ${value} },\n`;
  }
  generated += `${indent}],\n`;
  if (resource.body !== undefined && resource.body.length > 0) {
    const body = generateExpression({
      expression: resource.body,
      dataSources,
      usedDataSources,
      scope,
    });
    generated += `${indent}body: ${body},\n`;
  }
  return generated;
};

export const generateResources = ({
  scope,
  page,
  dataSources,
  props,
  resources,
  instances = new Map(),
}: {
  scope: Scope;
  page: Page;
  dataSources: DataSources;
  props: Props;
  resources: Resources;
  instances?: Instances;
}) => {
  const usedDataSources: DataSources = new Map();
  const generatedResourceIds = new Set<string>();
  const actionResourceIds = new Set<string>();
  for (const prop of props.values()) {
    if (prop.type === "resource" && resources.has(prop.value)) {
      actionResourceIds.add(prop.value);
    }
  }
  const resourceDataSourceByResourceId = new Map(
    Array.from(dataSources.values())
      .filter((dataSource) => dataSource.type === "resource")
      .map((dataSource) => [dataSource.resourceId, dataSource] as const)
  );
  const consumingExpressions: Array<string | undefined> = [
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
    if (prop.type === "expression") {
      consumingExpressions.push(prop.value);
    }
    if (prop.type === "action") {
      for (const action of prop.value) {
        consumingExpressions.push(action.code);
      }
    }
  }
  for (const instance of instances.values()) {
    for (const child of instance.children) {
      if (child.type === "expression") {
        consumingExpressions.push(child.value);
      }
    }
  }
  const rootResourceIds = new Set<string>();
  for (const dataSourceId of getExpressionDataSourceIds(consumingExpressions)) {
    const dataSource = dataSources.get(dataSourceId);
    if (dataSource?.type === "resource") {
      rootResourceIds.add(dataSource.resourceId);
    }
  }
  const usesResourceGraph = Array.from(resources.values()).some(
    (resource) =>
      resourceDataSourceByResourceId.has(resource.id) &&
      Array.from(getResourceDataSourceIds(resource)).some(
        (dataSourceId) => dataSources.get(dataSourceId)?.type === "resource"
      )
  );
  const resourceDependencies = new Map<string, string[]>();

  let generatedRequests = "";
  for (const resource of resources.values()) {
    generatedResourceIds.add(resource.id);
    const resourceName = scope.getName(resource.id, resource.name);
    if (usesResourceGraph && resourceDataSourceByResourceId.has(resource.id)) {
      const requestDataSources: DataSources = new Map();
      const fields = generateResourceRequestFields({
        resource,
        indent: "      ",
        dataSources,
        usedDataSources: requestDataSources,
        scope,
      });
      const dependencyResourceIds = new Set<string>();
      let generatedRequest = `  const ${resourceName} = (documents: ReadonlyMap<string, unknown>): ResourceRequest => {\n`;
      for (const dataSource of requestDataSources.values()) {
        usedDataSources.set(dataSource.id, dataSource);
        if (dataSource.type !== "resource") {
          continue;
        }
        dependencyResourceIds.add(dataSource.resourceId);
        const name = scope.getName(dataSource.id, dataSource.name);
        generatedRequest += `    const ${name} = documents.get(${JSON.stringify(
          dataSource.resourceId
        )})\n`;
      }
      resourceDependencies.set(resource.id, Array.from(dependencyResourceIds));
      generatedRequest += `    return {\n`;
      generatedRequest += fields;
      generatedRequest += `    }\n`;
      generatedRequest += `  }\n`;
      generatedRequests += generatedRequest;
      continue;
    }
    generatedRequests += `  const ${resourceName}: ResourceRequest = {\n`;
    generatedRequests += generateResourceRequestFields({
      resource,
      indent: "    ",
      dataSources,
      usedDataSources,
      scope,
    });
    generatedRequests += `  }\n`;
  }

  let generatedVariables = "";
  for (const dataSource of usedDataSources.values()) {
    if (dataSource.type === "variable") {
      const name = scope.getName(dataSource.id, dataSource.name);
      const value = JSON.stringify(dataSource.value.value);
      generatedVariables += `  let ${name} = ${value}\n`;
    }

    if (dataSource.type === "parameter") {
      // support only page system parameter
      if (
        dataSource.id === page.systemDataSourceId ||
        dataSource.id === SYSTEM_VARIABLE_ID
      ) {
        const name = scope.getName(dataSource.id, dataSource.name);
        generatedVariables += `  const ${name} = _props.system\n`;
      }
    }
  }

  let generated = "";
  generated += `import type { System, ResourceRequest } from "@webstudio-is/sdk";\n`;
  if (usesResourceGraph) {
    generated += `import type { ResourceRequestGraph } from "@webstudio-is/sdk/runtime";\n`;
  }
  generated += `export const getResources = (_props: { system: System }) => {\n`;
  generated += generatedVariables;
  generated += generatedRequests;

  if (usesResourceGraph) {
    generated += `  const _data: ResourceRequestGraph = {\n`;
    generated += `    resources: [\n`;
    for (const [resourceId, dataSource] of resourceDataSourceByResourceId) {
      if (generatedResourceIds.has(resourceId) === false) {
        continue;
      }
      const name = scope.getName(resourceId, dataSource.name);
      const dependencies = resourceDependencies.get(resourceId) ?? [];
      generated += `      { id: ${JSON.stringify(
        resourceId
      )}, dependencies: ${JSON.stringify(
        dependencies
      )}, createRequest: ${name} },\n`;
    }
    generated += `    ],\n`;
    generated += `    rootIds: [\n`;
    for (const resourceId of rootResourceIds) {
      if (generatedResourceIds.has(resourceId)) {
        generated += `      ${JSON.stringify(resourceId)},\n`;
      }
    }
    generated += `    ],\n`;
    generated += `    outputNames: new Map([\n`;
    for (const resourceId of rootResourceIds) {
      const dataSource = resourceDataSourceByResourceId.get(resourceId);
      if (generatedResourceIds.has(resourceId) && dataSource !== undefined) {
        const name = scope.getName(resourceId, dataSource.name);
        generated += `      [${JSON.stringify(resourceId)}, ${JSON.stringify(
          name
        )}],\n`;
      }
    }
    generated += `    ]),\n`;
    generated += `  }\n`;
  } else {
    generated += `  const _data = new Map<string, ResourceRequest>([\n`;
    for (const dataSource of dataSources.values()) {
      if (
        dataSource.type === "resource" &&
        generatedResourceIds.has(dataSource.resourceId) &&
        actionResourceIds.has(dataSource.resourceId) === false
      ) {
        const name = scope.getName(dataSource.resourceId, dataSource.name);
        generated += `    ["${name}", ${name}],\n`;
      }
    }
    generated += `  ])\n`;
  }

  generated += `  const _action = new Map<string, ResourceRequest>([\n`;
  for (const prop of props.values()) {
    if (prop.type === "resource" && generatedResourceIds.has(prop.value)) {
      const name = scope.getName(prop.value, prop.name);
      generated += `    ["${name}", ${name}],\n`;
    }
  }
  generated += `  ])\n`;

  generated += `  return { data: _data, action: _action }\n`;
  generated += `}\n`;

  return generated;
};

const getMethod = (value: string | undefined) => {
  switch (value?.toLowerCase()) {
    case "get":
      return "get";
    case "delete":
      return "delete";
    case "put":
      return "put";
    default:
      return "post";
  }
};

/**
 * migrate webhook forms to resource action
 * @todo move to client migrations eventually
 */
export const replaceFormActionsWithResources = ({
  props,
  instances,
  resources,
}: {
  props: Props;
  instances: Instances;
  resources: Resources;
}) => {
  const formProps = new Map<
    Instance["id"],
    { method?: string; action?: string }
  >();
  for (const prop of props.values()) {
    if (
      prop.name === "method" &&
      prop.type === "string" &&
      instances.get(prop.instanceId)?.component === "Form"
    ) {
      let data = formProps.get(prop.instanceId);
      if (data === undefined) {
        data = {};
        formProps.set(prop.instanceId, data);
      }
      data.method = prop.value;
      props.delete(prop.id);
    }
    if (
      prop.name === "action" &&
      prop.type === "string" &&
      prop.value &&
      instances.get(prop.instanceId)?.component === "Form"
    ) {
      let data = formProps.get(prop.instanceId);
      if (data === undefined) {
        data = {};
        formProps.set(prop.instanceId, data);
      }
      data.action = prop.value;
      props.set(prop.id, {
        id: prop.id,
        instanceId: prop.instanceId,
        name: prop.name,
        type: "resource",
        value: prop.instanceId,
      });
    }
  }
  for (const [instanceId, { action, method }] of formProps) {
    if (action) {
      resources.set(instanceId, {
        id: instanceId,
        name: "action",
        method: getMethod(method),
        url: JSON.stringify(action),
        headers: [
          { name: "Content-Type", value: JSON.stringify("application/json") },
        ],
      });
    }
  }
};
