import { generateExpression } from "./expression";
import { resolveEmailResourceSettings } from "./email-resource";
import type { DataSources } from "./schema/data-sources";
import type { ProjectMeta } from "./schema/pages";
import type { Resource } from "./schema/resources";
import type { Scope } from "./scope";

/** Emit only Email delivery fields; HTTP request fields stay in the Resource generator. */
export const generateEmailRequestFields = ({
  resource,
  indent,
  dataSources,
  usedDataSources,
  scope,
  emailBodyCode,
  resolvedEmailSettings,
  projectMeta,
  ownerEmail,
}: {
  resource: Resource;
  indent: string;
  dataSources: DataSources;
  usedDataSources: DataSources;
  scope: Scope;
  emailBodyCode?: string;
  resolvedEmailSettings?: ReturnType<typeof resolveEmailResourceSettings>;
  projectMeta?: ProjectMeta;
  ownerEmail?: string;
}) => {
  const email = resource.email ?? {};
  const resolved =
    resolvedEmailSettings ??
    resolveEmailResourceSettings({ settings: email, projectMeta, ownerEmail });
  let generated = `${indent}email: {\n`;
  generated += `${indent}  recipientMode: ${JSON.stringify(resolved.recipientMode)},\n`;
  if (resolved.visitorEmailField !== undefined) {
    generated += `${indent}  visitorEmailField: ${JSON.stringify(resolved.visitorEmailField)},\n`;
  }
  if (email.recipientsExpression !== undefined) {
    const recipients = generateExpression({
      expression: email.recipientsExpression,
      dataSources,
      usedDataSources,
      scope,
    });
    generated += `${indent}  recipients: resolveEmailRecipientsExpression(${recipients}),\n`;
  } else {
    generated += `${indent}  recipients: ${JSON.stringify(resolved.recipients ?? [])},\n`;
  }
  if (email.senderExpression !== undefined) {
    const sender = generateExpression({
      expression: email.senderExpression,
      dataSources,
      usedDataSources,
      scope,
    });
    generated += `${indent}  ...resolveEmailSenderSettingsExpression(${sender}, ${JSON.stringify(resolved.fromName)}),\n`;
  } else if (resolved.sender) {
    generated += `${indent}  sender: ${JSON.stringify(resolved.sender)},\n`;
    if (resolved.fromName) {
      generated += `${indent}  fromName: ${JSON.stringify(resolved.fromName)},\n`;
    }
  } else if (resolved.fromName) {
    generated += `${indent}  fromName: ${JSON.stringify(resolved.fromName)},\n`;
  }
  generated += `${indent}  includeAttachments: ${resolved.includeAttachments},\n`;
  const subject = generateExpression({
    expression: resolved.subject,
    dataSources,
    usedDataSources,
    scope,
  });
  generated += `${indent}  subject: ${subject},\n`;
  if (email.body !== undefined) {
    const body = generateExpression({
      expression: email.body,
      dataSources,
      usedDataSources,
      scope,
    });
    generated += `${indent}  body: ${body},\n`;
  } else if (emailBodyCode !== undefined) {
    generated += `${indent}  body: ${emailBodyCode},\n`;
  } else {
    const body = generateExpression({
      expression: resolved.body,
      dataSources,
      usedDataSources,
      scope,
    });
    generated += `${indent}  body: ${body},\n`;
  }
  return `${generated}${indent}},\n`;
};
