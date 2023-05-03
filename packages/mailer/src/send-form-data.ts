import {
  sendEmail,
  type SendEmailResult,
  type EmailAddress,
} from "./send-email";

const formDataToPlainText = (formData: FormData): string =>
  [...formData.entries()].map(([key, value]) => `${key}: ${value}`).join("\n");

const formDataToHTML = (formData: FormData): string => {
  const rows = [...formData.entries()]
    .map(
      ([key, value]) =>
        `<tr><td><strong>${key}</strong></td><td>${value}</td></tr>`
    )
    .join("");
  return `<table><tbody>${rows}</tbody></table>`;
};

export const sendFormData = async (
  {
    from,
    to,
    subject,
    prefix = subject,
  }: {
    from: EmailAddress;
    to: EmailAddress | [EmailAddress, ...EmailAddress[]];
    subject: string;
    prefix?: string;
  },
  data: FormData
): Promise<SendEmailResult> => {
  const plainText = `${prefix}\n\n${formDataToPlainText(data)}`;
  const html = `<!DOCTYPE html><html><body><p>${prefix}</p>${formDataToHTML(
    data
  )}</body></html>`;

  return sendEmail({
    personalizations: [{ to: Array.isArray(to) ? to : [to] }],
    from: from,
    subject: subject,
    content: [
      { type: "text/plain", value: plainText },
      { type: "text/html", value: html },
    ],
  });
};
