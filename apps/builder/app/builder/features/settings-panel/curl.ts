import type { ResourceRequest } from "@webstudio-is/sdk";
import arrgv from "arrgv";
import { parse as parseArgs } from "ultraflag";

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
  "url" | "method" | "headers" | "body"
>;

export const parseCurl = (curl: string): undefined | CurlRequest => {
  // remove backslash followed by newline
  // https://github.com/astur/arrgv/issues/3
  curl = curl.replaceAll(/\\(?=\s)/g, "");
  let argv;
  try {
    argv = arrgv(curl);
  } catch {
    return;
  }
  if (argv.length === 0) {
    return;
  }
  const args = parseArgs(argv, {
    alias: {
      X: ["request"],
      H: ["header"],
      d: ["data"],
    },
    string: ["request", "data"],
    array: ["header", "H"],
  });
  // require at least 2 parameters and first is curl command
  if (args._.length < 2 || args._[0] !== "curl") {
    return;
  }
  const [_curl, url] = args._;
  const defaultMethod = args.data ? "post" : "get";
  const method = getMethod(args.request ?? defaultMethod);
  let contentType: undefined | string;
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
  let body: undefined | unknown = args.data;
  if (args.data && contentType === "application/json") {
    try {
      body = JSON.parse(args.data);
    } catch {
      // empty block
    }
  }
  return {
    url: url as string,
    method,
    headers,
    body,
  };
};

export const generateCurl = (request: CurlRequest) => {
  const args = [
    `curl ${JSON.stringify(request.url)}`,
    `--request ${request.method}`,
  ];
  for (const header of request.headers) {
    args.push(`--header "${header.name}: ${header.value}"`);
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
