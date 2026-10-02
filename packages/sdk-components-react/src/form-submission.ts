import {
  formBotFieldName,
  formIdFieldName,
  isBraveBrowser,
  managedFormArrayNamesFieldName,
  managedFormIdFieldName,
} from "@webstudio-is/sdk/runtime";

const internalFormFieldNames = new Set([
  formBotFieldName,
  formIdFieldName,
  managedFormArrayNamesFieldName,
  managedFormIdFieldName,
]);

/** Match native FormData order while retaining repeated names and File values. */
export const getFormDataValue = (
  form: HTMLFormElement,
  submitter?: HTMLElement
) => {
  const values: Record<string, FormDataEntryValue | FormDataEntryValue[]> =
    Object.create(null);
  const repeatedNames = new Set<string>();
  for (const control of form.elements) {
    if (
      (control instanceof HTMLInputElement ||
        control instanceof HTMLSelectElement ||
        control instanceof HTMLTextAreaElement) &&
      control.name &&
      !internalFormFieldNames.has(control.name) &&
      !control.matches(":disabled")
    ) {
      if (
        control instanceof HTMLInputElement &&
        (control.type === "checkbox" ||
          (control.type === "file" && control.multiple))
      ) {
        repeatedNames.add(control.name);
        values[control.name] = [];
      }
      if (control instanceof HTMLSelectElement && control.multiple) {
        repeatedNames.add(control.name);
        values[control.name] = [];
      }
    }
  }
  const formData = submitter
    ? new FormData(form, submitter)
    : new FormData(form);
  const counts = new Map<string, number>();
  for (const [name] of formData) {
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  for (const [name, count] of counts) {
    if (count > 1) {
      repeatedNames.add(name);
    }
  }
  for (const [name, value] of formData) {
    if (internalFormFieldNames.has(name)) {
      continue;
    }
    if (repeatedNames.has(name)) {
      const current = values[name];
      if (Array.isArray(current)) {
        current.push(value);
      } else {
        values[name] = current === undefined ? [value] : [current, value];
      }
      continue;
    }
    values[name] = value;
  }
  return values;
};

/** Preserve list shape across multipart submission, including empty groups. */
export const createManagedSubmissionFormData = ({
  values,
  managedFormId,
}: {
  values: ReturnType<typeof getFormDataValue>;
  managedFormId: string;
}) => {
  const formData = new FormData();
  const arrayNames: string[] = [];
  for (const [name, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      arrayNames.push(name);
    }
    for (const item of Array.isArray(value) ? value : [value]) {
      formData.append(name, item);
    }
  }
  formData.set(managedFormArrayNamesFieldName, JSON.stringify(arrayNames));
  formData.set(managedFormIdFieldName, managedFormId);
  formData.set(
    formBotFieldName,
    isBraveBrowser() ? "brave" : Date.now().toString(16)
  );
  return formData;
};

export type BrowserInfo = {
  ip?: string;
  userAgent?: string;
  language?: string;
  referrer?: string;
};

/** The caller supplies IP from a trusted platform source, never from visitor headers. */
export const getBrowserInfo = ({
  request,
  trustedIp,
}: {
  request: Request;
  trustedIp?: string;
}): BrowserInfo => ({
  ...(trustedIp ? { ip: trustedIp } : {}),
  ...(request.headers.get("user-agent")
    ? { userAgent: request.headers.get("user-agent") ?? undefined }
    : {}),
  ...(request.headers.get("accept-language")
    ? { language: request.headers.get("accept-language") ?? undefined }
    : {}),
  ...(request.headers.get("referer")
    ? { referrer: request.headers.get("referer") ?? undefined }
    : {}),
});
