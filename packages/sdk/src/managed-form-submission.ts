import {
  formBotFieldName,
  formIdFieldName,
  managedFormArrayNamesFieldName,
  managedFormIdFieldName,
} from "./form-fields";
import { getResourceBodyFormatError } from "./resource-loader";
import type {
  ResourceRequestGraph,
  ResourceRequestResource,
} from "./resource-loader";
import type { ResourceRequest } from "./schema/resources";

export const formDataParameterName = "formData";
export const browserInfoParameterName = "browserInfo";

export const internalFormFieldNames = new Set([
  formIdFieldName,
  managedFormIdFieldName,
  managedFormArrayNamesFieldName,
  formBotFieldName,
]);
const maxFormRequestBytes = 25 * 1024 * 1024;
export const maxFormTeamEmailDeliveries = 5;

export type ManagedFormResult = {
  resourceId: string;
  status: number;
  body: unknown;
};

export type ManagedFormError = Omit<ManagedFormResult, "resourceId"> & {
  resourceId?: string;
  message: string;
};

export type ManagedFormResponse = {
  success: boolean;
  status: number;
  results: ManagedFormResult[];
  errors: ManagedFormError[];
};

export const getManagedFormFailure = (
  message: string
): ManagedFormResponse => ({
  success: false,
  status: 400,
  results: [],
  errors: [{ status: 400, body: null, message }],
});

/** Keep only final destination status and body in the public Form response. */
export const getManagedFormResponse = (
  graph: ResourceRequestGraph,
  outcomes: Record<string, unknown>
): ManagedFormResponse => {
  const resourcesById = new Map(
    graph.resources.map((resource) => [resource.id, resource])
  );
  const results: ManagedFormResult[] = [];
  const errors: ManagedFormError[] = [];
  for (const resourceId of graph.rootIds) {
    const resource = resourcesById.get(resourceId);
    const outcome = resource && outcomes[resource.outputName];
    if (
      typeof outcome !== "object" ||
      outcome === null ||
      !("ok" in outcome) ||
      typeof outcome.ok !== "boolean" ||
      !("status" in outcome) ||
      typeof outcome.status !== "number" ||
      !("data" in outcome)
    ) {
      throw new Error("Form Resource results are incomplete");
    }
    const result = {
      resourceId,
      status: outcome.status,
      body: outcome.data,
    };
    results.push(result);
    if (outcome.ok === false) {
      const statusText =
        "statusText" in outcome && typeof outcome.statusText === "string"
          ? outcome.statusText.trim()
          : "";
      errors.push({
        ...result,
        message: statusText || `Resource request failed (${outcome.status})`,
      });
    }
  }
  return {
    success: errors.length === 0,
    status: errors.length === 0 ? 200 : 502,
    results,
    errors,
  };
};
const isEmptyFile = (value: FormDataEntryValue) =>
  typeof File !== "undefined" &&
  value instanceof File &&
  value.name === "" &&
  value.size === 0;

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
    // Browsers submit an empty File for an unselected optional file input.
    if (isEmptyFile(value)) {
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

const getReachableResources = (graph: ResourceRequestGraph) => {
  const resourcesById = new Map(
    graph.resources.map((resource) => [resource.id, resource])
  );
  const visited = new Set<string>();
  const reachable: ResourceRequestResource[] = [];
  const visit = (resourceId: string) => {
    if (visited.has(resourceId)) {
      return;
    }
    visited.add(resourceId);
    const resource = resourcesById.get(resourceId);
    if (resource === undefined) {
      return;
    }
    reachable.push(resource);
    for (const dependency of resource.dependencies) {
      visit(dependency);
    }
  };
  for (const rootId of graph.rootIds) {
    visit(rootId);
  }
  return reachable;
};

/** Reject the whole submission before any destination or dependency runs. */
export const validateManagedFormRecipientLimit = (
  graph: ResourceRequestGraph
) => {
  let deliveries = 0;
  for (const resource of getReachableResources(graph)) {
    if (resource.control === "email") {
      const count = resource.emailRecipientCount;
      if (count === undefined || !Number.isSafeInteger(count) || count < 1) {
        throw new Error("Invalid Email Resource recipient count");
      }
      deliveries += count;
      if (deliveries > maxFormTeamEmailDeliveries) {
        throw new Error(
          `Select no more than ${maxFormTeamEmailDeliveries} team email recipients per Form submission`
        );
      }
    }
  }
};

export const validateManagedFormBodyFormats = (
  graph: ResourceRequestGraph,
  formData: FormData
): ResourceRequestGraph => {
  if (
    getReachableResources(graph).some(
      (resource) => resource.control === "email"
    )
  ) {
    throw new Error(
      "Email delivery requires Webstudio Cloud and is not configured yet"
    );
  }
  const rootIds = new Set(graph.rootIds);
  const preparedRequests = new Map<string, ResourceRequest>();
  const hasUpload = Array.from(formData.values()).some(
    (value) =>
      typeof File !== "undefined" &&
      value instanceof File &&
      !isEmptyFile(value)
  );
  for (const resource of graph.resources) {
    if (resource.dependencies.length === 0) {
      const request = resource.createRequest(new Map());
      const error = getResourceBodyFormatError(request);
      if (error !== undefined) {
        throw new Error(error);
      }
      preparedRequests.set(resource.id, request);
      continue;
    }
    // A dependency's result is unavailable until it runs. The default body is
    // still known to contain all submitted fields before any request starts.
    if (
      rootIds.has(resource.id) &&
      resource.usesDefaultFormBody &&
      resource.bodyFormat === "json" &&
      hasUpload
    ) {
      throw new Error("JSON body cannot include uploaded files");
    }
  }
  return {
    ...graph,
    resources: graph.resources.map((resource) => {
      const request = preparedRequests.get(resource.id);
      return request === undefined
        ? resource
        : { ...resource, createRequest: () => request };
    }),
  };
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
