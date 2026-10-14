export * from "./action";
export * from "./fields";
import {
  formBotFieldName,
  formIdFieldName,
  managedFormArrayNamesFieldName,
  managedFormIdFieldName,
} from "./fields";

export const formDataParameterName = "formData";
export const browserInfoParameterName = "browserInfo";

export const internalFormFieldNames = new Set([
  formIdFieldName,
  managedFormIdFieldName,
  managedFormArrayNamesFieldName,
  formBotFieldName,
]);

export type ManagedFormResult = {
  resourceId: string;
  resourceName: string;
  status: number;
  body: unknown;
};

export type ManagedFormError = Omit<
  ManagedFormResult,
  "resourceId" | "resourceName"
> & {
  resourceId?: string;
  resourceName?: string;
  message: string;
};

export type ManagedFormResponse = {
  success: boolean;
  status: number;
  results: ManagedFormResult[];
  errors: ManagedFormError[];
};

export type ManagedFormBrowserInfo = {
  ip?: string;
  userAgent?: string;
  language?: string;
  referrer?: string;
  pageUrl?: string;
};
