const formHiddenFieldPrefix = "ws--form";
export const formIdFieldName = `${formHiddenFieldPrefix}-id`;

// Input data common for all handlers
export type FormInfo = {
  projectId: string;
  pageUrl: string;
  formData: FormData;
  toEmail: string;
  fromEmail: string;
  // null as serializable
  action: string | null;
  method: "get" | "post";
};

export type EmailInfo = {
  from: string;
  to: string;
  txt: string;
  /** Only the body content, requers wrapping into `<!DOCTYPE html><html><body>...</body></html>` */
  html: string;
  subject: string;
};

export type Result = { success: true } | { success: false; errors: string[] };

/** Returns form entries that should be send in email: removes `File` entries and `formId` */
export const getFormEntries = (formData: FormData): [string, string][] =>
  [...formData.entries()].flatMap(([key, value]) =>
    key.startsWith(formHiddenFieldPrefix) === false && typeof value === "string"
      ? [[key, value]]
      : []
  );

export const getFormId = (formData: FormData) => {
  for (const [key, value] of formData.entries()) {
    if (key === formIdFieldName && typeof value === "string") {
      return value;
    }
  }
};

const getDomain = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return;
  }
};

export const formToEmail = ({
  formData,
  pageUrl,
  toEmail,
  fromEmail,
}: FormInfo): EmailInfo => {
  let html = `<p>There has been a new submission of your form at <a href="${pageUrl}">${pageUrl}</a>:</p>`;
  let txt = `There has been a new submission of your form at ${pageUrl}:\n\n`;

  html += "<table><tbody>";

  for (const [key, value] of getFormEntries(formData)) {
    html += `<tr><td><strong>${key}:</strong></td><td>${value}</td></tr>`;
    txt += `${key}: ${value}\n`;
  }

  html += "</tbody></table>";

  return {
    from: fromEmail,
    to: toEmail,
    subject: `New form submission from ${getDomain(pageUrl) ?? pageUrl}`,
    txt,
    html,
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
