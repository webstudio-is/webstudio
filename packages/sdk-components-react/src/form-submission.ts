import { formBotFieldName, formIdFieldName } from "@webstudio-is/sdk/runtime";

/** Match native FormData order while retaining repeated names and File values. */
export const getFormDataValue = (
  form: HTMLFormElement,
  submitter?: HTMLElement
) => {
  const values: Record<string, FormDataEntryValue | FormDataEntryValue[]> =
    Object.create(null);
  const repeatedNames = new Set<string>();
  const counts = new Map<string, number>();
  for (const control of form.elements) {
    if (
      (control instanceof HTMLInputElement ||
        control instanceof HTMLSelectElement ||
        control instanceof HTMLTextAreaElement) &&
      control.name &&
      control.name !== formBotFieldName &&
      control.name !== formIdFieldName &&
      !control.matches(":disabled")
    ) {
      counts.set(control.name, (counts.get(control.name) ?? 0) + 1);
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
  for (const [name, count] of counts) {
    if (count > 1) {
      repeatedNames.add(name);
    }
  }
  const formData = submitter
    ? new FormData(form, submitter)
    : new FormData(form);
  for (const [name, value] of formData) {
    if (name === formBotFieldName || name === formIdFieldName) {
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
