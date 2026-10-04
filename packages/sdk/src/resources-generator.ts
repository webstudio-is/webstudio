import type { DataSource, DataSources } from "./schema/data-sources";
import type { Page, ProjectMeta } from "./schema/pages";
import { resolveEmailResourceSettings } from "./email-resource";
import type { Resource, Resources } from "./schema/resources";
import type { Prop, Props } from "./schema/props";
import type { Instance, Instances } from "./schema/instances";
import type { Scope } from "./scope";
import { generateExpression, SYSTEM_VARIABLE_ID } from "./expression";
import {
  browserInfoParameterName,
  formDataParameterName,
} from "./managed-form-submission";
import { findTreeInstanceIds } from "./instances-utils";
import {
  getExpressionDataSourceIds,
  getPageResourceRootIds,
  getResourceDependencyIds,
  getResourceDataSourceIds,
} from "./resource-dependencies";

export const generateResourceRequestFields = ({
  resource,
  indent,
  dataSources,
  usedDataSources,
  scope,
  method,
  emailBodyCode,
  resolvedEmailSettings,
  projectMeta,
  ownerEmail,
}: {
  resource: Resource;
  indent: string;
  dataSources: DataSources;
  usedDataSources: DataSources;
  scope: Scope;
  method?: Resource["method"];
  emailBodyCode?: string;
  resolvedEmailSettings?: ReturnType<typeof resolveEmailResourceSettings>;
  projectMeta?: ProjectMeta;
  ownerEmail?: string;
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
    generated += `${indent}  { name: ${JSON.stringify(searchParam.name)}, value: ${value} },\n`;
  }
  generated += `${indent}],\n`;
  generated += `${indent}method: ${JSON.stringify(method ?? resource.method)},\n`;
  if (resource.bodyFormat !== undefined) {
    generated += `${indent}bodyFormat: ${JSON.stringify(resource.bodyFormat)},\n`;
  }
  generated += `${indent}headers: [\n`;
  for (const header of resource.headers) {
    const value = generateExpression({
      expression: header.value,
      dataSources,
      usedDataSources,
      scope,
    });
    generated += `${indent}  { name: ${JSON.stringify(header.name)}, value: ${value} },\n`;
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
  if (resource.control === "email") {
    const email = resource.email ?? {};
    const resolved =
      resolvedEmailSettings ??
      resolveEmailResourceSettings({
        settings: email,
        projectMeta,
        ownerEmail,
      });
    generated += `${indent}email: {\n`;
    generated += `${indent}  recipientMode: ${JSON.stringify(resolved.recipientMode)},\n`;
    generated += `${indent}  recipients: ${JSON.stringify(resolved.recipients ?? [])},\n`;
    if (resolved.sender) {
      generated += `${indent}  sender: ${JSON.stringify(resolved.sender)},\n`;
    }
    generated += `${indent}  includeAttachments: ${resolved.includeAttachments},\n`;
    const subject = generateExpression({
      expression: resolved.subject,
      dataSources,
      usedDataSources,
      scope,
    });
    generated += `${indent}  subject: ${subject},\n`;
    if (email.body !== undefined) {
      const body = generateExpression({
        expression: email.body,
        dataSources,
        usedDataSources,
        scope,
      });
      generated += `${indent}  body: ${body},\n`;
    } else if (emailBodyCode !== undefined) {
      generated += `${indent}  body: ${emailBodyCode},\n`;
    } else {
      const body = generateExpression({
        expression: resolved.body,
        dataSources,
        usedDataSources,
        scope,
      });
      generated += `${indent}  body: ${body},\n`;
    }
    generated += `${indent}},\n`;
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
  contentBlockResourceSelections = [],
}: {
  scope: Scope;
  page: Page;
  dataSources: DataSources;
  props: Props;
  resources: Resources;
  instances?: Instances;
  contentBlockResourceSelections?: readonly {
    sourceExpression: string;
    candidates: readonly {
      assetId: string;
      resourceIds: readonly string[];
    }[];
  }[];
}) => {
  ({ props, resources } = normalizeLegacyFormBuildData({
    props,
    resources,
    instances,
  }));
  const usedDataSources: DataSources = new Map();
  const contentInputDataSourceIds = new Set<string>();
  const selectedResourceIds = new Set(
    contentBlockResourceSelections.flatMap(({ candidates }) =>
      candidates.flatMap(({ resourceIds }) => resourceIds)
    )
  );
  const pageInstanceIds = findTreeInstanceIds(instances, page.rootInstanceId);
  const actionResourceProps = Array.from(props.values()).filter(
    (prop): prop is Extract<Prop, { type: "resource" }> =>
      (instances.size === 0 || pageInstanceIds.has(prop.instanceId)) &&
      prop.type === "resource" &&
      resources.has(prop.value)
  );
  const actionResourceIds = new Set(
    actionResourceProps.map((prop) => prop.value)
  );
  const resourceDataSourceByResourceId = new Map(
    Array.from(dataSources.values())
      .filter(
        (dataSource): dataSource is Extract<DataSource, { type: "resource" }> =>
          dataSource.type === "resource" && resources.has(dataSource.resourceId)
      )
      .map((dataSource) => [dataSource.resourceId, dataSource] as const)
  );
  // Submission values exist only after the browser submits the Form. A Resource
  // that reads them must not be resolved during the page's normal data load.
  const formParameterIds = new Set(
    Array.from(dataSources.values())
      .filter(
        (dataSource) =>
          dataSource.type === "parameter" &&
          (dataSource.name === formDataParameterName ||
            dataSource.name === browserInfoParameterName) &&
          instances.get(dataSource.scopeInstanceId ?? "")?.component ===
            "NativeForm"
      )
      .map(({ id }) => id)
  );
  const submissionResourceIds = new Set(
    Array.from(resources.values())
      .filter((resource) =>
        Array.from(getResourceDataSourceIds(resource)).some((id) =>
          formParameterIds.has(id)
        )
      )
      .map(({ id }) => id)
  );
  let foundSubmissionDependency = true;
  while (foundSubmissionDependency) {
    foundSubmissionDependency = false;
    for (const resource of resources.values()) {
      if (submissionResourceIds.has(resource.id)) {
        continue;
      }
      const dependsOnSubmission = Array.from(
        getResourceDependencyIds({ resource, dataSources })
      ).some((dependencyId) => submissionResourceIds.has(dependencyId));
      if (dependsOnSubmission === false) {
        continue;
      }
      submissionResourceIds.add(resource.id);
      foundSubmissionDependency = true;
    }
  }
  for (const resourceId of selectedResourceIds) {
    if (submissionResourceIds.has(resourceId)) {
      throw new Error(
        "Dynamic Content Block Resources cannot depend on NativeForm-only inputs"
      );
    }
  }
  const rootResourceIds = getPageResourceRootIds({
    page,
    instances,
    props,
    dataSources,
  });
  for (const { sourceExpression } of contentBlockResourceSelections) {
    for (const dataSourceId of getExpressionDataSourceIds([sourceExpression])) {
      if (formParameterIds.has(dataSourceId)) {
        throw new Error(
          "Dynamic Content Block Resources cannot depend on NativeForm-only inputs"
        );
      }
      const dataSource = dataSources.get(dataSourceId);
      if (dataSource?.type === "resource") {
        if (submissionResourceIds.has(dataSource.resourceId)) {
          throw new Error(
            "Dynamic Content Block Resources cannot depend on NativeForm-only inputs"
          );
        }
        rootResourceIds.add(dataSource.resourceId);
        contentInputDataSourceIds.add(dataSource.id);
      }
    }
  }
  for (const resourceId of selectedResourceIds) {
    const resource = resources.get(resourceId);
    if (resource === undefined) {
      continue;
    }
    for (const dataSourceId of getResourceDataSourceIds(resource)) {
      const dataSource = dataSources.get(dataSourceId);
      if (dataSource?.type !== "resource") {
        continue;
      }
      if (selectedResourceIds.has(dataSource.resourceId)) {
        throw new Error(
          "Dynamic Content Block Resources cannot depend on another selected Resource"
        );
      }
      rootResourceIds.add(dataSource.resourceId);
      contentInputDataSourceIds.add(dataSource.id);
    }
  }
  const graphResourceIds = new Set<Resource["id"]>();
  const resourceDependencies = new Map<Resource["id"], Resource["id"][]>();
  const addResourceAndDependencies = (resourceId: Resource["id"]) => {
    if (submissionResourceIds.has(resourceId)) {
      return;
    }
    if (graphResourceIds.has(resourceId)) {
      return;
    }
    const resource = resources.get(resourceId);
    if (resource === undefined) {
      return;
    }
    graphResourceIds.add(resourceId);
    const dependencies = Array.from(
      getResourceDependencyIds({
        resource,
        dataSources,
      })
    );
    resourceDependencies.set(resourceId, dependencies);
    for (const dependencyId of dependencies) {
      addResourceAndDependencies(dependencyId);
    }
  };
  for (const dataSource of resourceDataSourceByResourceId.values()) {
    if (
      selectedResourceIds.has(dataSource.resourceId) === false &&
      actionResourceIds.has(dataSource.resourceId) === false
    ) {
      addResourceAndDependencies(dataSource.resourceId);
    }
  }
  for (const resourceId of rootResourceIds) {
    addResourceAndDependencies(resourceId);
  }
  for (const resourceId of actionResourceIds) {
    addResourceAndDependencies(resourceId);
  }

  let generatedRequests = "";
  for (const resource of resources.values()) {
    if (submissionResourceIds.has(resource.id)) {
      continue;
    }
    const resourceName = scope.getName(resource.id, resource.name);
    if (graphResourceIds.has(resource.id)) {
      const requestDataSources: DataSources = new Map();
      const fields = generateResourceRequestFields({
        resource,
        indent: "      ",
        dataSources,
        usedDataSources: requestDataSources,
        scope,
      });
      let generatedRequest = `  const ${resourceName} = (documents: ReadonlyMap<string, unknown>): ResourceRequest => {\n`;
      for (const dataSource of requestDataSources.values()) {
        usedDataSources.set(dataSource.id, dataSource);
        if (dataSource.type !== "resource") {
          continue;
        }
        const name = scope.getName(dataSource.id, dataSource.name);
        generatedRequest += `    const ${name} = documents.get(${JSON.stringify(
          dataSource.resourceId
        )})\n`;
      }
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
        contentInputDataSourceIds.add(dataSource.id);
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
      contentInputDataSourceIds.has(dataSource.id)
    ) {
      const name = scope.getName(dataSource.id, dataSource.name);
      const resourceName = scope.getName(
        dataSource.resourceId,
        dataSource.name
      );
      generatedVariables += `  const ${name} = _props.resources?.[${JSON.stringify(
        resourceName
      )}]\n`;
    }
  }

  let generated = "";
  generated += `import type { System, ResourceRequest } from "@webstudio-is/sdk";\n`;
  generated += `import type { ResourceRequestGraph } from "@webstudio-is/sdk/runtime";\n`;
  generated += `export const getResources = (_props: { system: System; resources?: Record<string, any> }) => {\n`;
  generated += generatedVariables;
  generated += generatedRequests;

  generated += `  const _data: ResourceRequestGraph = {\n`;
  generated += `    resources: [\n`;
  for (const resourceId of graphResourceIds) {
    const resource = resources.get(resourceId);
    if (resource === undefined) {
      continue;
    }
    const name = scope.getName(resourceId, resource.name);
    const dependencies = resourceDependencies.get(resourceId) ?? [];
    generated += `      { id: ${JSON.stringify(
      resourceId
    )}, outputName: ${JSON.stringify(name)}, dependencies: ${JSON.stringify(
      dependencies
    )}, createRequest: ${name} },\n`;
  }
  generated += `    ],\n`;
  generated += `    rootIds: [\n`;
  for (const resourceId of rootResourceIds) {
    if (
      graphResourceIds.has(resourceId) &&
      selectedResourceIds.has(resourceId) === false &&
      actionResourceIds.has(resourceId) === false
    ) {
      generated += `      ${JSON.stringify(resourceId)},\n`;
    }
  }
  generated += `    ],\n`;
  generated += `  }\n`;

  if (
    [...selectedResourceIds].some((resourceId) =>
      graphResourceIds.has(resourceId)
    )
  ) {
    generated += `  const _contentDocuments = new Map<string, unknown>([\n`;
    for (const dataSource of usedDataSources.values()) {
      if (
        dataSource.type !== "resource" ||
        contentInputDataSourceIds.has(dataSource.id) === false
      ) {
        continue;
      }
      const name = scope.getName(dataSource.id, dataSource.name);
      generated += `    [${JSON.stringify(dataSource.resourceId)}, ${name}],\n`;
    }
    generated += `  ])\n`;
  }

  generated += `  const _contentData = new Map<string, ResourceRequest>()\n`;
  for (const { source, candidates } of generatedContentSelections) {
    for (const { assetId, resourceIds } of candidates) {
      generated += `  if (${source} === ${JSON.stringify(assetId)}) {\n`;
      for (const resourceId of resourceIds) {
        const dataSource = resourceDataSourceByResourceId.get(resourceId);
        if (dataSource === undefined || actionResourceIds.has(resourceId)) {
          continue;
        }
        const name = scope.getName(resourceId, dataSource.name);
        const request = graphResourceIds.has(resourceId)
          ? `${scope.getName(resourceId, resources.get(resourceId)?.name ?? dataSource.name)}(_contentDocuments)`
          : name;
        generated += `    _contentData.set(${JSON.stringify(name)}, ${request})\n`;
      }
      generated += `  }\n`;
    }
  }

  generated += `  const _action = new Map<string, { id: string; outputName: string }>([\n`;
  for (const prop of actionResourceProps) {
    const resource = resources.get(prop.value);
    if (resource === undefined || graphResourceIds.has(prop.value) === false) {
      continue;
    }
    const name = scope.getName(prop.value, prop.name);
    const outputName = scope.getName(prop.value, resource.name);
    generated += `    ["${name}", { id: ${JSON.stringify(
      prop.value
    )}, outputName: ${JSON.stringify(outputName)} }],\n`;
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

/** Preserve saved Form string actions when building client and server output. */
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

export const normalizeLegacyFormBuildData = ({
  props,
  resources,
  instances,
}: {
  props: Props;
  resources: Resources;
  instances: Instances;
}) => {
  const normalizedProps = new Map(props);
  const normalizedResources = new Map(resources);
  replaceFormActionsWithResources({
    props: normalizedProps,
    resources: normalizedResources,
    instances,
  });
  return { props: normalizedProps, resources: normalizedResources };
};
