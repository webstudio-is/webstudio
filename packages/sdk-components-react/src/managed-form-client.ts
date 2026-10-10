import {
  managedFormEndpointPrefix,
  managedFormRequestParamName,
} from "@webstudio-is/sdk/form-fields";
import type { ManagedFormResponse } from "@webstudio-is/sdk/runtime";
import {
  createManagedSubmissionFormData,
  type getFormDataValue,
} from "./form-submission";

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
  fetch: request = fetch,
}: {
  values: ReturnType<typeof getFormDataValue>;
  managedFormId: string;
  location: string;
  endpoint?: string;
  signal?: AbortSignal;
  fetch?: typeof fetch;
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
    const response = await request(endpoint, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
      signal,
    });
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
