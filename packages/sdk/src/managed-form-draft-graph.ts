import { encodeDataVariableId, SYSTEM_VARIABLE_ID } from "./expression";
import {
  getFormEmailFieldNames,
  getFormEmailStringifyOptions,
} from "./form-email-fields";
import {
  browserInfoParameterName,
  formDataParameterName,
} from "./managed-form-submission";
import {
  getDefaultFormEmailBodyExpression,
  resolveEmailResourceSettings,
} from "./email-resource";
import {
  getResourceDataSourceIds,
  getResourceDependencyIds,
} from "./resource-dependencies";
import { findTreeInstanceIds } from "./instances-utils";
import { createJsonStringifyProxy } from "./to-string";
import type { DataSources } from "./schema/data-sources";
import type { Instances } from "./schema/instances";
import type { Props } from "./schema/props";
import type { ProjectMeta, System } from "./schema/pages";
import type { ResourceRequest, Resources } from "./schema/resources";
import type { ResourceRequestGraph } from "./resource-loader";

/** Construct a draft graph from data without evaluating project-authored code in Node. */
export const createManagedFormDraftGraph = ({
  formId,
  destinationDataSourceIds,
  instances,
  dataSources,
  resources,
  props,
  projectMeta,
  ownerEmail,
  ownerName,
  system,
  formData,
  browserInfo,
  evaluateExpression,
}: {
  formId: string;
  destinationDataSourceIds: readonly string[];
  instances: Instances;
  dataSources: DataSources;
  resources: Resources;
  props: Props;
  projectMeta?: ProjectMeta;
  ownerEmail?: string;
  ownerName?: string;
  system: System;
  formData: Record<string, unknown>;
  browserInfo: Record<string, unknown>;
  evaluateExpression: (
    expression: string,
    values: ReadonlyMap<string, unknown>
  ) => unknown;
}): ResourceRequestGraph => {
  const formTreeIds = findTreeInstanceIds(instances, formId);
  if (instances.get(formId)?.component !== "NativeForm") {
    throw new Error("Form not found");
  }
  const formDataStringifyOptions = getFormEmailStringifyOptions(
    instances,
    props,
    formId
  );
  const formDataProxy = createJsonStringifyProxy(
    formData,
    formDataStringifyOptions
  );
  const browserInfoProxy = createJsonStringifyProxy(browserInfo, { space: 2 });
  const formDataSource = Array.from(dataSources.values()).find(
    (source) =>
      source.type === "parameter" &&
      source.scopeInstanceId === formId &&
      source.name === formDataParameterName
  );
  const browserInfoSource = Array.from(dataSources.values()).find(
    (source) =>
      source.type === "parameter" &&
      source.scopeInstanceId === formId &&
      source.name === browserInfoParameterName
  );

  const rootIds: string[] = [];
  const externalRootIds = new Set<string>();
  for (const dataSourceId of destinationDataSourceIds) {
    const dataSource = dataSources.get(dataSourceId);
    if (
      dataSource?.type !== "resource" ||
      !resources.has(dataSource.resourceId)
    ) {
      throw new Error("Resource destination not found");
    }
    if (rootIds.includes(dataSource.resourceId)) {
      continue;
    }
    rootIds.push(dataSource.resourceId);
    if (!formTreeIds.has(dataSource.scopeInstanceId ?? "")) {
      externalRootIds.add(dataSource.resourceId);
    }
  }
  const resourceIds = new Set<string>();
  const dependenciesById = new Map<string, string[]>();
  const visit = (id: string) => {
    if (resourceIds.has(id)) {
      return;
    }
    const resource = resources.get(id);
    if (resource === undefined) {
      throw new Error(`Form Resource ${id} not found`);
    }
    resourceIds.add(id);
    const dependencies = Array.from(
      getResourceDependencyIds({ resource, dataSources })
    );
    dependenciesById.set(id, dependencies);
    for (const dependency of dependencies) {
      visit(dependency);
    }
  };
  for (const id of rootIds) {
    visit(id);
  }
  const externalClosureIds = new Set<string>();
  const markExternal = (id: string) => {
    if (externalClosureIds.has(id)) {
      return;
    }
    externalClosureIds.add(id);
    for (const dependency of dependenciesById.get(id) ?? []) {
      markExternal(dependency);
    }
  };
  for (const id of externalRootIds) {
    markExternal(id);
  }
  const formBoundIds = new Set<string>();
  const externallyScopedIds = new Set<string>();
  for (const dataSource of dataSources.values()) {
    if (dataSource.type === "resource") {
      (formTreeIds.has(dataSource.scopeInstanceId ?? "")
        ? formBoundIds
        : externallyScopedIds
      ).add(dataSource.resourceId);
    }
  }
  for (const id of resourceIds) {
    const resource = resources.get(id)!;
    const sourceIds = getResourceDataSourceIds(resource);
    const usesFormData = Array.from(sourceIds).some((sourceId) => {
      const source = dataSources.get(sourceId);
      return (
        source?.type === "parameter" &&
        source.scopeInstanceId === formId &&
        (source.name === formDataParameterName ||
          source.name === browserInfoParameterName)
      );
    });
    if (
      usesFormData &&
      (!formBoundIds.has(id) ||
        externallyScopedIds.has(id) ||
        externalClosureIds.has(id))
    ) {
      throw new Error(`External Resource ${id} cannot bind Form data`);
    }
  }

  const graphResources = Array.from(resourceIds, (id) => {
    const resource = resources.get(id)!;
    const isRoot = rootIds.includes(id);
    const isFormBound = formBoundIds.has(id);
    const resolvedEmail =
      resource.control === "email"
        ? resolveEmailResourceSettings({
            settings: resource.email,
            projectMeta,
            ownerEmail,
            ownerName,
          })
        : undefined;
    if (resolvedEmail && !resolvedEmail.recipients) {
      throw new Error(
        `Managed Form Email Resource ${id} has invalid recipients`
      );
    }
    if (
      resolvedEmail?.recipientMode === "visitor" &&
      (!isFormBound ||
        !resolvedEmail.visitorEmailField ||
        !getFormEmailFieldNames(instances, props, formId).includes(
          resolvedEmail.visitorEmailField
        ))
    ) {
      throw new Error(
        `Managed Form Email Resource ${id} has invalid visitor email field`
      );
    }
    const usesDefaultFormBody =
      resource.control !== "email" &&
      isRoot &&
      isFormBound &&
      (resource.body === undefined || resource.body.length === 0);
    const createRequest = (
      documents: ReadonlyMap<string, unknown>
    ): ResourceRequest => {
      const values = new Map<string, unknown>();
      values.set(encodeDataVariableId(SYSTEM_VARIABLE_ID), system);
      if (formDataSource) {
        values.set(
          encodeDataVariableId(formDataSource.id),
          resource.control === "email" ? formDataProxy : formData
        );
      }
      if (browserInfoSource) {
        values.set(
          encodeDataVariableId(browserInfoSource.id),
          resource.control === "email" ? browserInfoProxy : browserInfo
        );
      }
      for (const sourceId of getResourceDataSourceIds(resource)) {
        const source = dataSources.get(sourceId);
        if (source === undefined) {
          continue;
        }
        let value: unknown;
        if (source.type === "variable") {
          value = source.value.value;
        }
        if (source.type === "resource") {
          value = documents.get(source.resourceId);
        }
        if (source.type === "parameter") {
          if (source.id === SYSTEM_VARIABLE_ID) {
            value = system;
          } else if (
            source.scopeInstanceId === formId &&
            source.name === formDataParameterName
          ) {
            value = resource.control === "email" ? formDataProxy : formData;
          } else if (
            source.scopeInstanceId === formId &&
            source.name === browserInfoParameterName
          ) {
            value =
              resource.control === "email" ? browserInfoProxy : browserInfo;
          } else {
            throw new Error(
              `Managed Form ${formId} cannot resolve parameter ${source.id}`
            );
          }
        }
        values.set(encodeDataVariableId(source.id), value);
      }
      const evaluate = (expression: string) =>
        evaluateExpression(expression, values);
      const email = resolvedEmail && {
        recipientMode: resolvedEmail.recipientMode,
        visitorEmailField: resolvedEmail.visitorEmailField,
        recipients: resolvedEmail.recipients!,
        sender: resolvedEmail.sender,
        fromName: resolvedEmail.fromName,
        includeAttachments: resolvedEmail.includeAttachments,
        subject: evaluate(resolvedEmail.subject) as string,
        body:
          resource.email?.body !== undefined
            ? (evaluate(resource.email.body) as string)
            : resolvedEmail.recipientMode !== "visitor" &&
                isRoot &&
                isFormBound &&
                formDataSource
              ? (evaluateExpression(
                  getDefaultFormEmailBodyExpression(
                    encodeDataVariableId(formDataSource.id),
                    browserInfoSource &&
                      encodeDataVariableId(browserInfoSource.id),
                    projectMeta?.emailBody
                  ),
                  values
                ) as string)
              : (evaluate(resolvedEmail.body) as string),
      };
      return {
        name: resource.name,
        control: resource.control,
        url: evaluate(resource.url) as string,
        searchParams: (resource.searchParams ?? []).map(({ name, value }) => ({
          name,
          value: evaluate(value),
        })),
        method: isRoot ? "post" : resource.method,
        headers: resource.headers.map(({ name, value }) => ({
          name,
          value: evaluate(value),
        })),
        ...(resource.bodyFormat ? { bodyFormat: resource.bodyFormat } : {}),
        ...(resource.body !== undefined && resource.body.length > 0
          ? { body: evaluate(resource.body) }
          : usesDefaultFormBody
            ? { body: formData }
            : {}),
        ...(email ? { email } : {}),
      };
    };
    return {
      id,
      outputName: id,
      dependencies: dependenciesById.get(id) ?? [],
      control: resource.control,
      ...(resolvedEmail
        ? {
            emailRecipientCount:
              resolvedEmail.recipientMode === "visitor"
                ? 1
                : resolvedEmail.recipients!.length,
          }
        : {}),
      ...(resolvedEmail?.recipientMode === "visitor" ? { nonfatal: true } : {}),
      ...(usesDefaultFormBody ? { usesDefaultFormBody: true } : {}),
      ...(resource.bodyFormat ? { bodyFormat: resource.bodyFormat } : {}),
      createRequest,
    };
  });
  return { resources: graphResources, rootIds };
};
