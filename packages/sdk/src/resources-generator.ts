import type { DataSources } from "./schema/data-sources";
import type { Page } from "./schema/pages";
import type { Resources } from "./schema/resources";
import type { Props } from "./schema/props";
import type { Instance, Instances } from "./schema/instances";
import type { Scope } from "./scope";
import { generateExpression, SYSTEM_VARIABLE_ID } from "./expression";

export const generateResources = ({
  scope,
  page,
  dataSources,
  props,
  resources,
  contentBlockResourceSelections = [],
}: {
  scope: Scope;
  page: Page;
  dataSources: DataSources;
  props: Props;
  resources: Resources;
  contentBlockResourceSelections?: readonly {
    sourceExpression: string;
    candidates: readonly {
      assetId: string;
      resourceIds: readonly string[];
    }[];
  }[];
}) => {
  const usedDataSources: DataSources = new Map();
  const contentSelectionDataSourceIds = new Set<string>();
  const generatedResourceIds = new Set(resources.keys());
  const selectedResourceIds = new Set(
    contentBlockResourceSelections.flatMap(({ candidates }) =>
      candidates.flatMap(({ resourceIds }) => resourceIds)
    )
  );

  let generatedRequests = "";
  for (const resource of resources.values()) {
    let generatedRequest = "";
    // call resource by bound variable name
    const resourceName = scope.getName(resource.id, resource.name);
    generatedRequest += `  const ${resourceName}: ResourceRequest = {\n`;
    generatedRequest += `    name: ${JSON.stringify(resource.name)},\n`;
    if (resource.control !== undefined) {
      generatedRequest += `    control: "${resource.control}",\n`;
    }
    const url = generateExpression({
      expression: resource.url,
      dataSources,
      usedDataSources,
      scope,
    });
    generatedRequest += `    url: ${url},\n`;
    generatedRequest += `    searchParams: [\n`;
    for (const searchParam of resource.searchParams ?? []) {
      const value = generateExpression({
        expression: searchParam.value,
        dataSources,
        usedDataSources,
        scope,
      });
      generatedRequest += `      { name: "${searchParam.name}", value: ${value} },\n`;
    }
    generatedRequest += `    ],\n`;
    generatedRequest += `    method: "${resource.method}",\n`;
    generatedRequest += `    headers: [\n`;
    for (const header of resource.headers) {
      const value = generateExpression({
        expression: header.value,
        dataSources,
        usedDataSources,
        scope,
      });
      generatedRequest += `      { name: "${header.name}", value: ${value} },\n`;
    }
    generatedRequest += `    ],\n`;
    // prevent computing empty expression
    if (resource.body !== undefined && resource.body.length > 0) {
      const body = generateExpression({
        expression: resource.body,
        dataSources,
        usedDataSources,
        scope,
      });
      generatedRequest += `    body: ${body},\n`;
    }
    generatedRequest += `  }\n`;
    generatedRequests += generatedRequest;
  }

  const generatedContentSelections = contentBlockResourceSelections.map(
    ({ sourceExpression, candidates }) => {
      const selectionDataSources: DataSources = new Map();
      const source = generateExpression({
        expression: sourceExpression,
        dataSources,
        usedDataSources: selectionDataSources,
        scope,
      });
      if (candidates.some(({ resourceIds }) => resourceIds.length > 0)) {
        for (const dataSource of selectionDataSources.values()) {
          if (
            (dataSource.type === "parameter" &&
              dataSource.id !== page.systemDataSourceId &&
              dataSource.id !== SYSTEM_VARIABLE_ID) ||
            (dataSource.type === "resource" &&
              selectedResourceIds.has(dataSource.resourceId))
          ) {
            throw new Error(
              "Dynamic Content Block Resources require a source available after base Resources load"
            );
          }
        }
      }
      for (const dataSource of selectionDataSources.values()) {
        contentSelectionDataSourceIds.add(dataSource.id);
        usedDataSources.set(dataSource.id, dataSource);
      }
      return { source, candidates };
    }
  );

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
    if (
      dataSource.type === "resource" &&
      contentSelectionDataSourceIds.has(dataSource.id)
    ) {
      const name = scope.getName(dataSource.id, dataSource.name);
      const resourceName = scope.getName(
        dataSource.resourceId,
        dataSource.name
      );
      generatedVariables += `  const ${name} = _props.resources?.[${JSON.stringify(resourceName)}]\n`;
    }
  }

  let generated = "";
  generated += `import type { System, ResourceRequest } from "@webstudio-is/sdk";\n`;
  generated += `export const getResources = (_props: { system: System; resources?: Record<string, any> }) => {\n`;
  generated += generatedVariables;
  generated += generatedRequests;

  const actionResourceIds = new Set<string>();
  for (const prop of props.values()) {
    if (prop.type === "resource" && generatedResourceIds.has(prop.value)) {
      actionResourceIds.add(prop.value);
    }
  }

  generated += `  const _data = new Map<string, ResourceRequest>([\n`;
  for (const dataSource of dataSources.values()) {
    if (
      dataSource.type === "resource" &&
      generatedResourceIds.has(dataSource.resourceId) &&
      selectedResourceIds.has(dataSource.resourceId) === false &&
      actionResourceIds.has(dataSource.resourceId) === false
    ) {
      const name = scope.getName(dataSource.resourceId, dataSource.name);
      generated += `    ["${name}", ${name}],\n`;
    }
  }
  generated += `  ])\n`;

  generated += `  const _contentData = new Map<string, ResourceRequest>()\n`;
  if (contentBlockResourceSelections.length > 0) {
    for (const { source, candidates } of generatedContentSelections) {
      for (const { assetId, resourceIds } of candidates) {
        generated += `  if (${source} === ${JSON.stringify(assetId)}) {\n`;
        for (const dataSource of dataSources.values()) {
          if (
            dataSource.type !== "resource" ||
            resourceIds.includes(dataSource.resourceId) === false ||
            generatedResourceIds.has(dataSource.resourceId) === false ||
            actionResourceIds.has(dataSource.resourceId)
          ) {
            continue;
          }
          const name = scope.getName(dataSource.resourceId, dataSource.name);
          generated += `    _contentData.set(${JSON.stringify(name)}, ${name})\n`;
        }
        generated += `  }\n`;
      }
    }
  }

  generated += `  const _action = new Map<string, ResourceRequest>([\n`;
  for (const prop of props.values()) {
    if (prop.type === "resource" && generatedResourceIds.has(prop.value)) {
      const name = scope.getName(prop.value, prop.name);
      generated += `    ["${name}", ${name}],\n`;
    }
  }
  generated += `  ])\n`;

  generated += `  return { data: _data, action: _action, contentData: _contentData }\n`;
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
