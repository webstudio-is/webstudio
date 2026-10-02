import type { DataSources } from "./schema/data-sources";
import type { Instances } from "./schema/instances";
import type { Props } from "./schema/props";
import type { Resources } from "./schema/resources";
import type { ProjectMeta } from "./schema/pages";
import type { Scope } from "./scope";
import { SYSTEM_VARIABLE_ID } from "./expression";
import { getDefaultFormEmailBodyExpression } from "./email-resource";
import {
  browserInfoParameterName,
  formDataParameterName,
  internalFormFieldNames,
} from "./managed-form-submission";
import { findTreeInstanceIds } from "./instances-utils";
import {
  getResourceDataSourceIds,
  getResourceDependencyIds,
} from "./resource-dependencies";
import { generateResourceRequestFields } from "./resources-generator";

class InvalidManagedFormGraph extends Error {}

/**
 * Generate requests for a managed submission separately from page-load requests.
 * This only builds a graph; the caller must execute it through protected egress.
 */
export const generateManagedFormResources = ({
  scope,
  instances,
  dataSources,
  resources,
  forms,
  projectMeta,
  props,
  ownerEmail,
}: {
  scope: Scope;
  instances: Instances;
  dataSources: DataSources;
  resources: Resources;
  props?: Props;
  projectMeta?: ProjectMeta;
  ownerEmail?: string;
  forms: readonly {
    formId: string;
    destinationDataSourceIds: readonly string[];
  }[];
}) => {
  const propsName = scope.getName("$managedFormProps", "_managedFormProps");
  const documentsName = scope.getName(
    "$managedFormDocuments",
    "_managedFormDocuments"
  );
  // generateResources supplies the type imports in the same server module.
  let generated = `import { createJsonStringifyProxy } from "@webstudio-is/sdk/to-string";\nexport const getManagedFormResourceGraph = (formId: string, ${propsName}: { system: System; ${formDataParameterName}: unknown; ${browserInfoParameterName}: unknown }): ResourceRequestGraph | undefined => {\n`;
  generated += `  switch (formId) {\n`;

  for (const { formId, destinationDataSourceIds } of forms) {
    try {
      const formTreeIds = findTreeInstanceIds(instances, formId);
      const inputProps = Array.from(props?.values() ?? []).filter((prop) =>
        formTreeIds.has(prop.instanceId)
      );
      const passwordFieldNames: string[] = [];
      let omitDefaultEmailFormData = false;
      for (const instanceId of formTreeIds) {
        const instance = instances.get(instanceId);
        const name = inputProps.find(
          (prop) => prop.instanceId === instanceId && prop.name === "name"
        );
        const type = inputProps.find(
          (prop) => prop.instanceId === instanceId && prop.name === "type"
        );
        const tag = inputProps.find(
          (prop) => prop.instanceId === instanceId && prop.name === "tag"
        );
        const isInput =
          instance?.component === "Input" ||
          instance?.tag?.toLowerCase() === "input" ||
          (instance?.component === "Element" &&
            ((tag?.type === "string" && tag.value.toLowerCase() === "input") ||
              (tag !== undefined &&
                tag.type !== "string" &&
                (name !== undefined || type !== undefined))));
        if (!isInput) {
          continue;
        }
        if (type !== undefined && type.type !== "string") {
          omitDefaultEmailFormData = true;
        }
        if (
          type?.type === "string" &&
          type.value.toLowerCase() === "password"
        ) {
          if (name?.type === "string") {
            passwordFieldNames.push(name.value);
          } else {
            omitDefaultEmailFormData = true;
          }
        }
        if (name !== undefined && name.type !== "string") {
          omitDefaultEmailFormData = true;
        }
      }
      const formDataStringifyOptions = omitDefaultEmailFormData
        ? {
            stringifyAs:
              "Form fields omitted because an input has a dynamic name or type.",
          }
        : {
            space: 2,
            excludeKeys: [...internalFormFieldNames, ...passwordFieldNames],
            fileMetadata: true,
          };
      const rootIds: string[] = [];
      const seenRootIds = new Set<string>();
      const externalRootIds = new Set<string>();
      for (const dataSourceId of destinationDataSourceIds) {
        const dataSource = dataSources.get(dataSourceId);
        if (dataSource?.type !== "resource") {
          continue;
        }
        if (resources.has(dataSource.resourceId) === false) {
          continue;
        }
        if (formTreeIds.has(dataSource.scopeInstanceId ?? "") === false) {
          externalRootIds.add(dataSource.resourceId);
        }
        if (seenRootIds.has(dataSource.resourceId)) {
          continue;
        }
        seenRootIds.add(dataSource.resourceId);
        rootIds.push(dataSource.resourceId);
      }

      const graphResourceIds = new Set<string>();
      const externalClosureIds = new Set<string>();
      const dependenciesById = new Map<string, string[]>();
      const addResource = (resourceId: string) => {
        if (graphResourceIds.has(resourceId)) {
          return;
        }
        const resource = resources.get(resourceId);
        if (resource === undefined) {
          throw new InvalidManagedFormGraph(
            `Managed Form Resource ${resourceId} is missing`
          );
        }
        graphResourceIds.add(resourceId);
        const dependencies = Array.from(
          getResourceDependencyIds({ resource, dataSources })
        );
        dependenciesById.set(resourceId, dependencies);
        for (const dependencyId of dependencies) {
          addResource(dependencyId);
        }
      };
      for (const rootId of rootIds) {
        addResource(rootId);
      }
      const markExternalClosure = (resourceId: string) => {
        if (externalClosureIds.has(resourceId)) {
          return;
        }
        externalClosureIds.add(resourceId);
        for (const dependencyId of dependenciesById.get(resourceId) ?? []) {
          markExternalClosure(dependencyId);
        }
      };
      for (const rootId of externalRootIds) {
        markExternalClosure(rootId);
      }
      const formBoundResourceIds = new Set(
        Array.from(dataSources.values()).flatMap((dataSource) =>
          dataSource.type === "resource" &&
          formTreeIds.has(dataSource.scopeInstanceId ?? "")
            ? [dataSource.resourceId]
            : []
        )
      );
      // A Resource shared through an outside alias is not owned by this Form.
      // Its request definition must not gain access to this Form's parameters.
      const externalResourceIds = new Set(
        Array.from(dataSources.values()).flatMap((dataSource) =>
          dataSource.type === "resource" &&
          formTreeIds.has(dataSource.scopeInstanceId ?? "") === false
            ? [dataSource.resourceId]
            : []
        )
      );
      for (const resourceId of graphResourceIds) {
        const resource = resources.get(resourceId);
        if (resource === undefined) {
          continue;
        }
        const usesFormParameter = Array.from(
          getResourceDataSourceIds(resource)
        ).some((dataSourceId) => {
          const dataSource = dataSources.get(dataSourceId);
          return (
            dataSource?.type === "parameter" &&
            dataSource.scopeInstanceId === formId &&
            (dataSource.name === formDataParameterName ||
              dataSource.name === browserInfoParameterName)
          );
        });
        if (
          usesFormParameter &&
          (formBoundResourceIds.has(resourceId) === false ||
            externalResourceIds.has(resourceId) ||
            externalClosureIds.has(resourceId))
        ) {
          throw new InvalidManagedFormGraph(
            `External Resource ${resourceId} cannot bind Form data`
          );
        }
      }

      const usedDataSources: DataSources = new Map();
      let generatedRequests = "";
      for (const resourceId of graphResourceIds) {
        const resource = resources.get(resourceId);
        if (resource === undefined) {
          continue;
        }
        const requestDataSources: DataSources = new Map();
        const formDataSource = Array.from(dataSources.values()).find(
          (dataSource) =>
            dataSource.type === "parameter" &&
            dataSource.scopeInstanceId === formId &&
            dataSource.name === formDataParameterName
        );
        const browserInfoSource = Array.from(dataSources.values()).find(
          (dataSource) =>
            dataSource.type === "parameter" &&
            dataSource.scopeInstanceId === formId &&
            dataSource.name === browserInfoParameterName
        );
        const emailBodyCode =
          resource.control === "email" &&
          rootIds.includes(resourceId) &&
          formBoundResourceIds.has(resourceId) &&
          formDataSource
            ? getDefaultFormEmailBodyExpression(
                `createJsonStringifyProxy(${propsName}.${formDataParameterName} as object, ${JSON.stringify(formDataStringifyOptions)})`,
                browserInfoSource
                  ? `createJsonStringifyProxy(${propsName}.${browserInfoParameterName} as object, { space: 2 })`
                  : undefined,
                projectMeta?.emailBody
              )
            : undefined;
        const fields = generateResourceRequestFields({
          resource,
          indent: "        ",
          dataSources,
          usedDataSources: requestDataSources,
          scope,
          method: rootIds.includes(resourceId) ? "post" : undefined,
          emailBodyCode,
          projectMeta,
          ownerEmail,
        });
        const defaultFormBody =
          resource.control !== "email" &&
          rootIds.includes(resourceId) &&
          formBoundResourceIds.has(resourceId) &&
          (resource.body === undefined || resource.body.length === 0)
            ? `        body: ${propsName}.${formDataParameterName},\n`
            : "";
        const requestName = scope.getName(resource.id, resource.name);
        generatedRequests += `    const ${requestName} = (${documentsName}: ReadonlyMap<string, unknown>): ResourceRequest => {\n`;
        for (const dataSource of requestDataSources.values()) {
          usedDataSources.set(dataSource.id, dataSource);
          if (dataSource.type === "resource") {
            const name = scope.getName(dataSource.id, dataSource.name);
            generatedRequests += `      const ${name} = ${documentsName}.get(${JSON.stringify(dataSource.resourceId)});\n`;
          }
          if (
            resource.control === "email" &&
            dataSource.type === "parameter" &&
            dataSource.scopeInstanceId === formId &&
            (dataSource.name === formDataParameterName ||
              dataSource.name === browserInfoParameterName)
          ) {
            const name = scope.getName(dataSource.id, dataSource.name);
            const options =
              dataSource.name === formDataParameterName
                ? formDataStringifyOptions
                : { space: 2 };
            generatedRequests += `      const ${name} = createJsonStringifyProxy(${propsName}.${dataSource.name} as object, ${JSON.stringify(options)});\n`;
          }
        }
        generatedRequests += `      return {\n${fields}${defaultFormBody}      };\n    };\n`;
      }

      let generatedVariables = "";
      for (const dataSource of usedDataSources.values()) {
        const name = scope.getName(dataSource.id, dataSource.name);
        if (dataSource.type === "variable") {
          generatedVariables += `    const ${name} = ${JSON.stringify(dataSource.value.value)};\n`;
        }
        if (dataSource.type === "parameter") {
          if (dataSource.id === SYSTEM_VARIABLE_ID) {
            generatedVariables += `    const ${name} = ${propsName}.system;\n`;
            continue;
          }
          const formInstance = instances.get(dataSource.scopeInstanceId ?? "");
          const isFormParameter =
            formInstance?.component === "NativeForm" &&
            (dataSource.name === formDataParameterName ||
              dataSource.name === browserInfoParameterName);
          if (isFormParameter && dataSource.scopeInstanceId === formId) {
            generatedVariables += `    const ${name} = ${propsName}.${dataSource.name};\n`;
            continue;
          }
          throw new InvalidManagedFormGraph(
            `Managed Form ${formId} cannot resolve parameter ${dataSource.id}`
          );
        }
      }

      generated += `    case ${JSON.stringify(formId)}: {\n`;
      generated += generatedVariables;
      generated += generatedRequests;
      generated += `      return {\n        resources: [\n`;
      for (const resourceId of graphResourceIds) {
        const resource = resources.get(resourceId);
        if (resource === undefined) {
          continue;
        }
        const usesDefaultFormBody =
          resource.control !== "email" &&
          rootIds.includes(resourceId) &&
          formBoundResourceIds.has(resourceId) &&
          (resource.body === undefined || resource.body.length === 0);
        generated += `          { id: ${JSON.stringify(resourceId)}, outputName: ${JSON.stringify(scope.getName(resourceId, resource.name))}, dependencies: ${JSON.stringify(dependenciesById.get(resourceId) ?? [])}, ${resource.control === "email" ? 'control: "email", ' : ""}${usesDefaultFormBody ? "usesDefaultFormBody: true, " : ""}${resource.bodyFormat === undefined ? "" : `bodyFormat: ${JSON.stringify(resource.bodyFormat)}, `}createRequest: ${scope.getName(resourceId, resource.name)} },\n`;
      }
      generated += `        ],\n        rootIds: ${JSON.stringify(rootIds)},\n      };\n    }\n`;
    } catch (error) {
      if (error instanceof InvalidManagedFormGraph === false) {
        throw error;
      }
      // An invalid Form should fail its submission, not the entire site build.
      generated += `    case ${JSON.stringify(formId)}: return undefined;\n`;
    }
  }
  generated += `    default: return undefined;\n  }\n};\n`;
  return generated;
};
