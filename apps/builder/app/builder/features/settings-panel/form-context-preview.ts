import type { ManagedFormBrowserInfo } from "@webstudio-is/sdk/runtime";
import { readPreviewFormValues } from "~/shared/preview-form-values";

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
