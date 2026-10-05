import { managedFormIdFieldName } from "./form-fields";
import {
  getEnabledFormDestinations,
  isFormSubmission,
  validateFormSubmission,
} from "./form-submission";
import {
  getManagedFormBrowserInfo,
  getManagedFormResponse,
  getManagedFormValues,
  loadManagedFormResources,
  readFormDataWithLimit,
  validateManagedFormBodyFormats,
  validateManagedFormBot,
  validateManagedFormRecipientLimit,
  type ManagedFormResponse,
} from "./managed-form-submission";
import {
  prepareVisitorEmailRequest,
  VisitorEmailAddressError,
} from "./managed-form-email";
import type {
  ResourceGraphLoadOptions,
  ResourceRequestGraph,
} from "./resource-loader";
import type { ResourceRequest } from "./schema/resources";
import type { System } from "./schema/pages";

export type ManagedFormConfiguration = {
  submission: unknown;
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
}: {
  request: Request;
  formData?: FormData;
  url?: URL;
  system: System;
  configuration: (formId: string) => ManagedFormConfiguration | undefined;
  getGraph: (
    formId: string,
    values: { system: System; formData: unknown; browserInfo: unknown }
  ) => ResourceRequestGraph | undefined;
  createEmailSender?: (
    formData: FormData
  ) => ResourceGraphLoadOptions["sendEmail"];
  validateEmail?: (request: ResourceRequest, formData: FormData) => void;
  resourceFetch: typeof fetch;
  validateDestination?: (url: URL) => void;
  trustedIp?: string;
}): Promise<ManagedFormResponse> => {
  const formData = providedFormData ?? (await readFormDataWithLimit(request));
  const ids = formData.getAll(managedFormIdFieldName);
  if (ids.length !== 1 || typeof ids[0] !== "string") {
    throw new Error("Invalid Form submission");
  }
  const formId = ids[0];
  const configured = configuration(formId);
  if (configured === undefined || !isFormSubmission(configured.submission)) {
    throw new Error("Form submission settings not found");
  }
  const error = validateFormSubmission(configured.submission);
  if (error !== undefined) {
    throw new Error(error);
  }
  if (
    configured.resourceIds.length !==
      getEnabledFormDestinations(configured.submission).length ||
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
  validateManagedFormRecipientLimit(graph);
  const sendEmail = createEmailSender?.(formData);
  const invalidVisitorResults: Record<string, unknown> = {};
  const invalidVisitorIds = new Set<string>();
  const visitorGraph = {
    ...graph,
    resources: graph.resources.flatMap((resource) => {
      if (
        graph.rootIds.includes(resource.id) &&
        resource.control === "email" &&
        resource.nonfatal === true &&
        resource.dependencies.length === 0
      ) {
        try {
          const request = prepareVisitorEmailRequest(
            resource.createRequest(new Map()),
            formData,
            url.origin
          );
          return [{ ...resource, createRequest: () => request }];
        } catch (error) {
          if (!(error instanceof VisitorEmailAddressError)) throw error;
          invalidVisitorIds.add(resource.id);
          invalidVisitorResults[resource.outputName] = {
            ok: false,
            status: 400,
            statusText: error.message,
            data: {
              error: {
                code: "invalid_visitor_email",
                message: error.message,
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
  const validatedGraph = validateManagedFormBodyFormats(
    visitorGraph,
    formData,
    sendEmail !== undefined
  );
  const results =
    validatedGraph.rootIds.length === 0
      ? {}
      : await loadManagedFormResources(resourceFetch, validatedGraph, url, {
          signal: request.signal,
          timeoutMs: 10_000,
          retryFailedRoots: true,
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
