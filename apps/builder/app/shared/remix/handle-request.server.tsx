import { renderToString } from "react-dom/server";
import { RemixServer } from "@remix-run/react";
import type { EntryContext } from "@remix-run/node";
import { insertCriticalCss } from "./insert-critical-css";

export const handleRequest = (
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) => {
  const markup = renderToString(
    <RemixServer context={remixContext} url={request.url} />
  );

  responseHeaders.set("Content-Type", "text/html");
  responseHeaders.set("Accept-CH", "Sec-CH-Prefers-Color-Scheme");

  return new Response("<!DOCTYPE html>" + insertCriticalCss(markup), {
    status: responseStatusCode,
    headers: responseHeaders,
  });
};
