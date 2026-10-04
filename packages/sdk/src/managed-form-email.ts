import type { ResourceLoadOptions } from "./resource-loader";
import type { ResourceRequest } from "./schema/resources";
import { internalFormFieldNames } from "./managed-form-submission";

type EmailService = {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

const maxEmailContentBytes = 5 * 1024 * 1024;
const maxEmailAttachments = 32;
const maxEmailRequestBytes = 7 * 1024 * 1024;
const mimeEnvelopeBytes = 16 * 1024;
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

const isValidMailbox = (value: { address: string; name?: string }) =>
  typeof value.address === "string" &&
  value.address.length <= 320 &&
  emailPattern.test(value.address) &&
  !/[\r\n]/.test(value.address) &&
  (value.name === undefined ||
    (typeof value.name === "string" &&
      value.name.length <= 256 &&
      !/[\r\n]/.test(value.name)));

const utf8Bytes = (value: string) => new TextEncoder().encode(value).byteLength;

const encodedTextUpperBound = (value: string) => {
  const bytes = utf8Bytes(value) * 3;
  return bytes + Math.ceil(bytes / 76) * 2;
};

const encodedBase64UpperBound = (length: number) =>
  length + Math.ceil(length / 76) * 2;

const getEncodedMimeUpperBound = (
  email: NonNullable<ResourceRequest["email"]>,
  files: File[]
) => {
  const headers = [
    "forms@webstudio.email",
    email.subject,
    ...email.recipients.flatMap(({ address, name }) => [address, name ?? ""]),
    email.sender?.address ?? "",
    email.sender?.name ?? "",
  ];
  let size = mimeEnvelopeBytes + encodedTextUpperBound(email.body);
  for (const header of headers) {
    size += encodedTextUpperBound(header);
  }
  for (const file of files) {
    size += encodedTextUpperBound(file.name);
    size += encodedTextUpperBound(file.type || "application/octet-stream");
    size += encodedBase64UpperBound(4 * Math.ceil(file.size / 3));
  }
  return size;
};

const getEmailFiles = (formData: FormData) =>
  Array.from(formData).flatMap(([name, value]) =>
    internalFormFieldNames.has(name) === false &&
    value instanceof File &&
    !(value.name === "" && value.size === 0)
      ? [value]
      : []
  );

/** The private Worker applies the same limits; check before any destination runs. */
export const validateCloudflareManagedFormEmail = (
  request: ResourceRequest,
  formData: FormData
) => {
  const email = request.email;
  if (
    email === undefined ||
    email.recipients.length === 0 ||
    email.recipients.length > 50 ||
    email.recipients.some((recipient) => !isValidMailbox(recipient)) ||
    (email.sender !== undefined && !isValidMailbox(email.sender)) ||
    typeof email.subject !== "string" ||
    email.subject.length === 0 ||
    email.subject.length > 998 ||
    /[\r\n]/.test(email.subject) ||
    typeof email.body !== "string"
  ) {
    throw new Error("Email settings are invalid");
  }
  const files = email.includeAttachments ? getEmailFiles(formData) : [];
  if (files.length > maxEmailAttachments) {
    throw new Error("Email has too many attachments");
  }
  for (const file of files) {
    const contentType = file.type || "application/octet-stream";
    if (
      file.name.length === 0 ||
      file.name.length > 255 ||
      /[\r\n]/.test(file.name) ||
      contentType.length > 255 ||
      /[\r\n]/.test(contentType)
    ) {
      throw new Error("Email attachment metadata is invalid");
    }
  }
  if (getEncodedMimeUpperBound(email, files) > maxEmailContentBytes) {
    throw new Error("Email content is too large");
  }
  const emptyEnvelope = {
    to: email.recipients,
    subject: email.subject,
    text: email.body,
    ...(email.sender === undefined ? {} : { replyTo: email.sender }),
    ...(files.length === 0
      ? {}
      : {
          attachments: files.map((file) => ({
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            contentBase64: "",
          })),
        }),
  };
  const envelopeBytes = new TextEncoder().encode(
    JSON.stringify(emptyEnvelope)
  ).byteLength;
  const encodedFileBytes = files.reduce(
    (sum, file) => sum + 4 * Math.ceil(file.size / 3),
    0
  );
  if (envelopeBytes + encodedFileBytes > maxEmailRequestBytes) {
    throw new Error("Email request is too large");
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

/** Create an Email sender only when the published server has the private binding. */
export const createCloudflareManagedFormEmailSender = (
  service: EmailService | undefined,
  formData: FormData
): ResourceLoadOptions["sendEmail"] | undefined => {
  if (service === undefined) {
    return;
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
      return failure(400, "EMAIL_INVALID", "Email settings are invalid");
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
      const response = await service.fetch(
        "https://email-service.internal/v1/send",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            to: email.recipients,
            subject: email.subject,
            text: email.body,
            ...(email.sender === undefined ? {} : { replyTo: email.sender }),
            ...(attachments.length === 0 ? {} : { attachments }),
          }),
          signal: controller.signal,
        }
      );
      const data: unknown = await response.json().catch(() => undefined);
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
