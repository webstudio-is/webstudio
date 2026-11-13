import type {
  DataSource,
  DataSources,
  Instances,
  Props,
} from "@webstudio-is/sdk";
import {
  decodeDataSourceVariable,
  encodeDataSourceVariable,
} from "@webstudio-is/sdk";
import { transpileExpression } from "@webstudio-is/expression";
import {
  browserInfoParameterName,
  formDataParameterName,
  type ManagedFormBrowserInfo,
} from "@webstudio-is/sdk/runtime";
import {
  getFormOccurrenceKey,
  readPreviewFormValues,
  toPublicPreviewValue,
} from "~/shared/preview-form-values";

/** Read actual browser form controls when they are mounted in this document. */
export const getFormDataPreview = (formId: string) => {
  if (typeof document === "undefined") {
    return {};
  }
  const form = Array.from(
    document.querySelectorAll<HTMLFormElement>("form[data-ws-managed-form-id]")
  ).find((element) => element.dataset.wsManagedFormId === formId);
  return form ? readPreviewFormValues(form) : {};
};

export const getBrowserInfoPreview = (
  serverInfo?: ManagedFormBrowserInfo
): ManagedFormBrowserInfo => ({
  ip: serverInfo?.ip ?? "",
  userAgent:
    serverInfo?.userAgent ??
    (typeof navigator === "undefined" ? "" : navigator.userAgent),
  language:
    serverInfo?.language ??
    (typeof navigator === "undefined" ? "" : navigator.language),
  referrer: serverInfo?.referrer ?? "",
  ...(serverInfo?.pageUrl ? { pageUrl: serverInfo.pageUrl } : {}),
});

type FormPreviewContext = {
  formId?: string;
  instances?: Instances;
};

/** Identify only submission parameters available in the active ResourceForm. */
export const getFormParameterName = (
  source: DataSource,
  { formId, instances }: FormPreviewContext
) => {
  if (
    source.type !== "parameter" ||
    source.scopeInstanceId === undefined ||
    (source.name !== formDataParameterName &&
      source.name !== browserInfoParameterName) ||
    (formId === undefined && instances === undefined) ||
    (formId !== undefined && source.scopeInstanceId !== formId) ||
    (instances !== undefined &&
      instances.get(source.scopeInstanceId)?.component !== "ResourceForm")
  ) {
    return;
  }
  return source.name;
};

/** Resolve the same public Form value for a parameter editor, Variables row, or Resource scope. */
export const resolveFormParameterPreview = (
  source: DataSource,
  {
    selector,
    liveFormValues,
    liveBrowserInfo,
    ...context
  }: FormPreviewContext & {
    selector?: readonly string[];
    liveFormValues: ReadonlyMap<string, Record<string, unknown>>;
    liveBrowserInfo: ReadonlyMap<string, ManagedFormBrowserInfo>;
  }
) => {
  const name = getFormParameterName(source, context);
  if (name === undefined) {
    return;
  }
  const formId = source.scopeInstanceId!;
  const value =
    name === formDataParameterName
      ? (liveFormValues.get(getFormOccurrenceKey(selector, formId) ?? "") ??
        getFormDataPreview(formId))
      : getBrowserInfoPreview(liveBrowserInfo.get(formId));
  return { name, value: toPublicPreviewValue(value) };
};

/** Add an example file only to autocomplete for a visible Form output variable. */
export const getFormProgressCompletionScope = ({
  instances,
  props,
  dataSources,
  scope,
}: {
  instances: Instances;
  props: Props;
  dataSources: DataSources;
  scope: Record<string, unknown>;
}) => {
  let completionScope: Record<string, unknown> | undefined;
  for (const callback of props.values()) {
    if (
      callback.name !== "onProgressChange" ||
      callback.type !== "action" ||
      instances.get(callback.instanceId)?.component !== "ResourceForm"
    ) {
      continue;
    }
    const assigned = new Set<string>();
    for (const action of callback.value) {
      try {
        transpileExpression({
          expression: action.code,
          replaceVariable: (identifier, assignee) => {
            if (assignee) {
              assigned.add(identifier);
            }
          },
        });
      } catch {
        assigned.clear();
        break;
      }
    }
    if (assigned.size !== 1) {
      continue;
    }
    const sourceId = decodeDataSourceVariable(assigned.values().next().value!);
    const source =
      sourceId === undefined ? undefined : dataSources.get(sourceId);
    if (
      source?.type !== "variable" ||
      source.scopeInstanceId !== callback.instanceId
    ) {
      continue;
    }
    const key = encodeDataSourceVariable(source.id);
    const value = scope[key];
    if (
      typeof value !== "object" ||
      value === null ||
      !("files" in value) ||
      !Array.isArray(value.files) ||
      value.files.length !== 0
    ) {
      continue;
    }
    completionScope ??= { ...scope };
    completionScope[key] = {
      ...value,
      files: [
        {
          id: "example-file",
          fieldName: "attachment",
          name: "example.txt",
          size: 0,
          type: "text/plain",
        },
      ],
    };
  }
  return completionScope;
};
