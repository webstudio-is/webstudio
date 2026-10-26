import {
  managedFormEndpointPrefix,
  managedFormRequestParamName,
} from "./fields";
import type { ManagedFormResponse } from "./shared";
import {
  createManagedSubmissionFormData,
  type getFormDataValue,
} from "./browser-submission";

export type UploadProgress = {
  loaded?: number;
  total?: number;
};

/** Send one multipart body while observing only the bytes the browser measures. */
const postMultipartForm = ({
  endpoint,
  formData,
  signal,
  headers,
  onUploadProgress,
}: {
  endpoint: URL;
  formData: FormData;
  signal?: AbortSignal;
  headers?: HeadersInit;
  onUploadProgress?: (progress: UploadProgress) => void;
}) =>
  new Promise<Response>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const xhr = new XMLHttpRequest();
    const cleanup = () => signal?.removeEventListener("abort", onAbort);
    const onAbort = () => xhr.abort();
    xhr.open("POST", endpoint.href);
    for (const [name, value] of new Headers(headers)) {
      xhr.setRequestHeader(name, value);
    }
    xhr.upload.onprogress = (event) => {
      onUploadProgress?.({
        loaded: event.loaded,
        total: event.lengthComputable ? event.total : undefined,
      });
    };
    xhr.upload.onload = (event) => {
      onUploadProgress?.({
        loaded: event.loaded,
        total: event.lengthComputable ? event.total : undefined,
      });
    };
    xhr.onload = () => {
      cleanup();
      if (xhr.status === 0) {
        reject(new TypeError("Form submission failed"));
        return;
      }
      resolve(
        new Response(xhr.responseText || null, {
          status: xhr.status,
          headers: {
            "Content-Type": xhr.getResponseHeader("Content-Type") ?? "",
          },
        })
      );
    };
    xhr.onerror = () => {
      cleanup();
      reject(new TypeError("Form submission failed"));
    };
    xhr.onabort = () => {
      cleanup();
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) {
      onAbort();
      return;
    }
    try {
      xhr.send(formData);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });

const failure = (status: number, message: string): ManagedFormResponse => ({
  success: false,
  status,
  results: [],
  errors: [{ status, body: null, message }],
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isManagedFormResponse = (value: unknown): value is ManagedFormResponse =>
  isRecord(value) &&
  typeof value.success === "boolean" &&
  typeof value.status === "number" &&
  Array.isArray(value.results) &&
  value.results.every(
    (result: unknown) =>
      isRecord(result) &&
      typeof result.resourceId === "string" &&
      typeof result.status === "number" &&
      "body" in result
  ) &&
  Array.isArray(value.errors) &&
  value.errors.every(
    (error: unknown) =>
      isRecord(error) &&
      typeof error.status === "number" &&
      typeof error.message === "string" &&
      "body" in error
  );

/** Submit a Resource Form without a router provider. */
export const submitManagedForm = async ({
  values,
  managedFormId,
  location,
  endpoint: endpointOverride,
  signal,
  headers,
  fetch,
  onUploadProgress,
  onResponse,
}: {
  values: ReturnType<typeof getFormDataValue>;
  managedFormId: string;
  location: string;
  endpoint?: string;
  signal?: AbortSignal;
  headers?: HeadersInit;
  fetch?: typeof globalThis.fetch;
  onUploadProgress?: (progress: UploadProgress) => void;
  onResponse?: (response: Response) => void | Promise<void>;
}): Promise<ManagedFormResponse> => {
  const formData = createManagedSubmissionFormData({ values, managedFormId });
  const endpoint = new URL(endpointOverride ?? location, location);
  if (endpointOverride === undefined) {
    endpoint.pathname =
      endpoint.pathname === "/"
        ? managedFormEndpointPrefix
        : `${managedFormEndpointPrefix}${endpoint.pathname}`;
    endpoint.searchParams.set(managedFormRequestParamName, "1");
  }
  try {
    const response = fetch
      ? await fetch(endpoint, {
          method: "POST",
          body: formData,
          signal,
          headers,
        })
      : await postMultipartForm({
          endpoint,
          formData,
          signal,
          headers,
          onUploadProgress,
        });
    await onResponse?.(response);
    const body: unknown = await response.json();
    return isManagedFormResponse(body)
      ? body
      : failure(response.ok ? 502 : response.status, "Invalid Form response");
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    return failure(502, "Form submission failed");
  }
};
