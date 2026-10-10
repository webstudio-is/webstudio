import type { DataSource, Instances } from "@webstudio-is/sdk";
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
});

type FormPreviewContext = {
  formId?: string;
  instances?: Instances;
};

/** Identify only submission parameters available in the active NativeForm. */
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
      instances.get(source.scopeInstanceId)?.component !== "NativeForm")
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
      ? liveFormValues.get(getFormOccurrenceKey(selector, formId) ?? "") ??
        getFormDataPreview(formId)
      : getBrowserInfoPreview(liveBrowserInfo.get(formId));
  return { name, value: toPublicPreviewValue(value) };
};
