import {
  decodeDataVariableId,
  findTreeInstanceIds,
  getAllPages,
  getFormActions,
  getPagePath,
  isFormSubmission,
  type DataSources,
  type Instances,
  type Pages,
  type Props,
  type Resources,
  type ProjectMeta,
} from "@webstudio-is/sdk";
import { createManagedFormDraftGraph } from "@webstudio-is/sdk/managed-form-draft-graph";
import {
  getManagedFormFailure,
  handleManagedFormSubmission,
  internalFormFieldNames,
  type ManagedFormResponse,
} from "@webstudio-is/sdk/form/server";
import {
  formBotFieldName,
  managedFormArrayNamesFieldName,
  managedFormIdFieldName,
} from "@webstudio-is/sdk/form-fields";
import { getSystemSearch } from "@webstudio-is/sdk/runtime";
import { matchPathnameRoutes } from "@webstudio-is/wsauth";
import { toWebstudioParams } from "@webstudio-is/react-sdk";
import { evaluateExpressionSync } from "./data";

/** The saved Form setup used by Builder Preview and server-side MCP simulation. */
export const prepareManagedFormDraft = ({
  formId,
  pageUrl,
  pages,
  instances,
  props,
  dataSources,
  resources,
  projectMeta,
  ownerEmail,
}: {
  formId: string;
  pageUrl: URL;
  pages: Pages;
  instances: Instances;
  props: Props;
  dataSources: DataSources;
  resources: Resources;
  projectMeta?: ProjectMeta;
  ownerEmail?: string;
}) => {
  const match = matchPathnameRoutes(
    getAllPages(pages).map((page) => ({
      pattern: getPagePath(page.id, pages),
      value: page,
    })),
    pageUrl.pathname
  );
  if (
    match === undefined ||
    !findTreeInstanceIds(instances, match.value.rootInstanceId).has(formId) ||
    instances.get(formId)?.component !== "Form"
  ) {
    throw new Error("Form not found on this page");
  }
  const system = {
    params: toWebstudioParams(getPagePath(match.value.id, pages), match.params),
    ...getSystemSearch(pageUrl.searchParams),
    origin: pageUrl.origin,
    pathname: pageUrl.pathname,
  };
  const actionProp = Array.from(props.values())
    .filter((prop) => prop.instanceId === formId && prop.name === "action")
    .at(-1);
  const action = actionProp?.type === "json" ? actionProp.value : undefined;
  const destinations = isFormSubmission(action) ? getFormActions(action) : [];
  const resourceIds = destinations.map((id) => {
    const source = dataSources.get(id);
    return source?.type === "resource" && resources.has(source.resourceId)
      ? source.resourceId
      : null;
  });
  const formInstanceIds = findTreeInstanceIds(instances, formId);
  const effectiveProps = new Map(
    Array.from(props.values())
      .filter((prop) => formInstanceIds.has(prop.instanceId))
      .map((prop) => [`${prop.instanceId}:${prop.name}`, prop])
  );
  const arrayNames = new Set<string>();
  for (const instanceId of formInstanceIds) {
    const instance = instances.get(instanceId);
    const name = effectiveProps.get(`${instanceId}:name`);
    if (name?.type !== "string" || !name.value) {
      continue;
    }
    const type = effectiveProps.get(`${instanceId}:type`);
    const multiple = effectiveProps.get(`${instanceId}:multiple`);
    if (
      instance?.component === "Checkbox" ||
      (instance?.component === "Input" &&
        type?.type === "string" &&
        type.value === "checkbox") ||
      (instance?.component === "Select" &&
        multiple?.type === "boolean" &&
        multiple.value === true)
    ) {
      arrayNames.add(name.value);
    }
  }
  const getGraph = (
    id: string,
    values: { system: typeof system; formData: unknown; browserInfo: unknown }
  ) =>
    createManagedFormDraftGraph({
      formId: id,
      destinationDataSourceIds: destinations,
      instances,
      props,
      dataSources,
      resources,
      projectMeta,
      ownerEmail,
      system: values.system,
      systemDataSourceId: match.value.systemDataSourceId,
      formData: values.formData as Record<string, unknown>,
      browserInfo: values.browserInfo as Record<string, unknown>,
      evaluateExpression: (expression, values) =>
        evaluateExpressionSync(
          expression,
          new Map(
            Array.from(values, ([name, value]) => [
              decodeDataVariableId(name) ?? name,
              value,
            ])
          ),
          { throwOnError: true }
        ),
    });
  return { system, action, destinations, resourceIds, arrayNames, getGraph };
};

/** Execute synthetic values through the same SDK handler as rendered Forms. */
export const simulateManagedFormDraftSubmission = async ({
  prepared,
  formId,
  pageUrl,
  values,
  arrayNames: explicitArrayNames = [],
  resourceFetch,
  createEmailSender,
  validateEmail,
}: {
  prepared: ReturnType<typeof prepareManagedFormDraft>;
  formId: string;
  pageUrl: URL;
  values: readonly { name: string; value: string }[];
  arrayNames?: readonly string[];
  resourceFetch: typeof fetch;
  createEmailSender?: Parameters<
    typeof handleManagedFormSubmission
  >[0]["createEmailSender"];
  validateEmail?: Parameters<
    typeof handleManagedFormSubmission
  >[0]["validateEmail"];
}): Promise<ManagedFormResponse> => {
  const formData = new FormData();
  formData.set(managedFormIdFieldName, formId);
  formData.set(formBotFieldName, Date.now().toString(16));
  const counts = new Map<string, number>();
  for (const { name, value } of values) {
    if (internalFormFieldNames.has(name)) {
      throw new Error("Reserved Form field name");
    }
    formData.append(name, value);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  formData.set(
    managedFormArrayNamesFieldName,
    JSON.stringify([
      ...new Set([
        ...prepared.arrayNames,
        ...explicitArrayNames.filter(
          (name) => !internalFormFieldNames.has(name)
        ),
        ...Array.from(counts, ([name, count]) =>
          count > 1 ? name : undefined
        ).filter((name) => name !== undefined),
      ]),
    ])
  );
  const request = new Request(pageUrl, { method: "POST", body: formData });
  try {
    return await handleManagedFormSubmission({
      request,
      formData,
      url: pageUrl,
      system: prepared.system,
      configuration: (id) =>
        id === formId
          ? { action: prepared.action, resourceIds: prepared.resourceIds }
          : undefined,
      getGraph: prepared.getGraph,
      resourceFetch,
      createEmailSender,
      validateEmail,
      validateDestination:
        "validateDestination" in resourceFetch &&
        typeof resourceFetch.validateDestination === "function"
          ? (resourceFetch.validateDestination as (url: URL) => void)
          : undefined,
    });
  } catch (error) {
    return getManagedFormFailure(
      error instanceof Error ? error.message : "Form submission failed"
    );
  }
};
