export type EmailContent = {
  plainText: string;
  html: string;
  subject: string;
};

export const formDataToEmailContent = ({
  formData,
  prefix = "There has been a new submission of your form:",
  subject = "New form submission",
}: {
  formData: FormData;
  prefix?: string;
  subject?: string;
}): EmailContent => {
  const entries = [...formData.entries()];

  const htmlRows = entries
    .map(
      ([key, value]) =>
        `<tr><td><strong>${key}:</strong></td><td>${value}</td></tr>`
    )
    .join("");

  const plainTextRows = entries
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  return {
    subject,
    plainText: `${prefix}\n\n${plainTextRows}`,
    html: `<!DOCTYPE html><html><body><p>${prefix}</p><table><tbody>${htmlRows}</tbody></table></body></html>`,
  };
};
