import type { ProjectMeta } from "./schema/pages";
import type { EmailResourceSettings } from "./schema/resources";
import type { DataSource } from "./schema/data-sources";

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

/** Check the evaluated subject, including values supplied by Form bindings. */
export const validateEmailSubject = (subject: unknown) => {
  if (typeof subject !== "string" || /[\r\n]/.test(subject)) {
    throw new Error("Email subject must be text without line breaks");
  }
};

export const getDefaultFormEmailBodyExpression = (
  formDataIdentifier: string,
  browserInfoIdentifier?: string,
  projectBody?: string
) =>
  projectBody
    ? JSON.stringify(projectBody)
    : `\`Form data:\n\${${formDataIdentifier}}` +
      (browserInfoIdentifier
        ? `\n\nBrowser info:\n\${${browserInfoIdentifier}}`
        : "") +
      "\`";

/** Inheritance is represented by an absent field, so reset removes an override. */
export const resolveEmailResourceSettings = ({
  settings = {},
  projectMeta = {},
  ownerEmail,
  ownerName,
}: {
  settings?: EmailResourceSettings;
  projectMeta?: ProjectMeta;
  ownerEmail?: string;
  ownerName?: string;
}) => {
  const recipientsText =
    settings.recipientMode === "custom"
      ? (settings.recipients ?? "")
      : settings.recipientMode === "visitor"
        ? ""
        : projectMeta.contactEmail || ownerEmail || "";
  const senderText =
    settings.sender ?? (projectMeta.emailSender || ownerEmail || "");
  const recipients = parseEmailMailboxes(recipientsText);
  const sender = parseEmailSender(senderText);
  return {
    recipientMode: settings.recipientMode ?? "project",
    recipients: settings.recipientMode === "visitor" ? [] : recipients,
    visitorEmailField: settings.visitorEmailField,
    sender,
    fromName: sender?.name ?? ownerName ?? "Site Owner",
    subject:
      settings.subject ??
      JSON.stringify(
        settings.recipientMode === "visitor"
          ? projectMeta.emailConfirmationSubject ||
              defaultEmailConfirmationSubject
          : projectMeta.emailSubject || defaultEmailSubject
      ),
    body:
      settings.body ??
      (settings.recipientMode === "visitor"
        ? JSON.stringify("")
        : JSON.stringify(projectMeta.emailBody || defaultEmailBody)),
    includeAttachments: settings.includeAttachments ?? true,
  };
};
