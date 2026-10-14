import type { ResourceLoadOptions } from "../resource-loader";
import type { EmailResourceLoadOptions } from "../email-resource-delivery";
import type { ResourceRequest } from "../schema/resources";
import { internalFormFieldNames } from "./server-submission";
import { parseEmailSender } from "../email-addresses";
import {
  emailSettingsInvalidMessage,
  resolveVisitorConfirmationCopy,
} from "../email-resource";

type EmailService = {
  sendEmail: (projectId: string, payload: unknown) => Promise<unknown>;
};
type EmailServiceFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

// Bound the extra allocation caused by Base64 before the Worker validates the
// complete Email payload. The Worker owns attachment policy and payload limits.
const maxEncodedAttachmentBytes = 7 * 1024 * 1024;
const emailWorkerHost = "webstudio-email-service.wstd.workers.dev";
const emailWorkerVersionHostSuffix =
  "-webstudio-email-service.wstd.workers.dev";
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isApprovedPreviewEmailHost = (hostname: string) => {
  if (hostname === emailWorkerHost) {
    return true;
  }
  if (!hostname.endsWith(emailWorkerVersionHostSuffix)) {
    return false;
  }
  const version = hostname.slice(0, -emailWorkerVersionHostSuffix.length);
  return (
    version.length >= 8 &&
    [...version].every((character) => "0123456789abcdef".includes(character))
  );
};
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
  formData: FormData
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
  const { subject, body } = resolveVisitorConfirmationCopy(email);
  return {
    ...request,
    email: {
      ...email,
      recipients: [{ address }],
      subject,
      body,
      includeAttachments: email.includeAttachments ?? true,
    },
  };
};

/** Bound Base64 allocation before the email service validates the payload. */
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
  ok: false as const,
  status,
  statusText: message,
  data: { error: { code, message } },
});

/** The Worker uses this result for both native RPC and tRPC delivery outcomes. */
const normalizeDeliveryResult = (value: unknown) => {
  // Deployed Workers may still return the original success-only contract.
  // Accept its exact shape so malformed canonical outcomes remain failures.
  if (
    isRecord(value) &&
    Object.keys(value).length === 1 &&
    typeof value.id === "string" &&
    value.id.trim().length > 0
  ) {
    return {
      ok: true as const,
      status: 200,
      statusText: "OK",
      data: { id: value.id },
    };
  }
  if (
    !isRecord(value) ||
    typeof value.status !== "number" ||
    !Number.isInteger(value.status) ||
    value.status < 100 ||
    value.status > 599 ||
    typeof value.statusText !== "string" ||
    !isRecord(value.data)
  ) {
    return failure(
      502,
      "EMAIL_SERVICE_ERROR",
      "Email service returned an invalid response"
    );
  }
  if (
    value.ok === true &&
    value.status >= 200 &&
    value.status < 300 &&
    typeof value.data.id === "string" &&
    value.data.id.trim().length > 0
  ) {
    return {
      ok: true as const,
      status: value.status,
      statusText: value.statusText,
      data: value.data,
    };
  }
  if (
    value.ok === false &&
    value.status >= 400 &&
    isRecord(value.data.error) &&
    typeof value.data.error.code === "string" &&
    typeof value.data.error.message === "string"
  ) {
    return {
      ok: false as const,
      status: value.status,
      statusText: value.statusText,
      data: value.data,
    };
  }
  return failure(
    502,
    "EMAIL_SERVICE_ERROR",
    "Email service returned an invalid response"
  );
};

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

const prepareEmailPayload = async (
  request: ResourceRequest,
  formData: FormData,
  signal: AbortSignal | undefined
) => {
  if (signal?.aborted) {
    return {
      error: failure(499, "EMAIL_CANCELLED", "Email delivery was cancelled"),
    };
  }
  const email = request.email;
  if (
    email === undefined ||
    email.recipients.length === 0 ||
    typeof email.body !== "string"
  ) {
    return {
      error: failure(400, "EMAIL_INVALID", emailSettingsInvalidMessage),
    };
  }
  const attachments = [];
  try {
    if (email.includeAttachments) {
      for (const file of getEmailFiles(formData)) {
        if (signal?.aborted) {
          return {
            error: failure(
              499,
              "EMAIL_CANCELLED",
              "Email delivery was cancelled"
            ),
          };
        }
        attachments.push(await encodeFile(file));
      }
    }
  } catch {
    return {
      error: failure(
        400,
        "EMAIL_ATTACHMENT_ERROR",
        "Email attachment could not be read"
      ),
    };
  }
  return {
    payload: {
      to: email.recipients,
      subject: email.subject,
      text: email.body,
      ...(email.headers === undefined ? {} : { headers: email.headers }),
      ...(email.sender === undefined ? {} : { replyTo: email.sender }),
      ...(email.fromName === undefined ? {} : { fromName: email.fromName }),
      ...(attachments.length === 0 ? {} : { attachments }),
    },
  };
};

const createCloudflareManagedFormEmailSenderWithFetch = (
  sendRequest: EmailServiceFetch | undefined,
  formData: FormData,
  projectId: string,
  additionalHeaders: HeadersInit,
  requestUrl: string | URL
): EmailResourceLoadOptions["sendEmail"] | undefined => {
  if (sendRequest === undefined) {
    return;
  }
  if (projectId.length === 0) {
    throw new Error("Email service project ID is required");
  }
  return async (
    request: ResourceRequest,
    options: ResourceLoadOptions & EmailResourceLoadOptions
  ) => {
    const prepared = await prepareEmailPayload(
      request,
      formData,
      options.signal
    );
    if (prepared.error) {
      return prepared.error;
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
        body: JSON.stringify(prepared.payload),
        signal: controller.signal,
      };
      const request = options.onEmailRequest
        ? new Request(requestUrl, init)
        : undefined;
      if (request) {
        // The inspection callback consumes only the standard Request API; the
        // Worker runtime adds Cloudflare metadata generics to its Request type.
        options.onEmailRequest?.(request.clone() as unknown as Request);
      }
      const response = await sendRequest(
        request ?? requestUrl,
        request ? undefined : init
      );
      const responseText = await response.text().catch(() => undefined);
      let responseData: unknown;
      let deliveryResult: unknown;
      if (responseText !== undefined) {
        try {
          responseData = JSON.parse(responseText);
          if (isRecord(responseData)) {
            if (isRecord(responseData.result)) {
              deliveryResult = responseData.result.data;
            }
          }
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
      if (response.ok) {
        return normalizeDeliveryResult(deliveryResult);
      }
      if (isRecord(responseData) && isRecord(responseData.error)) {
        const error = responseData.error;
        const code =
          isRecord(error.data) && typeof error.data.emailCode === "string"
            ? error.data.emailCode
            : typeof error.code === "string"
              ? error.code
              : "EMAIL_SERVICE_ERROR";
        const message =
          typeof error.message === "string"
            ? error.message
            : "Email service returned an invalid response";
        return failure(response.status, code, message);
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
): EmailResourceLoadOptions["sendEmail"] | undefined => {
  if (service === undefined) {
    return;
  }
  if (projectId.length === 0) {
    throw new Error("Email service project ID is required");
  }
  return async (request, options) => {
    const prepared = await prepareEmailPayload(
      request,
      formData,
      options.signal
    );
    if (prepared.error) {
      return prepared.error;
    }
    const cancelled = () =>
      failure(499, "EMAIL_CANCELLED", "Email delivery was cancelled");
    if (options.signal?.aborted) {
      return cancelled();
    }
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let onAbort: (() => void) | undefined;
    try {
      // Cloudflare RPC cannot cancel a call after dispatch. This bounds how
      // long the Form waits; a timed-out call may still deliver the email.
      const result = await Promise.race([
        Promise.resolve().then(() =>
          options.signal?.aborted
            ? cancelled()
            : service.sendEmail(projectId, prepared.payload)
        ),
        new Promise<ReturnType<typeof failure>>((resolve) => {
          onAbort = () => resolve(cancelled());
          options.signal?.addEventListener("abort", onAbort, { once: true });
          if (options.signal?.aborted) {
            onAbort();
          }
          if (options.timeoutMs !== undefined) {
            timeout = setTimeout(
              () =>
                resolve(
                  failure(504, "EMAIL_TIMEOUT", "Email delivery timed out")
                ),
              options.timeoutMs
            );
          }
        }),
      ]);
      if (options.signal?.aborted) {
        return cancelled();
      }
      return normalizeDeliveryResult(result);
    } catch {
      return options.signal?.aborted
        ? cancelled()
        : failure(
            502,
            "EMAIL_SERVICE_UNAVAILABLE",
            "Email service is unavailable"
          );
    } finally {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
      if (onAbort !== undefined) {
        options.signal?.removeEventListener("abort", onAbort);
      }
    }
  };
};

/** Create an approved Preview sender using a private, server-side bearer token. */
export const createCloudflareManagedFormEmailSenderWithUrl = (
  serviceUrl: string | undefined,
  token: string | undefined,
  formData: FormData,
  projectId: string,
  fetcher: typeof fetch = fetch
): EmailResourceLoadOptions["sendEmail"] | undefined => {
  if (!serviceUrl || !token) {
    return;
  }
  const url = new URL(serviceUrl);
  if (
    url.protocol !== "https:" ||
    !isApprovedPreviewEmailHost(url.hostname) ||
    url.port !== "" ||
    url.pathname !== "/" ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error("Email service URL must be an approved Worker origin");
  }
  const sendEmail = createCloudflareManagedFormEmailSenderWithFetch(
    (input, init) => {
      return fetcher(input, { ...(init ?? {}), redirect: "error" });
    },
    formData,
    projectId,
    { authorization: `Bearer ${token}` },
    new URL("/trpc/email.send", url)
  );
  if (sendEmail === undefined) {
    return;
  }
  return async (request, options) => {
    const result = await sendEmail(request, options);
    if (result.status === 401) {
      return failure(
        401,
        "EMAIL_PREVIEW_AUTH_FAILED",
        `${request.name}: the email service rejected the Builder's credential. Check TRPC_SERVER_API_TOKEN on the Builder server.`
      );
    }
    return result;
  };
};
