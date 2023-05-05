import { formDataToEmailContent, getErrors, getResponseBody } from "./shared";

export const n8nHandler = async ({
  formData,
  recipientEmail,
  senderEmail,
  hookUrl,
  authentication,
}: {
  formData: FormData;
  recipientEmail: string;
  senderEmail: string;
  hookUrl: string;
  // @todo: add support for other authentication types
  authentication?: { type: "basic"; username: string; password: string };
}) => {
  const { plainText, html, subject } = formDataToEmailContent({ formData });

  const headers: HeadersInit = { "Content-Type": "application/json" };

  if (authentication?.type === "basic") {
    headers["Authorization"] = `Basic ${Buffer.from(
      `${authentication.username}:${authentication.password}`
    ).toString("base64")}`;
  }

  const payload = {
    email: {
      to: recipientEmail,
      from: senderEmail,
      subject,
      plainText,
      html,
    },
    formData: Object.fromEntries(formData),
  };

  let response: Response;
  try {
    response = await fetch(hookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return { success: false, errors: [(error as Error).message] };
  }

  const { text, json } = await getResponseBody(response);

  if (
    response.status >= 200 &&
    response.status < 300 &&
    json?.success === true
  ) {
    return { success: true };
  }

  return { success: false, errors: getErrors(json) ?? [text] };
};
