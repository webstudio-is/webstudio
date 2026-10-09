import {
  getManagedFormParameterBinding,
  getManagedFormResourcePlan,
  InvalidManagedFormGraph,
} from "./managed-form-graph";
import type { DataSources } from "./schema/data-sources";
import type { Instances } from "./schema/instances";
import type { Props } from "./schema/props";
import type { Resources } from "./schema/resources";
import type { ProjectMeta } from "./schema/pages";
import type { Scope } from "./scope";
import {
  getFormEmailFieldNames,
  getFormEmailStringifyOptions,
} from "./form-email-fields";
import {
  getDefaultFormEmailBodyExpression,
  resolveEmailResourceSettings,
} from "./email-resource";
import {
  browserInfoParameterName,
  formDataParameterName,
} from "./managed-form-submission";
import { generateResourceRequestFields } from "./resources-generator";

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
  ownerName,
  systemDataSourceId,
}: {
  scope: Scope;
  instances: Instances;
  dataSources: DataSources;
  resources: Resources;
  props?: Props;
  projectMeta?: ProjectMeta;
  ownerEmail?: string;
  ownerName?: string;
  systemDataSourceId?: string;
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
  // generateResources supplies the imports in the same server module.
  let generated = `import { createJsonStringifyProxy } from "@webstudio-is/sdk/to-string";\nexport const getManagedFormResourceGraph = (formId: string, ${propsName}: { system: System; ${formDataParameterName}: unknown; ${browserInfoParameterName}: unknown }): ResourceRequestGraph | undefined => {\n`;
  generated += `  switch (formId) {\n`;

  for (const { formId, destinationDataSourceIds } of forms) {
    try {
      const formDataStringifyOptions = getFormEmailStringifyOptions(
        instances,
        props ?? new Map(),
        formId
      );
      const {
        rootIds,
        resourceIds: graphResourceIds,
        dependenciesById,
        formBoundIds: formBoundResourceIds,
        requestErrors,
      } = getManagedFormResourcePlan({
        formId,
        destinationDataSourceIds,
        instances,
        dataSources,
        resources,
      });

      const usedDataSources: DataSources = new Map();
      const parameterCodeById = new Map<string, string>();
      const emailRecipientCounts = new Map<string, number>();
      let generatedRequests = "";
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
      for (const resourceId of graphResourceIds) {
        const resource = resources.get(resourceId);
        if (resource === undefined) {
          continue;
        }
        const requestDataSources: DataSources = new Map();
        const resolvedEmailSettings =
          resource.control === "email"
            ? resolveEmailResourceSettings({
                settings: resource.email,
                projectMeta,
                ownerEmail,
                ownerName,
              })
            : undefined;
        const hasRecipientExpression =
          resource.email?.recipientsExpression !== undefined;
        const invalidVisitorField =
          resolvedEmailSettings?.recipientMode === "visitor" &&
          (!formBoundResourceIds.has(resourceId) ||
            !resolvedEmailSettings.visitorEmailField ||
            !getFormEmailFieldNames(
              instances,
              props ?? new Map(),
              formId
            ).includes(resolvedEmailSettings.visitorEmailField));
        if (resolvedEmailSettings !== undefined) {
          if (
            !hasRecipientExpression &&
            resolvedEmailSettings.recipients === undefined
          ) {
            throw new InvalidManagedFormGraph(
              `Managed Form Email Resource ${resourceId} has invalid recipients`
            );
          }
          if (!hasRecipientExpression) {
            emailRecipientCounts.set(
              resourceId,
              resolvedEmailSettings.recipientMode === "visitor"
                ? 1
                : resolvedEmailSettings.recipients!.length
            );
          }
        }
        const emailBodyCode =
          resource.control === "email" &&
          resolvedEmailSettings?.recipientMode !== "visitor" &&
          rootIds.includes(resourceId) &&
          formDataSource
            ? getDefaultFormEmailBodyExpression(
                `createJsonStringifyProxy(${propsName}.${formDataParameterName} as object, ${JSON.stringify(
                  formDataStringifyOptions
                )})`,
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
          resolvedEmailSettings,
          projectMeta,
          ownerEmail,
        });
        const defaultFormBody =
          resource.control !== "email" &&
          rootIds.includes(resourceId) &&
          (resource.body === undefined || resource.body.length === 0)
            ? `        body: ${propsName}.${formDataParameterName},\n`
            : "";
        const requestName = scope.getName(resource.id, resource.name);
        generatedRequests += `    const ${requestName} = (${documentsName}: ReadonlyMap<string, unknown>): ResourceRequest => {\n`;
        const requestError = requestErrors.get(resourceId);
        if (requestError) {
          generatedRequests += `      throw new Error(${JSON.stringify(
            requestError
          )});\n`;
        }
        if (invalidVisitorField) {
          generatedRequests += `      throw new Error(${JSON.stringify(
            `Managed Form Email Resource ${resourceId} has invalid visitor email field`
          )});\n`;
        }
        let visitorParameterError: string | undefined;
        for (const dataSource of requestDataSources.values()) {
          if (dataSource.type === "parameter") {
            let binding: ReturnType<typeof getManagedFormParameterBinding>;
            try {
              binding = getManagedFormParameterBinding({
                source: dataSource,
                formId,
                instances,
                systemDataSourceId,
              });
            } catch (error) {
              if (!(error instanceof InvalidManagedFormGraph)) {
                throw error;
              }
              if (
                resolvedEmailSettings?.recipientMode === "visitor" &&
                rootIds.includes(resourceId)
              ) {
                // Keep optional visitor configuration errors inside its request,
                // where the shared handler can report them without blocking peers.
                visitorParameterError = error.message;
                continue;
              }
              throw error;
            }
            parameterCodeById.set(dataSource.id, `${propsName}.${binding}`);
          }
          usedDataSources.set(dataSource.id, dataSource);
          if (dataSource.type === "resource") {
            const name = scope.getName(dataSource.id, dataSource.name);
            generatedRequests += `      const ${name} = ${documentsName}.get(${JSON.stringify(
              dataSource.resourceId
            )});\n`;
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
            generatedRequests += `      const ${name} = createJsonStringifyProxy(${propsName}.${
              dataSource.name
            } as object, ${JSON.stringify(options)});\n`;
          }
        }
        if (visitorParameterError) {
          generatedRequests += `      throw new Error(${JSON.stringify(visitorParameterError)});\n    };\n`;
          continue;
        }
        generatedRequests += `      return {\n${fields}${defaultFormBody}      };\n    };\n`;
      }

      let generatedVariables = "";
      for (const dataSource of usedDataSources.values()) {
        const name = scope.getName(dataSource.id, dataSource.name);
        if (dataSource.type === "variable") {
          generatedVariables += `    const ${name} = ${JSON.stringify(
            dataSource.value.value
          )};\n`;
        }
        if (dataSource.type === "parameter") {
          generatedVariables += `    const ${name} = ${parameterCodeById.get(dataSource.id)};\n`;
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
          (resource.body === undefined || resource.body.length === 0);
        const emailRecipientCount = emailRecipientCounts.get(resourceId);
        generated += `          { id: ${JSON.stringify(
          resourceId
        )}, name: ${JSON.stringify(resource.name)}, outputName: ${JSON.stringify(
          scope.getName(resourceId, resource.name)
        )}, dependencies: ${JSON.stringify(
          dependenciesById.get(resourceId) ?? []
        )}, ${resource.control === "email" ? 'control: "email", ' : ""}${
          emailRecipientCount === undefined
            ? ""
            : `emailRecipientCount: ${emailRecipientCount}, `
        }${
          resource.email?.recipientMode === "visitor" ? "nonfatal: true, " : ""
        }${usesDefaultFormBody ? "usesDefaultFormBody: true, " : ""}${
          resource.bodyFormat === undefined
            ? ""
            : `bodyFormat: ${JSON.stringify(resource.bodyFormat)}, `
        }createRequest: ${scope.getName(resourceId, resource.name)} },\n`;
      }
      generated += `        ],\n        rootIds: ${JSON.stringify(
        rootIds
      )},\n      };\n    }\n`;
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
