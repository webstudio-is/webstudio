import {
  type FormInfo,
  type Result,
  formToEmail,
  getFormEntries,
  getErrors,
  getResponseBody,
  getFormId,
} from "./shared";

const getAuth = (hookUrl: string) => {
  const url = new URL(hookUrl);
  const { username, password } = url;
  url.username = "";
  url.password = "";
  const urlWithoutAuth = url.toString();
  return {
    username,
    password,
    urlWithoutAuth,
  };
};

export const n8nHandler = async ({
  formInfo,
  hookUrl,
}: {
  formInfo: FormInfo;
  /** May containt basic authentication credentials,
   * e.g. https://user:pass@...app.n8n.cloud/webhook/... */
  hookUrl: string;
}): Promise<Result> => {
  const headers: HeadersInit = { "Content-Type": "application/json" };

  const { username, password, urlWithoutAuth } = getAuth(hookUrl);

  if (username !== "" && password !== "") {
    // using btoa() instead of Buffer.from().toString("base64")
    // because Buffer is not available in Cloudflare workers
    headers["Authorization"] = `Basic ${btoa([username, password].join(":"))}`;
  }

  const formId = getFormId(formInfo.formData);

  if (formId === undefined) {
    return { success: false, errors: ["No form id in FormData"] };
  }

  const payload = {
    email: formToEmail(formInfo),
    // globally unique form id (can be used for unsubscribing)
    formId: [formInfo.projectId, formId].join("--"),
    formData: Object.fromEntries(getFormEntries(formInfo.formData)),
  };

  let response: Response;
  try {
    response = await fetch(urlWithoutAuth, {
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
