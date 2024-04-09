import { renderToString } from "react-dom/server";
import type { EntryContext } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import { handleRequest as handleRequestBuilder } from "./shared/remix/handle-request.server";
import { isCanvas } from "./shared/router-utils";

const handleRequestCanvas = (
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) => {
  const markup = renderToString(
    <RemixServer context={remixContext} url={request.url} />
  );

  responseHeaders.set("Content-Type", "text/html");

  return new Response(`<!DOCTYPE html>${markup}`, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
};

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  let handle = handleRequestBuilder;

  // @todo canvas can be deployed as separate app
  // and separate request handler will not be necessary anymore
  if (
    remixContext.staticHandlerContext.matches.some(
      (match) => match.route.id === "routes/_index"
    ) &&
    isCanvas(request)
  ) {
    handle = handleRequestCanvas;
  }

  return handle(request, responseStatusCode, responseHeaders, remixContext);
}
