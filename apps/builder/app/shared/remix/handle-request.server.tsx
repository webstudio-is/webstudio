import { renderToString } from "react-dom/server";
import { RemixServer } from "@remix-run/react";
import type { EntryContext } from "@remix-run/node";
import { flushCss } from "@webstudio-is/design-system";
import { renderHeadToString } from "remix-island";
import { Head } from "./root";
import { links } from "~/routes/vercel-deploy-workaround";

export const handleRequest = (
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) => {
  const markup = renderToString(
    <RemixServer context={remixContext} url={request.url} />
  );

  const head = renderHeadToString({ request, remixContext, Head });

  responseHeaders.set("Content-Type", "text/html");
  responseHeaders.set("Accept-CH", "Sec-CH-Prefers-Color-Scheme");

  // data-builder="true" to distinguish between builder and canvas at the entry.client.tsx
  // inject fonts and base body styles here instead of `export links = ` to avoid FOUC
  const body = `
    <!DOCTYPE html>
    <html lang="en" data-builder="true">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        ${links()
          .map((link) =>
            "href" in link
              ? `<link rel="${link.rel}" href="${link.href}" />`
              : ""
          )
          .join("\n")}
        ${head}
        <style id="stitches">${flushCss()}</style>
      </head>
      <body>
        <div id="root">${markup}</div>
      </body>
    </html>
  `;

  return new Response(body, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
};
