// References:
// https://api.mailchannels.net/tx/v1/documentation
// https://github.com/cloudflare/pages-plugins/tree/main/packages/mailchannels
//
// To test see `packages/form-handlers-mailchannels-test`

import {
  type FormInfo,
  type Result,
  formToEmail,
  getErrors,
  getResponseBody,
} from "./shared";

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

const sendEmail = async (payload: SendEmailPayload): Promise<Result> => {
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
  formInfo,
}: {
  formInfo: FormInfo;
}) => {
  const email = formToEmail(formInfo);

  return sendEmail({
    personalizations: [{ to: [{ email: email.to }] }],
    from: { email: email.from },
    subject: email.subject,
    content: [
      { type: "text/plain", value: email.txt },
      {
        type: "text/html",
        value: `<!DOCTYPE html><html><body>${email.html}</body></html>`,
      },
    ],
  });
};
