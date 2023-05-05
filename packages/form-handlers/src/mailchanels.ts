// References:
// https://api.mailchannels.net/tx/v1/documentation
// https://github.com/cloudflare/pages-plugins/tree/main/packages/mailchannels
//
// To test see `packages/form-handlers-mailchannels-test`

import { formDataToEmailContent, getErrors, getResponseBody } from "./shared";

type EmailAddress = {
  email: string;
  name?: string;
};

type Personalization = {
  to: [EmailAddress, ...EmailAddress[]];
  from?: EmailAddress;
  dkim_domain?: string;
  dkim_private_key?: string;
  dkim_selector?: string;
  reply_to?: EmailAddress;
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject?: string;
  headers?: Record<string, string>;
};

type ContentItem = {
  type: "text/plain" | "text/html";
  value: string;
};

type SendEmailPayload = {
  personalizations: [Personalization, ...Personalization[]];
  from: EmailAddress;
  reply_to?: EmailAddress;
  subject: string;
  content: [ContentItem, ...ContentItem[]];
  headers?: Record<string, string>;
};

type SendEmailResult = { success: true } | { success: false; errors: string[] };

const sendEmail = async (
  payload: SendEmailPayload
): Promise<SendEmailResult> => {
  let response: Response;
  try {
    response = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return { success: false, errors: [(error as Error).message] };
  }

  if (response.status >= 200 && response.status < 300) {
    return { success: true };
  }

  const { text, json } = await getResponseBody(response);

  return { success: false, errors: getErrors(json) ?? [text] };
};

export const mailchannelsHandler = async ({
  formData,
  recipientEmail,
  senderEmail,
}: {
  formData: FormData;
  recipientEmail: string;
  senderEmail: string;
}) => {
  const { plainText, html, subject } = formDataToEmailContent({ formData });

  return sendEmail({
    personalizations: [{ to: [{ email: recipientEmail }] }],
    from: { email: senderEmail },
    subject: subject,
    content: [
      { type: "text/plain", value: plainText },
      { type: "text/html", value: html },
    ],
  });
};
