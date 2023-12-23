import type { Resource } from "./schema/resources";

export const loadResource = async (resourceData: Resource) => {
  const { url, method, headers, body } = resourceData;
  const requestHeaders = new Headers(
    headers.map(({ name, value }): [string, string] => [name, value])
  );
  const requestInit: RequestInit = {
    method,
    headers: requestHeaders,
  };
  if (method !== "get" && body !== undefined) {
    requestInit.body = body;
  }
  const response = await fetch(url, requestInit);
  let data;
  if (
    response.ok &&
    // accept json by default and when specified explicitly
    (requestHeaders.has("accept") === false ||
      requestHeaders.get("accept") === "application/json")
  ) {
    data = await response.json();
  } else {
    data = await response.text();
  }
  return {
    data,
    status: response.status,
    statusText: response.statusText,
  };
};
