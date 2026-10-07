import type { ProjectMeta } from "./schema/pages";
import type { EmailResourceSettings } from "./schema/resources";
import { parseEmailMailboxes, parseEmailSender } from "./email-addresses";

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
    includeAttachments:
      settings.includeAttachments ?? settings.recipientMode !== "visitor",
  };
};

export const resetEmailResourceSetting = <
  K extends keyof EmailResourceSettings,
>(
  settings: EmailResourceSettings,
  key: K
): EmailResourceSettings => {
  const { [key]: _, ...rest } = settings;
  return rest;
};
