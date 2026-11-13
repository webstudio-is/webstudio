import type { ProjectMeta } from "./schema/pages";
import type { EmailResourceSettings } from "./schema/resources";
import type { DataSource } from "./schema/data-sources";
import { createJsonStringifyProxy } from "./to-string";

/** Email fields must be resolvable before any Form destination dispatches. */
export const isEmailBindingDataSourceAvailable = (
  dataSource: DataSource | undefined
) => dataSource?.type !== "resource";
import { parseEmailMailboxes, parseEmailSender } from "./email-addresses";

export const emailSettingsInvalidMessage = "Email settings are invalid";

/** Validate evaluated Email Resource bindings before any destination is sent. */
export const resolveEmailSenderExpression = (value: unknown) => {
  if (typeof value !== "string") {
    throw new Error(emailSettingsInvalidMessage);
  }
  const sender = parseEmailSender(value);
  if (sender === undefined) {
    throw new Error(emailSettingsInvalidMessage);
  }
  return sender;
};

export const resolveEmailSenderSettingsExpression = (
  value: unknown,
  fallbackFromName: string | undefined
) => {
  const sender = resolveEmailSenderExpression(value);
  return { sender, fromName: sender.name ?? fallbackFromName };
};

/** A custom-recipient binding resolves to the same comma-separated list as the field. */
export const resolveEmailRecipientsExpression = (value: unknown) => {
  if (typeof value !== "string") {
    throw new Error(emailSettingsInvalidMessage);
  }
  const recipients = parseEmailMailboxes(value);
  if (recipients === undefined || recipients.length === 0) {
    throw new Error(emailSettingsInvalidMessage);
  }
  return recipients;
};

export const defaultEmailSubject = "New form submission";
export const defaultEmailBody = "A new form was submitted.";
export const defaultEmailConfirmationSubject = "We received your submission";
export const maxEmailSubjectLength = 998;
export const defaultVisitorConfirmationBody =
  "Thank you for your message.\n\nWe received it and will respond as soon as possible.";

/** Apply only Email defaults identified in Resource settings; custom copy is literal. */
export const resolveVisitorConfirmationCopy = ({
  subject,
  body,
  fromName,
  confirmationSubject,
  confirmationBody,
}: {
  subject: string;
  body: string;
  fromName?: string;
  confirmationSubject?: "formSubject" | "default";
  confirmationBody?: "default";
}) => {
  const senderName = fromName || "Site Owner";
  return {
    subject:
      confirmationSubject === "formSubject"
        ? `${senderName} received your email: ${subject}`
        : confirmationSubject === "default"
          ? `${senderName} received your email`
          : subject,
    body:
      confirmationBody === "default"
        ? `${defaultVisitorConfirmationBody}\n\n${senderName}`
        : body,
  };
};

/** Render submitted fields as readable email text while retaining normal field access. */
export const createFormEmailDataProxy = <T extends object>(
  formData: T,
  options: Parameters<typeof createJsonStringifyProxy>[1]
) => {
  const excluded = new Set(options?.excludeKeys);
  const label = (name: string) => {
    const words = name.replaceAll("_", " ").replaceAll("-", " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
  };
  const formatValue = (value: unknown, depth: number): string => {
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof File !== "undefined" && value instanceof File) {
      return value.name;
    }
    if (Array.isArray(value)) {
      return value.map((entry) => formatValue(entry, depth)).join(", ");
    }
    if (typeof value === "object") {
      const lines = Object.entries(value)
        .filter(([name]) => !excluded.has(name))
        .map(([name, entry]) => {
          const text = formatValue(entry, depth + 1);
          return `${"  ".repeat(depth + 1)}${label(name)}:${text.startsWith("\n") ? "" : " "}${text}`;
        })
        .join("\n");
      return lines === "" ? "" : `\n${lines}`;
    }
    return String(value);
  };
  const text = Object.entries(formData)
    .filter(([name]) => !excluded.has(name))
    .map(([name, value]) => {
      const text = formatValue(value, 0);
      return `${label(name)}:${text.startsWith("\n") ? "" : " "}${text}`;
    })
    .join("\n");
  const value = createJsonStringifyProxy(formData, options);
  return new Proxy(value, {
    get(target, property, receiver) {
      if (property === "toString" && options?.stringifyAs === undefined) {
        return () => text;
      }
      return Reflect.get(target, property, receiver);
    },
  });
};

/** Check the evaluated subject, including values supplied by Form bindings. */
export const validateEmailSubject = (subject: unknown) => {
  if (typeof subject !== "string" || /[\r\n]/.test(subject)) {
    throw new Error("Email subject must be text without line breaks");
  }
};

export const getDefaultFormEmailBodyExpression = (
  formDataIdentifier: string,
  browserInfoIdentifier?: string
) =>
  `\`Form data:\n\${${formDataIdentifier}}` +
  (browserInfoIdentifier
    ? `\n\nBrowser info:\n\${${browserInfoIdentifier}}`
    : "") +
  "\`";

/** Inheritance is represented by an absent field, so reset removes an override. */
export const resolveEmailResourceSettings = ({
  settings = {},
  projectMeta = {},
  ownerEmail,
}: {
  settings?: EmailResourceSettings;
  projectMeta?: ProjectMeta;
  ownerEmail?: string;
}) => {
  const recipientsText =
    settings.recipientMode === "custom"
      ? (settings.recipients ?? "")
      : settings.recipientMode === "visitor"
        ? ""
        : projectMeta.contactEmail || ownerEmail || "";
  const senderText = settings.sender || projectMeta.emailSender || "";
  const recipients = parseEmailMailboxes(recipientsText);
  const sender = parseEmailSender(senderText);
  return {
    recipientMode: settings.recipientMode ?? "project",
    recipients: settings.recipientMode === "visitor" ? [] : recipients,
    visitorEmailField: settings.visitorEmailField,
    sender,
    fromName: sender?.name ?? "Site Owner",
    confirmationSubject:
      settings.confirmationSubject ??
      (settings.recipientMode === "visitor" && settings.subject === undefined
        ? "default"
        : undefined),
    confirmationBody:
      settings.confirmationBody ??
      (settings.recipientMode === "visitor" && settings.body === undefined
        ? "default"
        : undefined),
    subject:
      settings.subject ??
      JSON.stringify(
        settings.recipientMode === "visitor"
          ? defaultEmailConfirmationSubject
          : defaultEmailSubject
      ),
    body:
      settings.body ??
      (settings.recipientMode === "visitor"
        ? JSON.stringify("")
        : JSON.stringify(defaultEmailBody)),
    includeAttachments: settings.includeAttachments ?? true,
  };
};
