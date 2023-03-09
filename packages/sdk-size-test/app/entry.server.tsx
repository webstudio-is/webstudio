import type { EntryContext } from "@remix-run/node";
import { handleRequest as handleRequestRemix } from "@webstudio-is/react-sdk";

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  return handleRequestRemix(
    request,
    responseStatusCode,
    responseHeaders,
    remixContext
  );
}
