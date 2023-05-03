// References:
// https://api.mailchannels.net/tx/v1/documentation
// https://github.com/cloudflare/pages-plugins/tree/main/packages/mailchannels

export type EmailAddress = {
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

export type SendEmailPayload = {
  personalizations: [Personalization, ...Personalization[]];
  from: EmailAddress;
  reply_to?: EmailAddress;
  subject: string;
  content: [ContentItem, ...ContentItem[]];
  headers?: Record<string, string>;
};

export type SendEmailResult =
  | { success: true }
  | { success: false; errors: string[] };

export const sendEmail = async (
  payload: SendEmailPayload
): Promise<SendEmailResult> => {
  const response = await fetch("https://api.mailchannels.net/tx/v1/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (response.status === 202) {
    return { success: true };
  }

  try {
    const { errors } = await response.json();
    return { success: false, errors };
  } catch {
    return { success: false, errors: [response.statusText] };
  }
};
