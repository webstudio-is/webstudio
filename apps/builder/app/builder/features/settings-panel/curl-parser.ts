import type { Resource } from "@webstudio-is/sdk";
import { parseArgsStringToArgv } from "string-argv";
import { parse as parseArgs } from "ultraflag";

/*

curl --request POST 'https://my-url/hello-world' \
  --header 'Authorization: Bearer ACCESS_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{ "name":"Foo" }'

*/

type Header = {
  name: string;
  value: string;
};

const getMethod = (value: string): Resource["method"] => {
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

export const parseCurl = (curl: string) => {
  const argv = parseArgsStringToArgv(curl);
  if (argv.length === 0) {
    return;
  }
  const args = parseArgs(argv, {
    alias: {
      X: ["request"],
      H: ["header"],
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
  const headers: Header[] = ((args.header as string[]) ?? []).map((header) => {
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
    url,
    method,
    headers,
    body,
  };
};
