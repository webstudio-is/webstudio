export type EmailContent = { plainText: string; html: string };

export const formDataToEmailContent = ({
  formData,
  intro = "There has been a new submission of your form:",
  unsubscribeUrl,
}: {
  formData: FormData;
  intro?: string;
  unsubscribeUrl?: string;
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

  const unsubscribePlainText = unsubscribeUrl
    ? `\n\nTo unsubscribe, click here: ${unsubscribeUrl}`
    : "";

  const unsubscribeHtml = unsubscribeUrl
    ? `<p>To unsubscribe, click <a href="${unsubscribeUrl}">here</a>.</p>`
    : "";

  return {
    plainText: `${intro}\n\n${plainTextRows}${unsubscribePlainText}`,
    html: `<!DOCTYPE html><html><body><p>${intro}</p><table><tbody>${htmlRows}</tbody></table>${unsubscribeHtml}</body></html>`,
  };
};

export const getResponseBody = async (
  response: Response
): Promise<{ text: string; json?: Record<string, unknown> }> => {
  const text = await response.text();
  try {
    const json = JSON.parse(text);
    return typeof json === "object" && json !== null
      ? { json, text }
      : { text };
  } catch {
    return { text: text === "" ? response.statusText : text };
  }
};

export const getErrors = (
  json: Record<string, unknown> | undefined
): string[] | undefined => {
  if (json === undefined) {
    return;
  }
  if (typeof json.error === "string") {
    return [json.error];
  }
  if (typeof json.message === "string") {
    return [json.message];
  }
  if (
    Array.isArray(json.errors) &&
    json.errors.every((error) => typeof error === "string")
  ) {
    return json.errors;
  }
};
