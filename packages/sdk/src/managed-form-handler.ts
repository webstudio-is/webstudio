import { managedFormIdFieldName } from "./form-fields";
import {
  getEnabledFormActions,
  isFormSubmission,
  validateFormSubmission,
} from "./form-submission";
import {
  getManagedFormBrowserInfo,
  getManagedFormResponse,
  getManagedFormValues,
  loadManagedFormResources,
  readFormDataWithLimit,
  validateManagedFormRecipientLimit,
  validateManagedFormBodyFormats,
  validateManagedFormBot,
  validateManagedFormDestinationDependencies,
  shouldRetryManagedFormDestination,
  type ManagedFormResponse,
  type ManagedFormResourceGraph,
} from "./managed-form-submission";
import {
  prepareVisitorEmailRequest,
  VisitorEmailAddressError,
} from "./managed-form-email";
import type { ResourceGraphLoadOptions } from "./resource-loader";
import type { EmailResourceLoadOptions } from "./email-resource-delivery";
import type { ResourceRequest } from "./schema/resources";
import type { System } from "./schema/pages";

export type ManagedFormConfiguration = {
  action: unknown;
  resourceIds: (string | null)[];
};

/** The published site and Builder Preview supply their own graph and service adapters. */
export const handleManagedFormSubmission = async ({
  request,
  formData: providedFormData,
  url = new URL(request.url),
  system,
  configuration,
  getGraph,
  createEmailSender,
  validateEmail,
  resourceFetch,
  validateDestination,
  trustedIp,
  onResourceExchange,
}: {
  request: Request;
  formData?: FormData;
  url?: URL;
  system: System;
  configuration: (formId: string) => ManagedFormConfiguration | undefined;
  getGraph: (
    formId: string,
    values: { system: System; formData: unknown; browserInfo: unknown }
  ) => ManagedFormResourceGraph | undefined;
  createEmailSender?: (
    formData: FormData
  ) => EmailResourceLoadOptions["sendEmail"];
  validateEmail?: (request: ResourceRequest, formData: FormData) => void;
  resourceFetch: typeof fetch;
  validateDestination?: (url: URL) => void;
  trustedIp?: string;
  onResourceExchange?: ResourceGraphLoadOptions["onResourceExchange"];
}): Promise<ManagedFormResponse> => {
  const formData = providedFormData ?? (await readFormDataWithLimit(request));
  const ids = formData.getAll(managedFormIdFieldName);
  if (ids.length !== 1 || typeof ids[0] !== "string") {
    throw new Error("Invalid Form submission");
  }
  const formId = ids[0];
  const configured = configuration(formId);
  if (configured === undefined || !isFormSubmission(configured.action)) {
    throw new Error("Form submission settings not found");
  }
  const error = validateFormSubmission(configured.action);
  if (error !== undefined) {
    throw new Error(error);
  }
  if (
    configured.resourceIds.length !==
      getEnabledFormActions(configured.action).length ||
    configured.resourceIds.some((id) => id === null)
  ) {
    throw new Error("Resource destination not found");
  }
  validateManagedFormBot(formData);
  const graph = getGraph(formId, {
    system,
    formData: getManagedFormValues(formData),
    browserInfo: getManagedFormBrowserInfo(request, trustedIp),
  });
  if (graph === undefined || graph.rootIds.length === 0) {
    throw new Error("Form Resource graph not found");
  }
  validateManagedFormDestinationDependencies(graph);
  const invalidVisitorResults: Record<string, unknown> = {};
  const invalidVisitorIds = new Set<string>();
  const visitorGraph = {
    ...graph,
    resources: graph.resources.flatMap((resource) => {
      if (
        graph.rootIds.includes(resource.id) &&
        resource.control === "email" &&
        resource.nonfatal === true
      ) {
        try {
          if (resource.dependencies.length > 0) {
            throw new Error("Email Resources cannot depend on other Resources");
          }
          const request = prepareVisitorEmailRequest(
            resource.createRequest(new Map()),
            formData,
            url.origin
          );
          return [{ ...resource, createRequest: () => request }];
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Visitor Email settings are invalid";
          invalidVisitorIds.add(resource.id);
          invalidVisitorResults[resource.outputName] = {
            ok: false,
            status: 400,
            statusText: message,
            data: {
              error: {
                code:
                  error instanceof VisitorEmailAddressError
                    ? "invalid_visitor_email"
                    : "invalid_visitor_email_resource",
                message,
              },
            },
          };
          return [];
        }
      }
      return [
        {
          ...resource,
          createRequest: (documents: ReadonlyMap<string, unknown>) =>
            prepareVisitorEmailRequest(
              resource.createRequest(documents),
              formData,
              url.origin
            ),
        },
      ];
    }),
    rootIds: graph.rootIds.filter((id) => !invalidVisitorIds.has(id)),
  };
  const preparedEmailRequests = new Map(
    visitorGraph.resources
      .filter(
        (resource) =>
          resource.control === "email" && resource.dependencies.length === 0
      )
      .map((resource) => [resource.id, resource.createRequest(new Map())])
  );
  validateManagedFormRecipientLimit(visitorGraph, preparedEmailRequests);
  const sendEmail = createEmailSender?.(formData);
  const validatedGraph = validateManagedFormBodyFormats(
    visitorGraph,
    formData,
    sendEmail !== undefined,
    preparedEmailRequests
  );
  const results =
    validatedGraph.rootIds.length === 0
      ? {}
      : await loadManagedFormResources(resourceFetch, validatedGraph, url, {
          signal: request.signal,
          onResourceExchange,
          timeoutMs: 10_000,
          shouldRetryFailedRoot: shouldRetryManagedFormDestination,
          sendEmail,
          validateEmail:
            sendEmail === undefined || validateEmail === undefined
              ? undefined
              : (emailRequest) => validateEmail(emailRequest, formData),
          validateDestination,
        });
  return getManagedFormResponse(graph, {
    ...results,
    ...invalidVisitorResults,
  });
};
