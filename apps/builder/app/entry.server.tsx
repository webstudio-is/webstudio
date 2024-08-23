/**
 * By default, Remix will handle generating the HTTP Response for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.server
 */

import {
  createReadableStreamFromReadable,
  type AppLoadContext,
  type EntryContext,
} from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import { flushCss } from "@webstudio-is/design-system";
import { PassThrough, Readable } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";

const ABORT_DELAY = 5_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  // This is ignored so we can keep it in the template for visibility.  Feel
  // free to delete this parameter in your app if you're not using it!
  _loadContext: AppLoadContext
) {
  return handleBrowserRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixContext
  );
}

// eslint-disable-next-line func-style
async function* injectStyle(stream: PassThrough, styleContent: string) {
  const styleTag = `<style>${styleContent}</style>`;
  let injected = false;
  let buffer = "";

  for await (const chunk of stream) {
    if (injected) {
      yield chunk;
      continue;
    }

    buffer += chunk.toString();

    if (!injected && buffer.includes("</head>")) {
      const [beforeHead, afterHead] = buffer.split("</head>");
      yield beforeHead + styleTag + "</head>";
      buffer = afterHead;
      injected = true;
      // Yield the remaining buffer
      if (buffer) {
        yield buffer;
      }
    }
  }
}

// eslint-disable-next-line func-style
function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <RemixServer
        context={remixContext}
        url={request.url}
        abortDelay={ABORT_DELAY}
      />,
      {
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();

          const transformedStream = createReadableStreamFromReadable(
            Readable.from(injectStyle(body, flushCss()))
          );

          responseHeaders.set("Content-Type", "text/html");

          resolve(
            new Response(transformedStream, {
              headers: responseHeaders,
              status: responseStatusCode,
            })
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        },
      }
    );

    setTimeout(abort, ABORT_DELAY);
  });
}
