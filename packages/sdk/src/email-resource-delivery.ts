import type { ResourceRequest } from "./schema/resources";
import { validateEmailSubject } from "./email-resource";
import {
  loadResource,
  loadResources,
  type ResourceExchange,
  type ResourceLoadOptions,
  type ResourceGraphLoadOptions,
  type ResourceRequestGraph,
} from "./resource-loader";

/** Email transport details consumed only by the Email delivery adapter. */
export type EmailResourceLoadOptions = {
  onEmailRequest?: (request: Request) => void;
  onEmailResponse?: (
    response: Pick<Response, "status" | "statusText" | "headers" | "url">,
    data: unknown
  ) => void;
  sendEmail?: (
    request: ResourceRequest,
    options: ResourceLoadOptions & EmailResourceLoadOptions
  ) => Promise<{
    ok: boolean;
    status: number;
    statusText: string;
    data: unknown;
  }>;
};

/** Keep Email Service inspection coupled to Email delivery, including logical outcomes. */
export const loadEmailResource = async (
  resourceRequest: ResourceRequest,
  options: ResourceLoadOptions & EmailResourceLoadOptions
) => {
  validateEmailSubject(resourceRequest.email?.subject);
  if (options.sendEmail === undefined) {
    return {
      ok: false,
      status: 501,
      statusText: "Email delivery requires Webstudio Cloud",
      data: {
        ok: false,
        error: {
          code: "EMAIL_NOT_CONFIGURED",
          message: "Email delivery requires Webstudio Cloud",
          retryable: false,
        },
      },
    };
  }
  let emailRequest: Request | undefined;
  let emailResponse: ResourceExchange["response"] | undefined;
  const sendOptions =
    options.onExchange === undefined
      ? options
      : {
          ...options,
          onEmailRequest: (request: Request) => {
            emailRequest = request;
            options.onEmailRequest?.(request);
          },
          onEmailResponse: (
            response: Pick<
              Response,
              "status" | "statusText" | "headers" | "url"
            >,
            data: unknown
          ) => {
            emailResponse = {
              status: response.status,
              statusText: response.statusText,
              headers: new Headers(response.headers),
              data,
              url: response.url || undefined,
            };
            options.onEmailResponse?.(response, data);
          },
        };
  const result = await options.sendEmail(resourceRequest, sendOptions);
  try {
    await options.onExchange?.({
      kind: "email",
      request: emailRequest ?? resourceRequest,
      response: emailResponse ?? { ...result, headers: new Headers() },
      outcome: result,
    });
  } catch {
    // Inspection is observational and cannot change delivery outcomes.
  }
  return result;
};

/** Select Email delivery at the feature boundary, then use shared HTTP loading. */
export const loadResourceWithEmail = (
  customFetch: typeof fetch,
  resourceRequest: ResourceRequest,
  baseUrl?: string | URL,
  options: ResourceLoadOptions & EmailResourceLoadOptions = {}
) =>
  resourceRequest.control === "email"
    ? loadEmailResource(resourceRequest, options)
    : loadResource(customFetch, resourceRequest, baseUrl, options);

export type EmailResourceGraphLoadOptions = ResourceGraphLoadOptions &
  EmailResourceLoadOptions;

export const loadResourcesWithEmail = (
  customFetch: typeof fetch,
  requests: Map<string, ResourceRequest> | ResourceRequestGraph,
  baseUrl?: string | URL,
  options: EmailResourceGraphLoadOptions = {}
) => {
  const {
    sendEmail,
    onEmailRequest,
    onEmailResponse,
    loadRequest,
    ...graphOptions
  } = options;
  return loadResources(customFetch, requests, baseUrl, {
    ...graphOptions,
    loadRequest: (fetcher, request, url, loadOptions) =>
      request.control === "email"
        ? loadEmailResource(request, {
            ...loadOptions,
            sendEmail,
            onEmailRequest,
            onEmailResponse,
          })
        : (loadRequest ?? loadResource)(fetcher, request, url, loadOptions),
  });
};
