import type { EntryContext } from "@remix-run/node";
import * as Sentry from "@sentry/remix";
import { initSentry } from "./shared/sentry";
import { prisma } from "@webstudio-is/prisma-client";
import { handleRequest as handleRequestDesigner } from "./shared/remix";
import { handleRequest as handleRequestCanvas } from "@webstudio-is/react-sdk";
import { getCanvasRequestParams } from "./routes/$";

initSentry({
  integrations: [new Sentry.Integrations.Prisma({ client: prisma })],
});

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  let handle = handleRequestDesigner;

  if (getCanvasRequestParams(request) !== undefined) {
    handle = handleRequestCanvas;
  }

  return handle(request, responseStatusCode, responseHeaders, remixContext);
}
