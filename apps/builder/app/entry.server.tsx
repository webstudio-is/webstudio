import type { EntryContext } from "@remix-run/node";
import * as Sentry from "@sentry/remix";
import { initSentry } from "./shared/sentry";
import { prisma } from "@webstudio-is/prisma-client";
import { handleRequest as handleRequestBuilder } from "./shared/remix";
import { handleRequest as handleRequestCanvas } from "@webstudio-is/react-sdk";
import { getBuildParams } from "./shared/router-utils";

initSentry({
  integrations: [new Sentry.Integrations.Prisma({ client: prisma })],
});

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  let handle = handleRequestBuilder;

  if (
    remixContext.staticHandlerContext.matches.some(
      (match) =>
        match.route.id === "routes/$" || match.route.id === "routes/index"
    ) &&
    getBuildParams(request) !== undefined
  ) {
    handle = handleRequestCanvas;
  }

  return handle(request, responseStatusCode, responseHeaders, remixContext);
}
