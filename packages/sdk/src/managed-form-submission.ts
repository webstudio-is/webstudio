import {
  formBotFieldName,
  formIdFieldName,
  managedFormArrayNamesFieldName,
  managedFormIdFieldName,
} from "./form-fields";

export const formDataParameterName = "formData";
export const browserInfoParameterName = "browserInfo";

const internalFormFieldNames = new Set([
  formIdFieldName,
  managedFormIdFieldName,
  managedFormArrayNamesFieldName,
  formBotFieldName,
]);
const maxFormRequestBytes = 25 * 1024 * 1024;

export const readFormDataWithLimit = async (
  request: Request,
  maximumBytes = maxFormRequestBytes
) => {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    throw new Error("Form submission is too large");
  }
  if (request.body === null) {
    return new FormData();
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw new Error("Form submission is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  return new Request(request.url, {
    method: request.method,
    headers,
    body,
    signal: request.signal,
  }).formData();
};

export const validateManagedFormBot = (formData: FormData) => {
  const formBotValue = formData.get(formBotFieldName);
  if (formBotValue == null || typeof formBotValue !== "string") {
    throw new Error("Form bot field not found");
  }
  // Brave Shields blocks the matchMedia detection used by the Form.
  if (formBotValue !== "brave") {
    const submitTime = parseInt(formBotValue, 16);
    if (
      Number.isNaN(submitTime) ||
      Math.abs(Date.now() - submitTime) > 1000 * 60 * 5
    ) {
      throw new Error(`Form bot value invalid ${formBotValue}`);
    }
  }
};

export const getManagedFormValues = (formData: FormData) => {
  const arrayNamesValues = formData.getAll(managedFormArrayNamesFieldName);
  if (
    arrayNamesValues.length !== 1 ||
    typeof arrayNamesValues[0] !== "string"
  ) {
    throw new Error("Invalid Form field groups");
  }
  let parsedNames: unknown;
  try {
    parsedNames = JSON.parse(arrayNamesValues[0]);
  } catch {
    throw new Error("Invalid Form field groups");
  }
  if (
    Array.isArray(parsedNames) === false ||
    parsedNames.some(
      (name) => typeof name !== "string" || internalFormFieldNames.has(name)
    ) ||
    new Set(parsedNames).size !== parsedNames.length
  ) {
    throw new Error("Invalid Form field groups");
  }
  const arrayNames = new Set<string>(parsedNames);
  const values: Record<string, FormDataEntryValue | FormDataEntryValue[]> =
    Object.create(null);
  for (const name of arrayNames) {
    values[name] = [];
  }
  for (const [name, value] of formData) {
    if (internalFormFieldNames.has(name)) {
      continue;
    }
    const previous = values[name];
    if (Array.isArray(previous)) {
      previous.push(value);
    } else if (previous === undefined) {
      values[name] = value;
    } else {
      values[name] = [previous, value];
    }
  }
  return values;
};

export type ManagedFormBrowserInfo = {
  ip?: string;
  userAgent?: string;
  language?: string;
  referrer?: string;
};

/** The caller supplies IP only from a trusted platform header. */
export const getManagedFormBrowserInfo = (
  request: Request,
  trustedIp?: string
): ManagedFormBrowserInfo => ({
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
