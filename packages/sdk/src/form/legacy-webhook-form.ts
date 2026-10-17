import { getReachableResources } from "./resource-graph";
import {
  defaultEmailSubject,
  resolveEmailRecipientsExpression,
} from "../email-resource";
import type { EmailResourceLoadOptions } from "../email-resource-delivery";
import type { ResourceRequestGraph } from "../resource-loader";
import type { ResourceRequest } from "../schema/resources";
import {
  getManagedFormResponse,
  loadManagedFormResources,
  validateManagedFormBot,
  validateManagedFormRecipientLimit,
  shouldRetryManagedFormDestination,
  type ManagedFormResourceGraph,
} from "./server-submission";
import { prepareVisitorEmailRequest } from "./server-email";
import { formBotFieldName, formIdFieldName } from "./fields";

/** Adapt saved Webhook Forms to the shared Form execution pipeline. */
export const handleLegacyWebhookFormSubmission = async ({
  request,
  formData,
  url,
  resources,
  contactEmail,
  resourceFetch,
  dependencyFetch,
  createEmailSender,
  validateEmail,
}: {
  request: Request;
  formData: FormData;
  url: URL;
  resources: {
    data: ResourceRequestGraph;
    action: ReadonlyMap<string, { id: string; outputName: string }>;
  };
  contactEmail?: string;
  resourceFetch: typeof fetch & { validateDestination: (url: URL) => void };
  dependencyFetch: typeof fetch;
  createEmailSender: (
    formData: FormData
  ) => EmailResourceLoadOptions["sendEmail"];
  validateEmail: (request: ResourceRequest, formData: FormData) => void;
}) => {
  validateManagedFormBot(formData);
  const name = formData.get(formIdFieldName);
  const action =
    typeof name === "string" ? resources.action.get(name) : undefined;
  formData.delete(formIdFieldName);
  formData.delete(formBotFieldName);
  const body = Object.fromEntries(formData);
  let graph: ManagedFormResourceGraph;
  if (action === undefined) {
    if (contactEmail === undefined) {
      throw new Error("Contact email not found");
    }
    const recipients = resolveEmailRecipientsExpression(contactEmail);
    const lines = Array.from(formData).flatMap(([name, value]) =>
      typeof value === "string" ? [`${name}: ${value}`] : []
    );
    graph = {
      rootIds: ["email"],
      resources: [
        {
          id: "email",
          outputName: "email",
          dependencies: [],
          control: "email",
          createRequest: () => ({
            name: "Email",
            control: "email",
            method: "post",
            url: "",
            searchParams: [],
            headers: [],
            email: {
              recipientMode: "project",
              recipients,
              subject: `${defaultEmailSubject} from ${url.hostname}`,
              body: `There has been a new submission of your form at ${url}:\n\n${lines.join("\n")}${lines.length > 0 ? "\n" : ""}`,
              includeAttachments: true,
            },
          }),
        },
      ],
    };
  } else {
    graph = {
      rootIds: [action.id],
      resources: getReachableResources({
        ...resources.data,
        rootIds: [action.id],
      }).map((resource) => ({
        ...resource,
        createRequest: (documents) => {
          const request = resource.createRequest(documents);
          return resource.id === action.id ? { ...request, body } : request;
        },
      })),
    };
  }
  const emailRequests = new Map<string, ResourceRequest>();
  graph = {
    ...graph,
    resources: graph.resources.map((resource) => {
      if (resource.control !== "email" || resource.dependencies.length > 0) {
        return resource;
      }
      const emailRequest = prepareVisitorEmailRequest(
        resource.createRequest(new Map()),
        formData
      );
      emailRequests.set(resource.id, emailRequest);
      return { ...resource, createRequest: () => emailRequest };
    }),
  };
  validateManagedFormRecipientLimit(graph, emailRequests);
  const sendEmail = createEmailSender(formData);
  const results = await loadManagedFormResources(dependencyFetch, graph, url, {
    signal: request.signal,
    timeoutMs: 10_000,
    shouldRetryFailedRoot: shouldRetryManagedFormDestination,
    requestOverrides: new Map([[graph.rootIds[0], { fetch: resourceFetch }]]),
    sendEmail,
    validateEmail: (request) => validateEmail(request, formData),
    validateDestination: resourceFetch.validateDestination,
  });
  const response = getManagedFormResponse(graph, results);
  return response.success
    ? { success: true as const }
    : {
        success: false as const,
        errors: response.errors.map(({ message }) => message),
      };
};
