export const privateNoStoreResponseHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
  Vary: "Cookie",
};

export const appendVaryHeader = (headers: Headers, value: string) => {
  const vary = headers.get("Vary");
  if (vary === null || vary.trim() === "") {
    headers.set("Vary", value);
    return;
  }

  const varyValues = vary.split(",").map((item) => item.trim().toLowerCase());
  if (varyValues.includes(value.toLowerCase()) === false) {
    headers.set("Vary", `${vary}, ${value}`);
  }
};

export const createPrivateNoStoreHeaders = (init?: HeadersInit) => {
  const headers = new Headers(init);

  for (const [name, value] of Object.entries(privateNoStoreResponseHeaders)) {
    if (name.toLowerCase() === "vary") {
      continue;
    }
    headers.set(name, value);
  }

  appendVaryHeader(headers, privateNoStoreResponseHeaders.Vary);

  return headers;
};
