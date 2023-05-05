import { formDataToEmailContent } from "./shared";

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

  const response = await fetch(hookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  try {
    const data = await response.json();

    if (response.status === 200 && data.success === true) {
      return { success: true };
    }

    if (typeof data.error === "string") {
      return { success: false, errors: [data.error] };
    }

    if (typeof data.message === "string") {
      return { success: false, errors: [data.message] };
    }
    // eslint-disable-next-line no-empty
  } catch {}

  return { success: false, errors: [response.statusText || "Unknown error"] };
};
