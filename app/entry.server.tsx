import { renderToString } from "react-dom/server";
import { RemixServer, type EntryContext } from "remix";
import { insertCriticalCss } from "./critical-css";

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  let markup = renderToString(
    <RemixServer context={remixContext} url={request.url} />
  );

  markup = insertCriticalCss(markup, request.url);

  responseHeaders.set("Content-Type", "text/html");

  return new Response("<!DOCTYPE html>" + markup, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
}
