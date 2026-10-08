import type { ResourceLoadOptions } from "./resource-loader";
import type { ResourceRequest } from "./schema/resources";
import { internalFormFieldNames } from "./managed-form-submission";
import { parseEmailSender } from "./email-addresses";
import { emailSettingsInvalidMessage } from "./email-resource";

type EmailService = {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};
type EmailServiceFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

// Bound the extra allocation caused by Base64 before the Worker validates the
// complete Email payload. The Worker owns attachment policy and payload limits.
const maxEncodedAttachmentBytes = 7 * 1024 * 1024;
export const cloudflareManagedFormPreviewEmailServiceUrl =
  "https://apps.webstudio.is/v1/preview-send";
const getEmailFiles = (formData: FormData) =>
  Array.from(formData).flatMap(([name, value]) =>
    internalFormFieldNames.has(name) === false &&
    value instanceof File &&
    !(value.name === "" && value.size === 0)
      ? [value]
      : []
  );

/** Invalid submitted visitor addresses fail only their Email action. */
export class VisitorEmailAddressError extends Error {}

/** Visitor addressing is resolved from the submitted form, never from an arbitrary expression. */
export const prepareVisitorEmailRequest = (
  request: ResourceRequest,
  formData: FormData,
  siteUrl: string
): ResourceRequest => {
  const email = request.email;
  if (email?.recipientMode !== "visitor") {
    return request;
  }
  const fieldName = email.visitorEmailField;
  if (!fieldName || internalFormFieldNames.has(fieldName)) {
    throw new Error("Visitor email field is invalid");
  }
  const values = formData.getAll(fieldName);
  const address = values[0];
  if (
    values.length !== 1 ||
    typeof address !== "string" ||
    parseEmailSender(address)?.address !== address
  ) {
    throw new VisitorEmailAddressError(
      "Visitor email requires one valid email field"
    );
  }
  const preamble = `We received your request from ${siteUrl}.`;
  return {
    ...request,
    email: {
      ...email,
      recipients: [{ address }],
      body: email.body ? `${preamble}\n\n${email.body}` : preamble,
      includeAttachments: email.includeAttachments ?? true,
    },
  };
};

/** Bound Base64 allocation before the Email Service validates the payload. */
export const validateCloudflareManagedFormEmail = (
  request: ResourceRequest,
  formData: FormData
) => {
  const email = request.email;
  if (email?.includeAttachments) {
    const encodedBytes = getEmailFiles(formData).reduce(
      (total, file) => total + 4 * Math.ceil(file.size / 3),
      0
    );
    if (encodedBytes > maxEncodedAttachmentBytes) {
      throw new Error("Email attachments are too large to encode");
    }
  }
};

const failure = (status: number, code: string, message: string) => ({
  ok: false,
  status,
  statusText: message,
  data: { ok: false, error: { code, message } },
});

const encodeFile = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  }
  return {
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    contentBase64: btoa(binary),
  };
};

const createCloudflareManagedFormEmailSenderWithFetch = (
  sendRequest: EmailServiceFetch | undefined,
  formData: FormData,
  projectId: string,
  additionalHeaders?: HeadersInit,
  requestUrl: string | URL = "https://email-service.internal/v1/send"
): ResourceLoadOptions["sendEmail"] | undefined => {
  if (sendRequest === undefined) {
    return;
  }
  if (projectId.length === 0) {
    throw new Error("Email Service project ID is required");
  }
  return async (request: ResourceRequest, options: ResourceLoadOptions) => {
    if (options.signal?.aborted) {
      return failure(499, "EMAIL_CANCELLED", "Email delivery was cancelled");
    }
    const email = request.email;
    if (
      email === undefined ||
      email.recipients.length === 0 ||
      typeof email.body !== "string"
    ) {
      return failure(400, "EMAIL_INVALID", emailSettingsInvalidMessage);
    }
    const attachments = [];
    try {
      if (email.includeAttachments) {
        for (const file of getEmailFiles(formData)) {
          if (options.signal?.aborted) {
            return failure(
              499,
              "EMAIL_CANCELLED",
              "Email delivery was cancelled"
            );
          }
          attachments.push(await encodeFile(file));
        }
      }
    } catch {
      return failure(
        400,
        "EMAIL_ATTACHMENT_ERROR",
        "Email attachment could not be read"
      );
    }
    const controller = new AbortController();
    let timedOut = false;
    const cancel = () => controller.abort(options.signal?.reason);
    if (options.signal?.aborted) {
      cancel();
    } else {
      options.signal?.addEventListener("abort", cancel, { once: true });
    }
    const timeout =
      options.timeoutMs === undefined
        ? undefined
        : setTimeout(() => {
            timedOut = true;
            controller.abort();
          }, options.timeoutMs);
    try {
      if (options.signal?.aborted) {
        return failure(499, "EMAIL_CANCELLED", "Email delivery was cancelled");
      }
      const headers = new Headers({
        "content-type": "application/json",
        "x-webstudio-project-id": projectId,
      });
      for (const [name, value] of new Headers(additionalHeaders)) {
        headers.set(name, value);
      }
      const init: RequestInit = {
        method: "POST",
        headers,
        body: JSON.stringify({
          to: email.recipients,
          subject: email.subject,
          text: email.body,
          ...(email.sender === undefined ? {} : { replyTo: email.sender }),
          ...(email.fromName === undefined ? {} : { fromName: email.fromName }),
          ...(attachments.length === 0 ? {} : { attachments }),
        }),
        signal: controller.signal,
      };
      const request = options.onEmailRequest
        ? new Request(requestUrl, init)
        : undefined;
      if (request) {
        options.onEmailRequest?.(request.clone());
      }
      const response = await sendRequest(
        request ?? requestUrl,
        request ? undefined : init
      );
      const responseText = await response.text().catch(() => undefined);
      let responseData: unknown;
      let data: unknown;
      if (responseText !== undefined) {
        try {
          data = JSON.parse(responseText);
          responseData = data;
        } catch {
          responseData = responseText;
        }
      }
      if (options.onEmailResponse) {
        options.onEmailResponse(response, responseData);
      }
      if (options.signal?.aborted) {
        return failure(499, "EMAIL_CANCELLED", "Email delivery was cancelled");
      }
      if (
        response.ok &&
        typeof data === "object" &&
        data !== null &&
        "id" in data &&
        typeof data.id === "string" &&
        data.id.trim().length > 0
      ) {
        return { ok: true, status: response.status, statusText: "OK", data };
      }
      if (response.ok) {
        return failure(
          502,
          "EMAIL_SERVICE_ERROR",
          "Email service returned an invalid response"
        );
      }
      if (
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof data.error === "object" &&
        data.error !== null &&
        "message" in data.error &&
        typeof data.error.message === "string"
      ) {
        return {
          ok: false,
          status: response.status,
          statusText: data.error.message,
          data,
        };
      }
      return failure(
        502,
        "EMAIL_SERVICE_ERROR",
        "Email service returned an invalid response"
      );
    } catch {
      return timedOut
        ? failure(504, "EMAIL_TIMEOUT", "Email delivery timed out")
        : options.signal?.aborted
          ? failure(499, "EMAIL_CANCELLED", "Email delivery was cancelled")
          : failure(
              502,
              "EMAIL_SERVICE_UNAVAILABLE",
              "Email service is unavailable"
            );
    } finally {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
      options.signal?.removeEventListener("abort", cancel);
    }
  };
};

/** Create an Email sender only when the published server has the private binding. */
export const createCloudflareManagedFormEmailSender = (
  service: EmailService | undefined,
  formData: FormData,
  projectId: string
): ResourceLoadOptions["sendEmail"] | undefined =>
  createCloudflareManagedFormEmailSenderWithFetch(
    service?.fetch.bind(service),
    formData,
    projectId
  );

/** Create an approved Preview sender using a private, server-side bearer token. */
export const createCloudflareManagedFormEmailSenderWithUrl = (
  serviceUrl: string | undefined,
  token: string | undefined,
  formData: FormData,
  projectId: string,
  fetcher: typeof fetch = fetch
): ResourceLoadOptions["sendEmail"] | undefined => {
  if (!serviceUrl || !token) {
    return;
  }
  const url = new URL(serviceUrl);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "apps.webstudio.is" ||
    url.port !== "" ||
    url.pathname !== "/v1/preview-send" ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error("Email Service URL must be an approved Preview endpoint");
  }
  return createCloudflareManagedFormEmailSenderWithFetch(
    (input, init) => {
      return fetcher(input, { ...(init ?? {}), redirect: "error" });
    },
    formData,
    projectId,
    { authorization: `Bearer ${token}` },
    url
  );
};
