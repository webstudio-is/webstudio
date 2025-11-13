import { tokenizeArgs } from "args-tokenizer";
import { parse as parseArgs } from "@bomb.sh/args";
import type { ResourceRequest } from "@webstudio-is/sdk";
import { serializeValue } from "@webstudio-is/sdk/runtime";

/*

curl --request POST 'https://my-url/hello-world' \
  --header 'Authorization: Bearer ACCESS_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{ "name":"Foo" }'

*/

const getMethod = (value: string): ResourceRequest["method"] => {
  switch (value.toLowerCase()) {
    case "post":
      return "post";
    case "put":
      return "put";
    case "delete":
      return "delete";
    default:
      return "get";
  }
};

export type CurlRequest = Pick<
  ResourceRequest,
  "url" | "searchParams" | "method" | "headers" | "body"
>;

const encodeSearchParams = (data: string[]) => {
  return data
    .map((item) => {
      if (item.includes("=")) {
        const [key, value] = item.split("=");
        return `${key}=${encodeURIComponent(value)}`;
      }
      return item;
    })
    .join("&");
};

export const parseCurl = (curl: string): undefined | CurlRequest => {
  const argv = tokenizeArgs(curl, { loose: true });
  if (argv.length === 0) {
    return;
  }
  const args = parseArgs(argv, {
    alias: {
      X: ["request"],
      G: ["get"],
      H: ["header"],
      d: ["data"],
      "data-ascii": ["data"],
      "data-raw": ["data"],
      "data-urlencode": ["data"],
      u: ["user"],
    },
    boolean: ["get", "G"],
    string: [
      "request",
      "X",
      "data",
      "d",
      "data-ascii",
      "data-raw",
      "data-urlencode",
      "user",
      "u",
    ],
    array: [
      "header",
      "H",
      "data",
      "d",
      "data-ascii",
      "data-raw",
      "data-urlencode",
    ],
  });
  // require at least 2 parameters and first is curl command
  if (args._.length < 2 || args._[0] !== "curl") {
    return;
  }
  // curl url
  const url = new URL(args._[1].toString());
  const defaultMethod = args.data ? "post" : "get";
  const method: CurlRequest["method"] = args.get
    ? "get"
    : getMethod(args.request ?? defaultMethod);
  let contentType: undefined | string;
  const searchParams: NonNullable<ResourceRequest["searchParams"]> = [];
  for (const [name, value] of url.searchParams) {
    searchParams.push({ name, value });
  }
  // remove all search params from url
  url.search = "";
  const headers: ResourceRequest["headers"] = (
    (args.header as string[]) ?? []
  ).map((header) => {
    // in case of invalid header fallback value to empty string
    const [name, value = ""] = header.trim().split(/\s*:\s*/);
    if (name.toLowerCase() === "content-type") {
      contentType = value;
    }
    return { name, value };
  });
  if (args.user) {
    headers.push({ name: "Authorization", value: `Basic ${btoa(args.user)}` });
  }
  let body: undefined | unknown;
  if (args.get && args.data) {
    for (const pair of args.data) {
      const [name, value = ""] = pair.split("=");
      searchParams.push({ name, value });
    }
  } else if (args.data) {
    body = args.data[0];
    if (contentType === "application/json") {
      try {
        body = JSON.parse(args.data[0]);
      } catch {
        // empty block
      }
    }
    if (contentType === undefined) {
      contentType = "application/x-www-form-urlencoded";
      headers.push({ name: "content-type", value: contentType });
    }
    if (contentType === "application/x-www-form-urlencoded") {
      body = encodeSearchParams(args.data);
    }
  }
  return {
    url: url.toString(),
    searchParams,
    method,
    headers,
    body,
  };
};

export const generateCurl = (request: CurlRequest) => {
  const url = new URL(request.url);
  for (const { name, value } of request.searchParams) {
    url.searchParams.append(name, serializeValue(value));
  }
  const args = [`curl ${JSON.stringify(url)}`, `--request ${request.method}`];
  for (const header of request.headers) {
    args.push(
      // escape json in headers
      `--header "${header.name}: ${serializeValue(header.value).replaceAll('"', '\\"')}"`
    );
  }
  if (request.body) {
    let body = request.body;
    // double serialize json
    if (typeof request.body !== "string") {
      body = JSON.stringify(body);
    }
    args.push(`--data ${JSON.stringify(body)}`);
  }
  return args.join(" \\\n  ");
};
