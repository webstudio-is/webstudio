import {
  formBotFieldName,
  formIdFieldName,
  managedFormArrayNamesFieldName,
  managedFormIdFieldName,
} from "./form-fields";
import { getResourceBodyFormatError, loadResources } from "./resource-loader";
import { maxEmailSubjectLength, validateEmailSubject } from "./email-resource";
import type {
  ResourceGraphLoadOptions,
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
const submissionReferenceBytes = 8;
const submissionReferenceSuffixLength = 3 + submissionReferenceBytes * 2;

const createSubmissionReference = () =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(submissionReferenceBytes)),
    (byte) => byte.toString(16).padStart(2, "0")
  ).join("");

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
  let hasFatalError = false;
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
      if (resource?.nonfatal !== true) {
        hasFatalError = true;
      }
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
    success: !hasFatalError,
    status: hasFatalError ? 502 : 200,
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
    const submitTime = /^[0-9a-f]+$/i.test(formBotValue)
      ? Number.parseInt(formBotValue, 16)
      : Number.NaN;
    if (
      !Number.isSafeInteger(submitTime) ||
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

/** Validate the original selection before optional visitor roots are removed. */
export const validateManagedFormDestinationDependencies = (
  graph: ResourceRequestGraph
) => {
  const roots = new Set(graph.rootIds);
  for (const resource of getReachableResources(graph)) {
    if (resource.dependencies.some((id) => roots.has(id))) {
      throw new Error("Selected Form Resources cannot depend on one another");
    }
  }
};

/** Reject the whole submission before any destination or dependency runs. */
export const validateManagedFormRecipientLimit = (
  graph: ResourceRequestGraph
) => {
  let deliveries = 0;
  let visitorDeliveries = 0;
  for (const resource of getReachableResources(graph)) {
    if (resource.control === "email") {
      const count = resource.emailRecipientCount;
      if (count === undefined || !Number.isSafeInteger(count) || count < 1) {
        throw new Error("Invalid Email Resource recipient count");
      }
      if (resource.nonfatal) {
        if (count !== 1) {
          throw new Error("Visitor Email Resource must have one recipient");
        }
        visitorDeliveries += 1;
        if (visitorDeliveries > 1) {
          throw new Error(
            "Select no more than one visitor Email Resource per Form submission"
          );
        }
        continue;
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
  formData: FormData,
  emailConfigured = false
): ResourceRequestGraph => {
  if (
    emailConfigured === false &&
    getReachableResources(graph).some(
      (resource) =>
        resource.control === "email" &&
        !(resource.nonfatal && graph.rootIds.includes(resource.id))
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

/** Resolve dependencies, preflight selected body formats and URL policy, then dispatch. */
export const loadManagedFormResources = async (
  customFetch: typeof fetch,
  graph: ResourceRequestGraph,
  baseUrl?: string | URL,
  options?: ResourceGraphLoadOptions & {
    validateDestination?: (url: URL) => void;
    validateEmail?: (request: ResourceRequest) => void;
  }
) => {
  const { validateDestination, validateEmail, ...loadOptions } = options ?? {};
  options?.signal?.throwIfAborted();
  validateManagedFormDestinationDependencies(graph);
  if (new Set(graph.rootIds).size !== graph.rootIds.length) {
    throw new Error(
      "Form Resource graph contains duplicate selected destinations"
    );
  }
  if (
    new Set(graph.resources.map((resource) => resource.id)).size !==
    graph.resources.length
  ) {
    throw new Error("Form Resource graph contains duplicate resource IDs");
  }
  const roots = new Set(graph.rootIds);
  const resourcesById = new Map(
    graph.resources.map((resource) => [resource.id, resource])
  );
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const dependencyIds = new Set<string>();
  const visit = (resourceId: string) => {
    if (visiting.has(resourceId)) {
      throw new Error("Form Resource graph contains a cycle");
    }
    if (visited.has(resourceId)) {
      return;
    }
    const resource = resourcesById.get(resourceId);
    if (resource === undefined) {
      throw new Error(`Form Resource ${resourceId} not found`);
    }
    visiting.add(resourceId);
    for (const childId of resource.dependencies) {
      dependencyIds.add(childId);
      visit(childId);
    }
    visiting.delete(resourceId);
    visited.add(resourceId);
  };
  for (const rootId of graph.rootIds) {
    visit(rootId);
  }
  const preparedEmailRequests = new Map<string, ResourceRequest>();
  const failedVisitorIds = new Set<string>();
  const failedVisitorResults: Record<string, unknown> = {};
  let submissionReference: string | undefined;
  for (const resource of getReachableResources(graph)) {
    if (resource.control !== "email") {
      continue;
    }
    try {
      if (
        loadOptions.sendEmail === undefined &&
        resource.nonfatal &&
        roots.has(resource.id)
      ) {
        throw new Error(
          "Email delivery requires Webstudio Cloud and is not configured yet"
        );
      }
      // Managed Form destinations run in parallel. An Email dependency could
      // dispatch a lookup before we can validate the resolved message, so Email
      // must use Form and Project values available during this preflight.
      if (resource.dependencies.length > 0) {
        throw new Error("Email Resources cannot depend on other Resources");
      }
      const request = resource.createRequest(new Map());
      validateEmailSubject(request.email?.subject);
      if (
        request.email === undefined ||
        request.email.recipients.length === 0 ||
        typeof request.email.body !== "string"
      ) {
        throw new Error("Email settings are invalid");
      }
      if (
        request.email.subject.length === 0 ||
        request.email.subject.length >
          maxEmailSubjectLength - submissionReferenceSuffixLength
      ) {
        throw new Error("Email subject is invalid");
      }
      submissionReference ??= createSubmissionReference();
      const preparedRequest = {
        ...request,
        email: {
          ...request.email,
          subject: `${request.email.subject} [${submissionReference}]`,
        },
      };
      validateEmail?.(preparedRequest);
      preparedEmailRequests.set(resource.id, preparedRequest);
    } catch (error) {
      if (!resource.nonfatal || !roots.has(resource.id)) {
        throw error;
      }
      const message =
        error instanceof Error
          ? error.message
          : "Visitor Email settings are invalid";
      failedVisitorIds.add(resource.id);
      failedVisitorResults[resource.outputName] = {
        ok: false,
        status: 400,
        statusText: message,
        data: { error: { code: "invalid_visitor_email_resource", message } },
      };
    }
  }
  graph = {
    ...graph,
    rootIds: graph.rootIds.filter((id) => !failedVisitorIds.has(id)),
    resources: graph.resources.filter(
      (resource) => !failedVisitorIds.has(resource.id)
    ),
  };
  const reachableIds = new Set(
    getReachableResources(graph).map((resource) => resource.id)
  );
  for (const id of dependencyIds) {
    if (!reachableIds.has(id)) {
      dependencyIds.delete(id);
    }
  }
  const preparedResources = graph.resources.map((resource) => {
    const request = preparedEmailRequests.get(resource.id);
    return request === undefined
      ? resource
      : { ...resource, createRequest: () => request };
  });
  const preparedById = new Map(
    preparedResources.map((resource) => [resource.id, resource])
  );
  // Dependency Resources can make outbound requests. Only selected primary
  // destinations have this deterministic preflight guarantee.
  const documents =
    dependencyIds.size === 0
      ? new Map<string, unknown>()
      : new Map(
          Object.entries(
            await loadResources(
              customFetch,
              {
                resources: preparedResources.map((resource) => ({
                  ...resource,
                  outputName: resource.id,
                })),
                rootIds: [...dependencyIds],
              },
              baseUrl,
              { ...loadOptions, retryFailedRoots: false }
            )
          )
        );
  const preparedRoots = graph.rootIds.map((rootId) => {
    options?.signal?.throwIfAborted();
    const resource = preparedById.get(rootId)!;
    const request = resource.createRequest(
      new Map(resource.dependencies.map((id) => [id, documents.get(id)]))
    );
    const error = getResourceBodyFormatError(request);
    if (error !== undefined) {
      throw new Error(error);
    }
    if (request.control !== "email" && validateDestination !== undefined) {
      const resolutionBase =
        baseUrl === undefined ? undefined : new URL("/", baseUrl);
      validateDestination(new URL(request.url.trim(), resolutionBase));
    }
    return { ...resource, dependencies: [], createRequest: () => request };
  });
  const results = await loadResources(
    customFetch,
    { resources: preparedRoots, rootIds: graph.rootIds },
    baseUrl,
    loadOptions
  );
  return { ...results, ...failedVisitorResults };
};

export type ManagedFormBrowserInfo = {
  ip?: string;
  userAgent?: string;
  language?: string;
  referrer?: string;
};

/** Referrers are diagnostic context, never a transport for URL credentials. */
const getSafeFormReferrer = (value: string | null) => {
  if (value === null) {
    return;
  }
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.origin + url.pathname;
    }
  } catch {
    // Invalid referrers are omitted from bindings and automatic email content.
  }
};

/** The caller supplies IP only from a trusted platform header. */
export const getManagedFormBrowserInfo = (
  request: Request,
  trustedIp?: string
): ManagedFormBrowserInfo => {
  const referrer = getSafeFormReferrer(request.headers.get("referer"));
  return {
    ...(trustedIp ? { ip: trustedIp } : {}),
    ...(request.headers.get("user-agent")
      ? { userAgent: request.headers.get("user-agent") ?? undefined }
      : {}),
    ...(request.headers.get("accept-language")
      ? { language: request.headers.get("accept-language") ?? undefined }
      : {}),
    ...(referrer ? { referrer } : {}),
  };
};
