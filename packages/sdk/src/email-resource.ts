import type { ProjectMeta } from "./schema/pages";
import type { EmailResourceSettings } from "./schema/resources";
import { parseEmailMailboxes, parseEmailSender } from "./email-addresses";

export const defaultEmailSubject = "New form submission";
export const defaultEmailBody = "A new form was submitted.";
export const defaultEmailConfirmationSubject = "We received your submission";
export const defaultEmailConfirmationBody =
  "Thank you. Your submission was received.";

export const getDefaultFormEmailBodyExpression = (
  formDataIdentifier: string,
  browserInfoIdentifier?: string,
  introduction?: string
) =>
  `\`${introduction ? `${introduction.replaceAll("\\", "\\\\").replaceAll("`", "\\`").replaceAll("${", "\\${")}\n\n` : ""}Form data:\n\${${formDataIdentifier}}` +
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
      : projectMeta.contactEmail || ownerEmail || "";
  const senderText =
    settings.sender ?? (projectMeta.emailSender || ownerEmail || "");
  const recipients = parseEmailMailboxes(recipientsText);
  const sender = parseEmailSender(senderText);
  return {
    recipientMode: settings.recipientMode ?? "project",
    recipients,
    sender,
    subject:
      settings.subject ??
      JSON.stringify(projectMeta.emailSubject || defaultEmailSubject),
    body:
      settings.body ??
      JSON.stringify(projectMeta.emailBody || defaultEmailBody),
    includeAttachments: settings.includeAttachments ?? true,
    confirmationSubject:
      projectMeta.emailConfirmationSubject || defaultEmailConfirmationSubject,
    confirmationBody:
      projectMeta.emailConfirmationBody || defaultEmailConfirmationBody,
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
