import {
  getManagedFormParameterBinding,
  getManagedFormResourcePlan,
} from "./managed-form-graph";
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
  resolveEmailRecipientsExpression,
  resolveEmailSenderExpression,
  resolveEmailResourceSettings,
} from "./email-resource";
import { getResourceDataSourceIds } from "./resource-dependencies";
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

  const {
    rootIds,
    resourceIds,
    dependenciesById,
    formBoundIds,
    requestErrors,
  } = getManagedFormResourcePlan({
    formId,
    destinationDataSourceIds,
    instances,
    dataSources,
    resources,
  });

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
    const hasRecipientExpression =
      resource.email?.recipientsExpression !== undefined;
    if (
      resolvedEmail &&
      !hasRecipientExpression &&
      resolvedEmail.recipients === undefined
    ) {
      throw new Error(
        `Managed Form Email Resource ${id} has invalid recipients`
      );
    }
    const invalidVisitorField =
      resolvedEmail?.recipientMode === "visitor" &&
      (!isFormBound ||
        !resolvedEmail.visitorEmailField ||
        !getFormEmailFieldNames(instances, props, formId).includes(
          resolvedEmail.visitorEmailField
        ));
    const usesDefaultFormBody =
      resource.control !== "email" &&
      isRoot &&
      (resource.body === undefined || resource.body.length === 0);
    const createRequest = (
      documents: ReadonlyMap<string, unknown>
    ): ResourceRequest => {
      const requestError = requestErrors.get(id);
      if (requestError) {
        throw new Error(requestError);
      }
      if (invalidVisitorField) {
        throw new Error(
          `Managed Form Email Resource ${id} has invalid visitor email field`
        );
      }
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
          const binding = getManagedFormParameterBinding(
            source,
            formId,
            instances
          );
          value = {
            system,
            formData: resource.control === "email" ? formDataProxy : formData,
            browserInfo:
              resource.control === "email" ? browserInfoProxy : browserInfo,
          }[binding];
        }
        values.set(encodeDataVariableId(source.id), value);
      }
      const evaluate = (expression: string) =>
        evaluateExpression(expression, values);
      const recipients =
        resource.email?.recipientsExpression === undefined
          ? resolvedEmail?.recipients
          : resolveEmailRecipientsExpression(
              evaluate(resource.email.recipientsExpression)
            );
      const sender =
        resource.email?.senderExpression === undefined
          ? resolvedEmail?.sender
          : resolveEmailSenderExpression(
              evaluate(resource.email.senderExpression)
            );
      const email = resolvedEmail && {
        recipientMode: resolvedEmail.recipientMode,
        visitorEmailField: resolvedEmail.visitorEmailField,
        recipients: recipients!,
        sender,
        fromName: sender?.name ?? resolvedEmail.fromName,
        includeAttachments: resolvedEmail.includeAttachments,
        subject: evaluate(resolvedEmail.subject) as string,
        body:
          resource.email?.body !== undefined
            ? (evaluate(resource.email.body) as string)
            : resolvedEmail.recipientMode !== "visitor" &&
                isRoot &&
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
      name: resource.name,
      dependencies: dependenciesById.get(id) ?? [],
      control: resource.control,
      ...(resolvedEmail
        ? {
            emailRecipientCount: hasRecipientExpression
              ? undefined
              : resolvedEmail.recipientMode === "visitor"
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
