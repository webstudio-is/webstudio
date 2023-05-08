import {
  type FormInfo,
  type Result,
  formToEmail,
  getFormEntries,
  getErrors,
  getResponseBody,
  getFormId,
} from "./shared";

export const n8nHandler = async ({
  formInto,
  senderDomain,
  hookUrl,
  authentication,
}: {
  formInto: FormInfo;
  senderDomain?: string;
  hookUrl: string;
  // @todo: add support for other authentication types
  authentication?: { type: "basic"; username: string; password: string };
}): Promise<Result> => {
  const headers: HeadersInit = { "Content-Type": "application/json" };

  if (authentication?.type === "basic") {
    headers["Authorization"] = `Basic ${Buffer.from(
      `${authentication.username}:${authentication.password}`
    ).toString("base64")}`;
  }

  const formId = getFormId(formInto.formData);

  if (formId === undefined) {
    return { success: false, errors: ["No form id in FormData"] };
  }

  const payload = {
    email: formToEmail(formInto, senderDomain),
    // globally unique form id (can be used for unsubscribing)
    formId: [formInto.projectId, formId].join("--"),
    formData: Object.fromEntries(getFormEntries(formInto.formData)),
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
    // It's difficult to control status code at n8n side.
    // Data is easier to control, so we use data to determine success.
    json?.success === true
  ) {
    return { success: true };
  }

  return { success: false, errors: getErrors(json) ?? [text] };
};
